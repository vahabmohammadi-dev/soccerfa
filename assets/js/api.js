/* لایه داده — mock با پشتیبانی از fixtures (بازی‌های آینده) */
(() => {
  'use strict';
const TEAMS = {
  // لیگ برتر ایران (۱۸ تیم) — کامل از منبع [citation:1][citation:9]
  ir: [
    'پرسپولیس', 'استقلال', 'سپاهان', 'تراکتور',
    'گل گهر', 'فولاد', 'چادرملو اردکان', 'فجر سپاسی',
    'خیبر خرم آباد', 'ملوان', 'استقلال خوزستان', 'پیکان',
    'آلومینیوم اراک', 'شمس آذر قزوین', 'ذوب آهن', 'مس رفسنجان',
    'صنعت نفت آبادان', 'نساجی مازندران'
  ],

  // بوندسلیگا (۱۸ تیم) — کامل از منبع [citation:2]
  de: [
    'بایرن مونیخ', 'دورتموند', 'لایپزیگ', 'لورکوزن',
    'فرایبورگ', 'اشتوتگارت', 'آینتراخت فرانکفورت', 'وولفسبورگ',
    'ماینتس', 'وردر بریمن', 'مونشن‌گلادباخ', 'هوفنهایم',
    'آگسبورگ', 'اونین برلین', 'کلن', 'هایدنهایم',
    'سن پائولی', 'هولشتاین کیل'
  ],

  // لیگ برتر انگلیس (۲۰ تیم) — کامل از منبع [citation:3][citation:11]
  en: [
    'آرسنال', 'منچسترسیتی', 'منچستریونایتد', 'استون ویلا',
    'لیورپول', 'بورنموث', 'ساندرلند', 'براینتون',
    'برنتفورد', 'چلسی', 'فولام', 'نیوکاسل',
    'اورتون', 'لیدز', 'کریستال پالاس', 'ناتینگهام فارست',
    'تاتنهام', 'وستهام', 'برنلی', 'ولورهمپتون'
  ],

  // لیگ ۱ فرانسه (۱۸ تیم) — کامل از منبع [citation:4]
  fr: [
    'پاری سن ژرمن', 'مارسی', 'موناکو', 'لیون',
    'لیل', 'نیس', 'لانس', 'رن',
    'استراسبورگ', 'تولوز', 'نانت', 'لوریان',
    'برست', 'اکسر', 'آنژه', 'لوهاور',
    'متز', 'پاریس اف سی'
  ],

  // MLS آمریکا — داده کامل در نتایج نبود، به همان ۴ تیم محدود شد
  us: ['اینتر میامی', 'لس‌آنجلس', 'سیاتل', 'نیویورک'],

  // لالیگا (۲۰ تیم) — کامل از منبع [citation:6][citation:13]
  es: [
    'رئال مادرید', 'بارسلونا', 'اتلتیکو مادرید', 'ویارئال',
    'رئال سوسیداد', 'رئال بتیس', 'اتلتیک بیلبائو', 'سلتاویگو',
    'خیرونا', 'سویا', 'اسپانیول', 'والنسیا',
    'رایو وایکانو', 'لوانته', 'اوساسونا', 'الچه',
    'دپورتیوو آلاوس', 'مایورکا', 'ختافه', 'رئال اوویدو'
  ],

  // سری آ (۲۰ تیم) — کامل از منبع [citation:7]
  it: [
    'اینتر', 'میلان', 'یوونتوس', 'ناپولی',
    'آتالانتا', 'رم', 'لاتزیو', 'فیورنتینا',
    'بولونیا', 'کومو', 'ساسولو', 'اودینزه',
    'پارما', 'کالیاری', 'جنوا', 'تورینو',
    'لچه', 'پیزا', 'هلاس ورونا', 'کرمونزه'
  ],

  qa: [
    'السد', 'الدحیل', 'الغرافه', 'الریان',
    'الشمال', 'قطر', 'العربی', 'الوکره',
    'الاهلی', 'السیلیه', 'الشحانیه', 'ام صلال'
  ],

  sa: ['الهلال', 'النصر', 'الاتحاد', 'الاهلی'],

  ae: ['العین', 'شباب الاهلی', 'الوحدة', 'الجزیره'],

  ru: ['زنیت', 'اسپارتاک', 'سسکا', 'لوکوموتیو'],

  ucl: ['رئال مادرید', 'منچسترسیتی', 'بایرن مونیخ', 'پاری سن ژرمن'],

  acl: ['الهلال', 'العین', 'السد', 'یوکوهاما مارینوس'],

  acl2: ['گل گهر', 'الوحده', 'التعاون', 'الشرطه', 'المحرق', 'نصف قارشی']
};

  function mock(off) {
    if (off === 1) return [];

    const min = Math.floor((Date.now() / 60000) % 90) + 1;
    const out = [];

    window.FS.LEAGUES.forEach((l, li) => {
      const t = TEAMS[l.id];
      if (!t || t.length < 4) return; // FIX #2

      [[0, 1], [2, 3]].forEach(([a, b], i) => {
        const live = off === 0 && i === 0;
        const done = off < 0 || (off === 0 && i === 1);
        const seed = li + i + 2;

        out.push({
          id: `${l.id}-${off}-${i}`,
          league: l.id,
          home: t[a],
          away: t[b],
          hs: done ? seed % 4 : live ? Math.floor(min / (35 + seed)) : null,
          as: done ? (seed * 2) % 3 : live ? Math.floor(min / (50 + seed)) : null,
          status: live ? 'LIVE' : done ? 'FT' : 'NS',
          minute: live ? min : null,
          time: `${17 + i * 2}:${li % 2 ? '30' : '00'}`,
          kickoff: null,
          homeCrest: null,
          awayCrest: null
        });
      });
    });

    return out;
  }

  /*
    FIX #3: mockFixtures اضافه شد.
    دلیل: کاربر خواست وقتی بازی امروز نیست، بازی‌های آینده با ساعت
    نمایش داده شود. mockFixtures دو بازی برای هر لیگ در روزهای ۳ و ۷
    بعد می‌سازد با kickoff واقعی (ISO) برای شمارش معکوس.
  */
  function mockFixtures() {
    const out = [];
    const now = new Date();

    window.FS.LEAGUES.forEach((l, li) => {
      const t = TEAMS[l.id];
      if (!t || t.length < 4) return;

      [3, 7].forEach((dayOffset, i) => {
        const kickoff = new Date(now);
        kickoff.setDate(kickoff.getDate() + dayOffset);
        kickoff.setHours(17 + i * 2, li % 2 ? 30 : 0, 0, 0);

        out.push({
          id: `${l.id}-fix-${i}`,
          league: l.id,
          home: t[i * 2],
          away: t[i * 2 + 1] || t[0],
          hs: null,
          as: null,
          status: 'NS',
          minute: null,
          time: `${17 + i * 2}:${li % 2 ? '30' : '00'}`,
          kickoff: kickoff.toISOString(),
          homeCrest: null,
          awayCrest: null,
          _isFixture: true
        });
      });
    });

    return out;
  }

  // FIX #4: mockTable
  function mockTable(id) {
    const teams = TEAMS[id];
    if (!Array.isArray(teams) || !teams.length) return [];

    return teams.map((team, i) => {
      const w = Math.max(0, 9 - 2 * i);
      const d = 2 + (i % 2);
      const l = 1 + i;
      return {
        team,
        p: w + d + l,
        w, d, l,
        gf: Math.max(0, 20 - 3 * i),
        ga: 8 + 3 * i,
        pts: w * 3 + d
      };
    });
  }

  window.FS.api = {
    getMatches:   off => Promise.resolve(mock(off)),
    getFixtures:  ()  => Promise.resolve(mockFixtures()),  // FIX #3
    getStandings: id  => Promise.resolve(mockTable(id))
  };
})();