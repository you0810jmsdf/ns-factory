// 出典：国立健康・栄養研究所「改訂版 身体活動のメッツ(METs)表」／厚生労働省「健康づくりのための身体活動・運動ガイド2023」に基づく代表値。
// 資料により同一種目でも値に幅があるため、本アプリの消費カロリーは目安である。

export const EXERCISE_CATEGORIES = Object.freeze([
  'stretch',
  'yoga',
  'walk',
  'run',
  'strength',
  'bike',
  'swim',
  'daily',
  'other'
]);

export const EXERCISES = Object.freeze([
  { id: 'e001', name: 'ストレッチング', kana: 'すとれっち', cat: 'stretch', mets: 2.3 },
  { id: 'e002', name: 'ラジオ体操第2', kana: 'らじおたいそうだいに', cat: 'stretch', mets: 3.3 },
  { id: 'e003', name: 'ラジオ体操第1', kana: 'らじおたいそうだいいち', cat: 'stretch', mets: 4.0 },
  { id: 'e004', name: 'ヨガ（ハタヨガ）', kana: 'よがはたよが', cat: 'yoga', mets: 2.5 },
  { id: 'e005', name: 'ピラティス', kana: 'ぴらてぃす', cat: 'yoga', mets: 3.0 },
  { id: 'e006', name: '太極拳', kana: 'たいきょくけん', cat: 'yoga', mets: 3.0 },
  { id: 'e007', name: 'パワーヨガ', kana: 'ぱわーよが', cat: 'yoga', mets: 4.0 },
  { id: 'e008', name: '歩行（ゆっくり・53m/分）', kana: 'ほこうゆっくり', cat: 'walk', mets: 2.8 },
  { id: 'e009', name: '歩行（普通・67m/分）', kana: 'ほこうふつう', cat: 'walk', mets: 3.0 },
  { id: 'e010', name: '犬の散歩', kana: 'いぬのさんぽ', cat: 'walk', mets: 3.0 },
  { id: 'e011', name: '歩行（速め・93m/分）', kana: 'ほこうはやめ', cat: 'walk', mets: 4.3 },
  { id: 'e012', name: '速歩（107m/分）', kana: 'そくほ', cat: 'walk', mets: 5.0 },
  { id: 'e013', name: '階段を上る（ゆっくり）', kana: 'かいだんをのぼるゆっくり', cat: 'walk', mets: 4.0 },
  { id: 'e014', name: 'ジョギング（ゆっくり）', kana: 'じょぎんぐゆっくり', cat: 'run', mets: 6.0 },
  { id: 'e015', name: 'ジョギング（全般）', kana: 'じょぎんぐぜんぱん', cat: 'run', mets: 7.0 },
  { id: 'e016', name: 'ランニング（134m/分）', kana: 'らんにんぐ', cat: 'run', mets: 8.3 },
  { id: 'e017', name: '自体重トレーニング（軽〜中等度）', kana: 'じたいじゅうとれーにんぐ', cat: 'strength', mets: 3.5 },
  { id: 'e018', name: '体幹トレーニング（腹筋・腕立て等）', kana: 'たいかんとれーにんぐ', cat: 'strength', mets: 3.8 },
  { id: 'e019', name: '筋力トレーニング（高強度）', kana: 'きんりょくとれーにんぐ', cat: 'strength', mets: 6.0 },
  { id: 'e020', name: '自転車（通勤・16km/h未満）', kana: 'じてんしゃつうきん', cat: 'bike', mets: 4.0 },
  { id: 'e021', name: '水中歩行（ゆっくり）', kana: 'すいちゅうほこうゆっくり', cat: 'swim', mets: 2.5 },
  { id: 'e022', name: '水泳（平泳ぎ・ゆっくり）', kana: 'すいえいひらおよぎゆっくり', cat: 'swim', mets: 5.3 },
  { id: 'e023', name: '水泳（クロール・ゆっくり）', kana: 'すいえいくろーるゆっくり', cat: 'swim', mets: 8.3 },
  { id: 'e024', name: 'エアロビクス', kana: 'えあろびくす', cat: 'other', mets: 7.3 },
  { id: 'e025', name: '卓球', kana: 'たっきゅう', cat: 'other', mets: 4.0 },
  { id: 'e026', name: 'ゴルフ（カートなし）', kana: 'ごるふかーとなし', cat: 'other', mets: 4.3 },
  { id: 'e027', name: '皿洗い', kana: 'さらあらい', cat: 'daily', mets: 1.8 },
  { id: 'e028', name: '立位（会話・読書）', kana: 'りついかいわどくしょ', cat: 'daily', mets: 2.0 },
  { id: 'e029', name: '掃除機かけ', kana: 'そうじきかけ', cat: 'daily', mets: 3.3 },
  { id: 'e030', name: '洗車', kana: 'せんしゃ', cat: 'daily', mets: 3.0 },
  { id: 'e031', name: '庭仕事・草むしり', kana: 'にわしごとくさむしり', cat: 'daily', mets: 3.5 },
  { id: 'e032', name: '子どもと遊ぶ（活発に）', kana: 'こどもとあそぶかっぱつに', cat: 'daily', mets: 3.0 }
]);

/**
 * 運動名・かなを対象に部分一致検索する。
 * @param {string} query 検索語。
 * @param {{category?:string, limit?:number}} [options] 絞り込み条件。
 * @returns {Array<object>} 検索結果。
 */
export function searchExercises(query, options = {}) {
  const text = String(query || '').trim();
  const category = options.category || null;
  const limit = Number.isFinite(options.limit) && options.limit > 0 ? options.limit : Infinity;

  return EXERCISES
    .filter((exercise) => !category || exercise.cat === category)
    .filter((exercise) => {
      if (!text) {
        return true;
      }
      return exercise.name.includes(text) || exercise.kana.includes(text);
    })
    .slice(0, limit);
}

/**
 * 指定カテゴリの運動種目を取得する。
 * @param {string} category カテゴリ。
 * @returns {Array<object>} カテゴリ内の種目。
 */
export function getExercisesByCategory(category) {
  return EXERCISES.filter((exercise) => exercise.cat === category);
}

/**
 * IDから運動種目を取得する。
 * @param {string} id 運動種目ID。
 * @returns {object|null} 該当種目。なければ null。
 */
export function findExerciseById(id) {
  return EXERCISES.find((exercise) => exercise.id === id) || null;
}

/**
 * カテゴリ別の種目数を返す。
 * @returns {Record<string, number>} カテゴリ別件数。
 */
export function countExercisesByCategory() {
  return EXERCISE_CATEGORIES.reduce((counts, category) => {
    counts[category] = getExercisesByCategory(category).length;
    return counts;
  }, {});
}

export default EXERCISES;
