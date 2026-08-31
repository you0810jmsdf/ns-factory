// 太陽位置計算モジュール
// 緯度・経度・日付・時刻から太陽の高度角・方位角を算出する（NOAA簡易式）
const RAD = Math.PI / 180;

/** 日付文字列(YYYY-MM-DD)から通日(1〜366)を返す */
export function dayOfYear(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000);
}

/**
 * 太陽位置を計算する
 * @param {number} lat 緯度(度)
 * @param {number} lon 経度(度)
 * @param {number} n 通日(1〜366)
 * @param {number} hourLocal 地方標準時(時, 小数可)
 * @param {number} tzMeridian タイムゾーン基準子午線(度) 日本=135
 * @returns {{altitude:number, azimuth:number}} 高度角(度)・方位角(北=0, 時計回り, 度)
 */
export function sunPosition(lat, lon, n, hourLocal, tzMeridian = 135) {
  // 太陽赤緯
  const decl = 23.45 * Math.sin(RAD * 360 * (284 + n) / 365);
  // 均時差（分）
  const B = RAD * 360 * (n - 81) / 364;
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  // 真太陽時と時角
  const solarTime = hourLocal + eot / 60 + (lon - tzMeridian) / 15;
  const H = 15 * (solarTime - 12); // 度（南中=0、午後が正）

  const sinAlt = Math.sin(RAD * lat) * Math.sin(RAD * decl)
               + Math.cos(RAD * lat) * Math.cos(RAD * decl) * Math.cos(RAD * H);
  const alt = Math.asin(Math.min(1, Math.max(-1, sinAlt)));

  // 方位角（北基準・時計回り）
  const cosAz = (Math.sin(RAD * decl) - Math.sin(RAD * lat) * sinAlt)
              / (Math.cos(RAD * lat) * Math.cos(alt));
  let az = Math.acos(Math.min(1, Math.max(-1, cosAz))) / RAD;
  if (H > 0) az = 360 - az;

  return { altitude: alt / RAD, azimuth: az };
}

/** 日の出・日の入のおおよその時刻(地方標準時)を返す。極夜・白夜はnull */
export function sunriseSunset(lat, lon, n, tzMeridian = 135) {
  const decl = 23.45 * Math.sin(RAD * 360 * (284 + n) / 365);
  const cosH0 = -Math.tan(RAD * lat) * Math.tan(RAD * decl);
  if (cosH0 < -1 || cosH0 > 1) return null;
  const H0 = Math.acos(cosH0) / RAD; // 度
  const B = RAD * 360 * (n - 81) / 364;
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const noon = 12 - eot / 60 - (lon - tzMeridian) / 15; // 南中の地方標準時
  return { sunrise: noon - H0 / 15, sunset: noon + H0 / 15 };
}

/** 時刻(小数)を "HH:MM" 形式へ */
export function formatHour(h) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
