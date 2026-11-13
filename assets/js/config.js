
window.FS = {
  CONFIG: {
    provider: 'mock',           // 'mock' | 'http'
    apiBase: '',                // فقط برای http لازم است
    liveRefreshMs: 30000,       // ۳۰ ثانیه (rate limit-safe)
    idleRefreshMs: 120000       // ۲ دقیقه
  },

  LEAGUES: [
    
    { id: 'ir',   name: 'لیگ برتر ایران',        flag: '🇮🇷', logo: './assets/img/logo/iranleague.svg',   hasTable: true },
    { id: 'de',   name: 'بوندسلیگا',              flag: '🇩🇪', logo: './assets/img/logo/bundesliga.svg',   hasTable: true },
    { id: 'en',   name: 'لیگ برتر انگلیس',        flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', logo: './assets/img/logo/pl.svg',            hasTable: true },
    { id: 'fr',   name: 'لیگ ۱ فرانسه',           flag: '🇫🇷', logo: './assets/img/logo/league1.svg',      hasTable: true },
    { id: 'us',   name: 'MLS آمریکا',             flag: '🇺🇸', logo: './assets/img/logo/usa_mls.svg',      hasTable: true },
    { id: 'es',   name: 'لالیگا',                 flag: '🇪🇸', logo: './assets/img/logo/laliga.svg',       hasTable: true },
    { id: 'it',   name: 'سری آ',                  flag: '🇮🇹', logo: './assets/img/logo/serrea.svg',       hasTable: true },
    { id: 'qa',   name: 'لیگ ستارگان قطر',        flag: '🇶🇦', logo: './assets/img/logo/qatar.league.svg', hasTable: true },
    { id: 'sa',   name: 'لیگ حرفه‌ای عربستان',    flag: '🇸🇦', logo: './assets/img/logo/arab.svg',         hasTable: true },
    { id: 'ae',   name: 'لیگ امارات',             flag: '🇦🇪', logo: './assets/img/logo/uae.svg',          hasTable: true },
    { id: 'ru',   name: 'لیگ برتر روسیه',         flag: '🇷🇺', logo: './assets/img/logo/russian.svg',      hasTable: true },
    { id: 'ucl',  name: 'لیگ قهرمانان اروپا',     flag: '🇪🇺', logo: './assets/img/logo/ucl.svg',          hasTable: true },
    { id: 'acl',  name: 'لیگ الیت آسیا',          flag: '🌏', logo: './assets/img/logo/ellite-asia.svg',  hasTable: true },
    { id: 'acl2', name: 'لیگ قهرمانان آسیا دو',   flag: '🌏', logo: './assets/img/logo/league-two.svg',   hasTable: true }
  ]
};