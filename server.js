
require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const API_TOKEN = process.env.FOOTBALL_DATA_API_KEY;
const API_BASE = "https://api.football-data.org/v4";

if (!API_TOKEN) {
  console.error("ERROR: FOOTBALL_DATA_API_KEY is missing in .env");
  process.exit(1);
}

app.use(express.json());

// فایل‌های سایت از همین پوشه اصلی ارائه می‌شوند.
app.use(express.static(__dirname, {
  dotfiles: "ignore",
  index: "index.html"
}));

// شناسه لیگ‌های سایت به شناسه‌های football-data.org
const LEAGUES = {
  en: "PL",
  de: "BL1",
  fr: "FL1",
  es: "PD",
  it: "SA",
  ucl: "CL"
};

// کش کوتاه برای جلوگیری از مصرف بی‌رویه درخواست‌های API
const cache = new Map();
const CACHE_TTL = 15000;

async function footballRequest(endpoint) {
  const url = `${API_BASE}${endpoint}`;
  const cached = cache.get(url);

  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;
  }

  const response = await fetch(url, {
    headers: {
      "X-Auth-Token": API_TOKEN,
      "Accept": "application/json"
    },
    signal: AbortSignal.timeout(15000)
  });

  const text = await response.text();

  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("پاسخ نامعتبر از سرویس فوتبال دریافت شد.");
  }

  if (!response.ok) {
    const error = new Error(
      data.message || `Football API error: ${response.status}`
    );
    error.status = response.status;
    throw error;
  }

  cache.set(url, {
    time: Date.now(),
    data
  });

  return data;
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

function getStatus(status) {
  if (["IN_PLAY", "PAUSED", "LIVE", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(status)) {
    return "LIVE";
  }

  if (status === "FINISHED") {
    return "FT";
  }

  return "NS";
}

function formatTime(utcDate) {
  if (!utcDate) return "";

  return new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tehran"
  }).format(new Date(utcDate));
}

function transformMatch(match) {
  const code = match.competition?.code || "";

  const score = match.score?.fullTime || {};

  return {
    id: String(match.id),
    league: Object.keys(LEAGUES).find(
      key => LEAGUES[key] === code
    ) || code.toLowerCase(),

    home: match.homeTeam?.shortName ||
          match.homeTeam?.name || "میزبان",

    away: match.awayTeam?.shortName ||
          match.awayTeam?.name || "میهمان",

    hs: score.home ?? null,
    as: score.away ?? null,

    status: getStatus(match.status),

    minute: match.minute ?? null,

    time: formatTime(match.utcDate),

    date: match.utcDate,
    competition: match.competition?.name || "",
    homeCrest: match.homeTeam?.crest || null,
    awayCrest: match.awayTeam?.crest || null,
    venue: match.venue || null
  };
}

// وضعیت اتصال
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    server: "online",
    provider: "football-data.org",
    tokenConfigured: Boolean(API_TOKEN),
    availableLeagues: Object.keys(LEAGUES),
    time: new Date().toISOString()
  });
});

// مسابقات یک روز
// نمونه: /api/matches?date=2026-11-07
app.get("/api/matches", async (req, res, next) => {
  try {
    const date = req.query.date ||
      new Date().toISOString().slice(0, 10);

    if (!validDate(date)) {
      return res.status(400).json({
        error: "فرمت تاریخ باید YYYY-MM-DD باشد."
      });
    }

    const data = await footballRequest(
      `/matches?date=${encodeURIComponent(date)}`
    );

    const matches = (data.matches || [])
  .map(transformMatch)
  .filter(match => Object.prototype.hasOwnProperty.call(LEAGUES, match.league));

    res.json(matches);
  } catch (error) {
    next(error);
  }
});

// جدول لیگ
// نمونه: /api/standings?league=en
app.get("/api/standings", async (req, res, next) => {
  try {
    const league = String(req.query.league || "").toLowerCase();
    const code = LEAGUES[league];

    if (!code) {
      return res.status(400).json({
        error: "این لیگ در نگاشت فعلی سرور تعریف نشده است.",
        availableLeagues: Object.keys(LEAGUES)
      });
    }

    const data = await footballRequest(
      `/competitions/${code}/standings`
    );

    const table = data.standings?.find(
      item => item.type === "TOTAL"
    )?.table || [];

    res.json(table.map(row => ({
      position: row.position,
      team: row.team?.shortName ||
            row.team?.name || "",
      crest: row.team?.crest || null,
      p: row.playedGames ?? 0,
      w: row.won ?? 0,
      d: row.draw ?? 0,
      l: row.lost ?? 0,
      gf: row.goalsFor ?? 0,
      ga: row.goalsAgainst ?? 0,
      pts: row.points ?? 0
    })));
  } catch (error) {
    next(error);
  }
});

// گلزنان برتر
// نمونه: /api/scorers?league=en
app.get("/api/scorers", async (req, res, next) => {
  try {
    const league = String(req.query.league || "").toLowerCase();
    const code = LEAGUES[league];

    if (!code) {
      return res.status(400).json({
        error: "شناسه لیگ معتبر نیست."
      });
    }

    const data = await footballRequest(
      `/competitions/${code}/scorers`
    );

    res.json((data.scorers || []).map((item, index) => ({
      rank: index + 1,
      player: item.player?.name || "",
      team: item.team?.shortName ||
            item.team?.name || "",
      goals: item.goals ?? 0,
      assists: item.assists ?? 0,
      penalties: item.penalties ?? 0
    })));
  } catch (error) {
    next(error);
  }
});

// تیم‌های یک لیگ
app.get("/api/teams", async (req, res, next) => {
  try {
    const league = String(req.query.league || "").toLowerCase();
    const code = LEAGUES[league];

    if (!code) {
      return res.status(400).json({
        error: "شناسه لیگ معتبر نیست."
      });
    }

    const data = await footballRequest(
      `/competitions/${code}/teams`
    );

    res.json((data.teams || []).map(team => ({
      id: team.id,
      name: team.name,
      shortName: team.shortName,
      crest: team.crest,
      venue: team.venue
    })));
  } catch (error) {
    next(error);
  }
});

// اطلاعات یک مسابقه
app.get("/api/match", async (req, res, next) => {
  try {
    const id = String(req.query.id || "");

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        error: "شناسه مسابقه معتبر نیست."
      });
    }

    const data = await footballRequest(`/matches/${id}`);

    res.json(transformMatch(data));
  } catch (error) {
    next(error);
  }
});

// مدیریت خطاها
app.use((error, req, res, next) => {
  console.error("API Error:", error.message);

  const status = error.status || 502;

  res.status(status).json({
    error: "دریافت اطلاعات از سرویس فوتبال ناموفق بود.",
    message: error.message
  });
});

app.listen(PORT, () => {
  console.log("--------------------------------");
  console.log("Football website server started");
  console.log(`Website: http://localhost:${PORT}`);
  console.log(`API:     http://localhost:${PORT}/api`);
  console.log("--------------------------------");
});
