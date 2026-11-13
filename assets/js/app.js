(() => {
  'use strict';

  const { CONFIG, LEAGUES, api } = window.FS;
  const $ = s => document.querySelector(s);

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);

  const ALLOWED_CREST_HOSTS = new Set([
    'crests.football-data.org',
    'media.api-sports.io'
  ]);

  const st = {
    off: 0,
    view: 'matches',
    league: 'all',
    liveOnly: false,
    data: [],
    fixtures: [],            // FIX #1: بازی‌های آینده
    showingFixtures: false,  // FIX #1: آیا الان fixtures نشان می‌دهیم؟
    prev: new Map(),
    timer: null,
    fixtureWatcher: null,    // FIX #1: تایمر تبدیل خودکار
    requestId: 0,
    tableRequestId: 0
  };

  const tableCache = new Map();
  const TABLE_TTL_MS = 5 * 60 * 1000;

  function safeCrest(url) {
    if (typeof url !== 'string' || !url) return '';
    try {
      const u = new URL(url, location.origin);
      if (u.protocol !== 'https:') return '';
      if (!ALLOWED_CREST_HOSTS.has(u.hostname)) return '';
      return u.href;
    } catch { return ''; }
  }

  function leagueIcon(league) {
    if (!league?.logo) return esc(league?.flag || '');
    return `<img src="${esc(league.logo)}" class="league-logo" alt="" loading="lazy">`;
  }

  function renderChips() {
    const items = [{ id: 'all', name: 'همه لیگ‌ها' }, ...LEAGUES];
    $('#chips').innerHTML = items.map(l => `
      <button class="chip ${st.league === l.id ? 'active' : ''}" data-id="${esc(l.id)}" type="button">
        ${l.id === 'all' ? '' : leagueIcon(l)}
        ${esc(l.name)}
      </button>
    `).join('');
  }

  function updateChipsActive() {
    document.querySelectorAll('#chips .chip').forEach(b =>
      b.classList.toggle('active', b.dataset.id === st.league));
  }

  function matchStatus(m) {
    if (m.status === 'LIVE') {
      return `<span class="stat live">${m.minute != null ? `${esc(m.minute)}'` : 'زنده'}</span>`;
    }
    if (m.status === 'FT') return '<span class="stat">پایان مسابقه</span>';
    return `<span class="stat">${esc(m.time || 'به‌زودی')}</span>`;
  }

  function teamCrest(url, name) {
    const safe = safeCrest(url);
    if (!safe) return '';
    return `<img class="team-logo" src="${esc(safe)}" alt="${esc(name)}" loading="lazy">`;
  }

  // FIX #2: شمارش معکوس تا شروع بازی
  function countdownText(iso) {
    if (!iso) return '';
    const diff = new Date(iso).getTime() - Date.now();
    if (diff <= 0) return 'در حال شروع...';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d} روز و ${h % 24} ساعت`;
    if (h > 0) return `${h} ساعت و ${m} دقیقه`;
    return `${m} دقیقه`;
  }

  function renderMatch(m) {
    const score = m.status === 'NS' ? '-' : `${m.hs ?? 0} : ${m.as ?? 0}`;
    const key = `${m.hs}-${m.as}`;
    const flash = st.prev.has(m.id) && st.prev.get(m.id) !== key ? ' flash' : '';
    st.prev.set(m.id, key);

    // FIX #2: برای fixture، شمارش معکوس
    const countdown = m._isFixture && m.kickoff
      ? `<div class="countdown">شروع تا ${countdownText(m.kickoff)}</div>` : '';

    return `
      <div class="match${flash}${m._isFixture ? ' fixture' : ''}">
        ${matchStatus(m)}
        <div class="team">${teamCrest(m.homeCrest, m.home)}<span>${esc(m.home)}</span></div>
        <div class="score" ${m.status === 'NS' ? 'aria-label="بازی شروع نشده"' : ''}>${score}</div>
        <div class="team away">${teamCrest(m.awayCrest, m.away)}<span>${esc(m.away)}</span></div>
        ${countdown}
      </div>
    `;
  }

  function prunePrev() {
    const ids = new Set([...st.data, ...st.fixtures].map(m => m.id));
    for (const id of st.prev.keys()) if (!ids.has(id)) st.prev.delete(id);
  }

  // FIX #3: renderMatches با پشتیبانی از fixtures
  function renderMatches() {
    const source = st.showingFixtures ? st.fixtures : st.data;
    const matches = source.filter(m => {
      const okL = st.league === 'all' || m.league === st.league;
      const okS = !st.liveOnly || m.status === 'LIVE';
      return okL && okS;
    });

    if (!matches.length && !st.showingFixtures && st.off === 0) {
      loadFixtures();
      return;
    }

    // FIX #3: هدر برای حالت fixtures
    const header = st.showingFixtures
      ? `<div class="fixtures-notice">
           <strong>برنامه بازی‌های آینده</strong>
           <span>هنوز بازی‌ای برای امروز شروع نشده. بازی‌های هفته‌های آینده را ببین.</span>
         </div>` : '';

    const html = header + LEAGUES.map(l => {
      const lm = matches.filter(m => m.league === l.id);
      if (!lm.length) return '';
      return `<section class="league">
        <div class="league-h">${leagueIcon(l)} ${esc(l.name)}</div>
        ${lm.map(renderMatch).join('')}
      </section>`;
    }).join('');

    $('#matches').innerHTML = html ||
      '<div class="empty-state">مسابقه‌ای برای نمایش وجود ندارد.</div>';

    // FIX #4: اعلام تعداد زنده‌ها به صفحه‌خوان
    const liveCount = matches.filter(m => m.status === 'LIVE').length;
    const ann = $('#liveAnnouncer');
    if (ann) ann.textContent = liveCount ? `${liveCount} مسابقه زنده` : '';

    prunePrev();
  }

  function updateDateLabel() {
    const d = new Date();
    d.setDate(d.getDate() + st.off);
    const label = st.off === 0 ? 'امروز'
      : st.off === -1 ? 'دیروز'
      : st.off === 1 ? 'فردا'
      : d.toLocaleDateString('fa-IR', { month: 'long', day: 'numeric' });
    $('#dateLabel').textContent = label;
  }

  // FIX #5: renderTable با hasTable، TTL، caption، log خطا
  async function renderTable() {
    const league = LEAGUES.find(l => l.id === st.league) || LEAGUES[0];
    if (!league) return;

    if (!league.hasTable) {
      $('#standingsContent').innerHTML =
        '<div class="empty-state">جدول این لیگ در دسترس نیست.</div>';
      return;
    }

    const rid = ++st.tableRequestId;
    $('#standingsContent').innerHTML = '<div class="skel"></div>'.repeat(3);

    try {
      let entry = tableCache.get(league.id);
      if (!entry || Date.now() - entry.ts > TABLE_TTL_MS) {
        const rows = await api.getStandings(league.id);
        entry = { rows, ts: Date.now() };
        tableCache.set(league.id, entry);
      }

      if (rid !== st.tableRequestId) return;
      const rows = entry.rows;

      if (!Array.isArray(rows) || !rows.length) {
        $('#standingsContent').innerHTML =
          '<div class="empty-state">جدول این لیگ در دسترس نیست.</div>';
        return;
      }

      const html = rows.map((t, i) => `<tr>
        <td>${i + 1}</td>
        <td>${esc(t.team)}</td>
        <td>${esc(t.p)}</td>
        <td>${esc(t.w)}</td>
        <td>${esc(t.d)}</td>
        <td>${esc(t.l)}</td>
        <td dir="ltr">${Number(t.gf || 0) - Number(t.ga || 0)}</td>
        <td>${esc(t.pts)}</td>
      </tr>`).join('');

      $('#standingsContent').innerHTML = `<div class="tbl">
        <div class="league-h">${leagueIcon(league)} ${esc(league.name)}</div>
        <table class="table">
          <caption class="visually-hidden">جدول رده‌بندی ${esc(league.name)}</caption>
          <thead><tr>
            <th>#</th><th>تیم</th><th>بازی</th><th>برد</th>
            <th>مساوی</th><th>باخت</th><th>تفاضل</th><th>امتیاز</th>
          </tr></thead>
          <tbody>${html}</tbody>
        </table>
      </div>`;
    } catch (e) {
      if (rid !== st.tableRequestId) return;
      console.error('[FS] renderTable:', e);
      $('#standingsContent').innerHTML =
        '<div class="empty-state">دریافت جدول ممکن نشد. دوباره تلاش کنید.</div>';
    }
  }

  // FIX #6: setView با hasTable و aria-current
  function setView(view) {
    st.view = view;

    if (view === 'table') {
      const tl = LEAGUES.filter(l => l.hasTable);
      if (!tl.some(l => l.id === st.league)) st.league = tl[0]?.id || 'en';
    }

    document.querySelectorAll('[data-view]').forEach(a => {
      const on = a.dataset.view === view;
      a.classList.toggle('active', on);
      on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
    });

    $('#matches-section').hidden = view !== 'matches';
    $('#standings').hidden = view !== 'table';
    $('#liveOnly').disabled = view !== 'matches';

    if (view === 'matches') renderMatches();
    else renderTable();

    updateChipsActive();
  }

  // FIX #7: loadFixtures — بارگذاری بازی‌های آینده
  async function loadFixtures() {
    try {
      const fx = await api.getFixtures();
      st.fixtures = Array.isArray(fx) ? fx : [];
      st.showingFixtures = true;
      renderMatches();
      startFixtureWatcher();  // FIX #8: شروع تایمر تبدیل خودکار
    } catch (e) {
      console.error('[FS] loadFixtures:', e);
      st.showingFixtures = true;
      st.fixtures = [];
      renderMatches();
    }
  }

  // FIX #8: تایمر چک کردن شروع بازی‌ها (هر ۳۰ ثانیه)
  function startFixtureWatcher() {
    if (st.fixtureWatcher) return;
    st.fixtureWatcher = setInterval(() => {
      if (!st.showingFixtures) return;
      const now = Date.now();
      const starting = st.fixtures.some(f => {
        if (!f.kickoff) return false;
        const k = new Date(f.kickoff).getTime();
        return now >= k && now < k + 5 * 60 * 1000;
      });
      if (starting) {
        console.log('[FS] kickoff reached, reloading as live');
        st.showingFixtures = false;
        stopFixtureWatcher();
        loadMatches(true);
      }
    }, 30000);
  }

  function stopFixtureWatcher() {
    if (st.fixtureWatcher) {
      clearInterval(st.fixtureWatcher);
      st.fixtureWatcher = null;
    }
  }

  // FIX #9: loadMatches با منطق fixtures + log خطا
  async function loadMatches(showLoading = false) {
    clearTimeout(st.timer);
    const rid = ++st.requestId;

    if (showLoading) {
      $('#matches').setAttribute('aria-busy', 'true');
      $('#matches').innerHTML = '<div class="skel"></div>'.repeat(4);
    }

    try {
      const data = await api.getMatches(st.off);
      if (rid !== st.requestId) return;

      st.data = Array.isArray(data) ? data : [];

      // FIX #9: اگر امروز بازی نیست، fixtures بگیر
      if (st.off === 0 && st.data.length === 0) {
        await loadFixtures();
        return;
      }

      st.showingFixtures = false;
      stopFixtureWatcher();
      renderMatches();
      $('#matches').setAttribute('aria-busy', 'false');

      $('#updated').textContent =
        'آخرین بروزرسانی: ' + new Date().toLocaleTimeString('fa-IR');
    } catch (e) {
      if (rid !== st.requestId) return;
      console.error('[FS] loadMatches:', e);
      $('#matches').setAttribute('aria-busy', 'false');
      $('#matches').innerHTML =
        '<div class="empty-state">دریافت نتایج ممکن نشد. دوباره تلاش کنید.</div>';
    }

    if (rid !== st.requestId) return;

    const hasLive = st.data.some(m => m.status === 'LIVE');
    const delay = hasLive ? CONFIG.liveRefreshMs : CONFIG.idleRefreshMs;
    if (!document.hidden) st.timer = setTimeout(() => loadMatches(false), delay);
  }

  // ---- رویدادها ----

  $('#chips').addEventListener('click', e => {
    const b = e.target.closest('.chip');
    if (!b) return;
    try {
      st.league = b.dataset.id;
      updateChipsActive();
      st.view === 'matches' ? renderMatches() : renderTable();
    } catch (err) {
      console.error('[FS] chip click:', err);
    }
  });

  document.addEventListener('click', e => {
    const a = e.target.closest('[data-view]');
    if (!a) return;
    e.preventDefault();
    try { setView(a.dataset.view); }
    catch (err) { console.error('[FS] setView:', err); }
  });

  $('#liveOnly').addEventListener('change', e => {
    st.liveOnly = e.target.checked;
    try { renderMatches(); }
    catch (err) { console.error('[FS] liveOnly:', err); }
  });

  $('#prev').addEventListener('click', () => {
    st.off--; updateDateLabel(); loadMatches(true);
  });

  $('#next').addEventListener('click', () => {
    st.off++; updateDateLabel(); loadMatches(true);
  });

  // تم
  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    $('#theme').textContent = theme === 'dark' ? '☀' : '☾';
    try { localStorage.setItem('fs-theme', theme); } catch (e) {}
  }

  $('#theme').addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme || 'light';
    setTheme(cur === 'dark' ? 'light' : 'dark');
  });

  try {
    const saved = localStorage.getItem('fs-theme');
    const pref = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    setTheme(saved || pref);
  } catch (e) {
    setTheme('light');
  }

  // FIX #10: visibilitychange با debounce
  let visTimer;
  let lastDay = new Date().toDateString();

  document.addEventListener('visibilitychange', () => {
    clearTimeout(visTimer);
    if (document.hidden) {
      clearTimeout(st.timer);
      stopFixtureWatcher();
      return;
    }
    visTimer = setTimeout(() => {
      const today = new Date().toDateString();
      if (today !== lastDay) {
        lastDay = today;
        st.off = 0;
        updateDateLabel();
      }
      loadMatches(false);
    }, 300);
  });

  // FIX #11: مخفی کردن تصاویر شکسته (جایگزین onerror اینلاین)
  document.addEventListener('error', e => {
    if (e.target?.tagName === 'IMG') e.target.style.display = 'none';
  }, true);

  // شروع
  $('#standings').hidden = true;
  renderChips();
  updateDateLabel();
  loadMatches(true);

})();