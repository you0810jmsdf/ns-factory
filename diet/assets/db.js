// IndexedDB データ層。通信は一切行わず、保存先はブラウザ内の IndexedDB のみに限定する。

export const DB_NAME = 'dietApp';
export const DB_VERSION = 1;

export const STORES = Object.freeze({
  profile: 'profile',
  weights: 'weights',
  meals: 'meals',
  waters: 'waters',
  exercises: 'exercises',
  myfoods: 'myfoods',
  myroutines: 'myroutines'
});

const STORE_NAMES = Object.values(STORES);
const DATE_RANGE_STORES = new Set([STORES.weights, STORES.meals, STORES.waters, STORES.exercises]);
const SYNC_CHANNEL_NAME = 'diet-app-sync';
const DB_BLOCKED_MESSAGE = '他のタブでこのアプリが開かれています。他のタブを閉じてから再読み込みしてください';
const DB_VERSIONCHANGE_MESSAGE = '別のタブでこのアプリの更新が始まりました。再読み込みしてください';

let dbPromise = null;
let syncChannel = null;
let syncChannelUnavailable = false;

const changeHandlers = new Set();
const versionChangeHandlers = new Set();

function createOpenBlockedError() {
  const error = new Error(DB_BLOCKED_MESSAGE);
  error.name = 'DBOpenBlockedError';
  error.code = 'DB_OPEN_BLOCKED';
  error.blocked = true;
  return error;
}

function dispatchToHandlers(handlers, payload) {
  handlers.forEach((handler) => {
    try {
      handler(payload);
    } catch (error) {
      setTimeout(() => {
        throw error;
      }, 0);
    }
  });
}

function normalizeChangeMessage(message) {
  if (!message || message.type !== 'changed' || !STORE_NAMES.includes(message.store)) {
    return null;
  }
  return {
    type: 'changed',
    store: message.store,
    date: typeof message.date === 'string' && message.date ? message.date : null
  };
}

function getSyncChannel() {
  if (syncChannelUnavailable || typeof globalThis.BroadcastChannel === 'undefined') {
    return null;
  }
  if (syncChannel) {
    return syncChannel;
  }

  try {
    syncChannel = new globalThis.BroadcastChannel(SYNC_CHANNEL_NAME);
    syncChannel.onmessage = (event) => {
      const message = normalizeChangeMessage(event.data);
      if (!message) {
        return;
      }
      dispatchToHandlers(changeHandlers, message);
    };
    return syncChannel;
  } catch (error) {
    syncChannelUnavailable = true;
    return null;
  }
}

function changeDateFromRecord(record) {
  return typeof record?.date === 'string' && record.date ? record.date : null;
}

function changeDateForWrite(storeName, record, key) {
  return changeDateFromRecord(record) || (storeName === STORES.weights && typeof key === 'string' ? key : null);
}

function notifyStoreChanged(storeName, date = null) {
  const message = {
    type: 'changed',
    store: storeName,
    date: typeof date === 'string' && date ? date : null
  };
  const channel = getSyncChannel();
  if (!channel) {
    return;
  }
  try {
    channel.postMessage(message);
  } catch (error) {
    syncChannelUnavailable = true;
  }
}

function notifyStoresChanged(storeNames) {
  storeNames.forEach((storeName) => notifyStoreChanged(storeName, null));
}

function notifyVersionChange() {
  dispatchToHandlers(versionChangeHandlers, {
    type: 'versionchange',
    message: DB_VERSIONCHANGE_MESSAGE
  });
}

/**
 * 別タブからの書き込み通知を購読する。
 * BroadcastChannel 未対応環境では何もしない解除関数を返す。
 * @param {(message:{type:'changed', store:string, date:string|null})=>void} handler
 * @returns {()=>void}
 */
export function subscribeChanges(handler) {
  if (typeof handler !== 'function' || !getSyncChannel()) {
    return () => {};
  }
  changeHandlers.add(handler);
  return () => {
    changeHandlers.delete(handler);
  };
}

/**
 * 別タブの DB アップグレード開始通知を購読する。
 * @param {(message:{type:'versionchange', message:string})=>void} handler
 * @returns {()=>void}
 */
export function subscribeVersionChanges(handler) {
  if (typeof handler !== 'function') {
    return () => {};
  }
  versionChangeHandlers.add(handler);
  return () => {
    versionChangeHandlers.delete(handler);
  };
}

/**
 * IndexedDB を利用できるか確認する。
 * @returns {boolean}
 */
export function isIndexedDBAvailable() {
  return typeof globalThis.indexedDB !== 'undefined';
}

/**
 * IndexedDB 接続を開く。DB 作成時は仕様書のストアとインデックスを作成する。
 * @returns {Promise<IDBDatabase>}
 */
export function openDB() {
  if (!isIndexedDBAvailable()) {
    return Promise.reject(new Error('IndexedDB を利用できない環境です'));
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(DB_NAME, DB_VERSION);
    let blocked = false;

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORES.profile)) {
        db.createObjectStore(STORES.profile, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.weights)) {
        db.createObjectStore(STORES.weights, { keyPath: 'date' });
      }

      if (!db.objectStoreNames.contains(STORES.meals)) {
        const meals = db.createObjectStore(STORES.meals, {
          keyPath: 'id',
          autoIncrement: true
        });
        meals.createIndex('date', 'date', { unique: false });
        meals.createIndex('date_slot', ['date', 'slot'], { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.waters)) {
        const waters = db.createObjectStore(STORES.waters, {
          keyPath: 'id',
          autoIncrement: true
        });
        waters.createIndex('date', 'date', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.exercises)) {
        const exercises = db.createObjectStore(STORES.exercises, {
          keyPath: 'id',
          autoIncrement: true
        });
        exercises.createIndex('date', 'date', { unique: false });
        exercises.createIndex('date_cat', ['date', 'cat'], { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.myfoods)) {
        const myfoods = db.createObjectStore(STORES.myfoods, {
          keyPath: 'id',
          autoIncrement: true
        });
        myfoods.createIndex('name', 'name', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.myroutines)) {
        const myroutines = db.createObjectStore(STORES.myroutines, {
          keyPath: 'id',
          autoIncrement: true
        });
        myroutines.createIndex('name', 'name', { unique: false });
      }
    };

    request.onblocked = () => {
      blocked = true;
      dbPromise = null;
      reject(createOpenBlockedError());
    };

    request.onsuccess = () => {
      const db = request.result;
      if (blocked) {
        db.close();
        return;
      }
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
        notifyVersionChange();
      };
      resolve(db);
    };

    request.onerror = () => {
      if (blocked) {
        return;
      }
      dbPromise = null;
      reject(request.error || new Error('IndexedDB の接続に失敗しました'));
    };
  });

  return dbPromise;
}

/**
 * キャッシュ済み接続を閉じる。
 * @returns {Promise<void>}
 */
export async function closeDB() {
  if (!dbPromise) {
    return;
  }
  const db = await dbPromise;
  db.close();
  dbPromise = null;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB 操作に失敗しました'));
  });
}

async function withStore(storeName, mode, callback) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let callbackResult;

    transaction.oncomplete = () => resolve(callbackResult);
    transaction.onerror = () => reject(transaction.error || new Error('IndexedDB トランザクションに失敗しました'));
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB トランザクションが中断されました'));

    try {
      callbackResult = callback(store);
    } catch (error) {
      transaction.abort();
      reject(error);
    }
  });
}

async function withStores(storeNames, mode, callback) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeNames, mode);
    const stores = Object.fromEntries(storeNames.map((name) => [name, transaction.objectStore(name)]));
    let callbackResult;

    transaction.oncomplete = () => resolve(callbackResult);
    transaction.onerror = () => reject(transaction.error || new Error('IndexedDB トランザクションに失敗しました'));
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB トランザクションが中断されました'));

    try {
      callbackResult = callback(stores);
    } catch (error) {
      transaction.abort();
      reject(error);
    }
  });
}

function cloneRecord(record) {
  if (record == null) {
    return record;
  }
  return typeof structuredClone === 'function'
    ? structuredClone(record)
    : JSON.parse(JSON.stringify(record));
}

function normalizeOptionalNumber(value) {
  if (value === '' || value === undefined || value === null || Number.isNaN(Number(value))) {
    return null;
  }
  return Number(value);
}

function nowIso() {
  return new Date().toISOString();
}

function validateStoreName(storeName) {
  if (!STORE_NAMES.includes(storeName)) {
    throw new Error(`不明なストアです: ${storeName}`);
  }
}

function putRequest(store, record) {
  const request = store.put(cloneRecord(record));
  return requestToPromise(request);
}

function addRequest(store, record) {
  const request = store.add(cloneRecord(record));
  return requestToPromise(request);
}

function deleteRequest(store, key) {
  const request = store.delete(key);
  return requestToPromise(request);
}

function getRequest(store, key) {
  const request = store.get(key);
  return requestToPromise(request);
}

function getAllRequest(source, query) {
  const request = query === undefined ? source.getAll() : source.getAll(query);
  return requestToPromise(request);
}

function normalizeProfile(profile) {
  const timestamp = nowIso();
  return {
    ...profile,
    id: 'me',
    targetDate: profile.targetDate ?? null,
    waterGoalMl: profile.waterGoalMl ?? null,
    countExerciseInBalance: profile.countExerciseInBalance ?? false,
    exerciseGoalMinPerWeek: profile.exerciseGoalMinPerWeek ?? 150,
    bmrFormula: profile.bmrFormula || 'ganpule',
    createdAt: profile.createdAt || timestamp,
    updatedAt: timestamp
  };
}

function normalizeWeight(record) {
  return {
    date: record.date,
    morning: normalizeOptionalNumber(record.morning),
    night: normalizeOptionalNumber(record.night),
    bodyFat: normalizeOptionalNumber(record.bodyFat),
    waist: normalizeOptionalNumber(record.waist),
    memo: record.memo ?? ''
  };
}

function normalizeMeal(record) {
  const normalized = {
    ...record,
    amount: normalizeOptionalNumber(record.amount),
    kcal: normalizeOptionalNumber(record.kcal),
    p: normalizeOptionalNumber(record.p),
    f: normalizeOptionalNumber(record.f),
    c: normalizeOptionalNumber(record.c),
    foodId: record.foodId ?? null
  };
  if (record.id == null) {
    delete normalized.id;
  }
  return normalized;
}

function normalizeWater(record) {
  const normalized = {
    ...record,
    ml: normalizeOptionalNumber(record.ml)
  };
  if (record.id == null) {
    delete normalized.id;
  }
  return normalized;
}

function normalizeExercise(record) {
  const normalized = {
    ...record,
    exId: record.exId ?? null,
    minutes: normalizeOptionalNumber(record.minutes),
    mets: normalizeOptionalNumber(record.mets),
    kcal: normalizeOptionalNumber(record.kcal),
    sets: normalizeOptionalNumber(record.sets),
    reps: normalizeOptionalNumber(record.reps),
    weightKg: normalizeOptionalNumber(record.weightKg),
    intensity: record.intensity ?? null,
    memo: record.memo ?? ''
  };
  if (record.id == null) {
    delete normalized.id;
  }
  return normalized;
}

function normalizeMyFood(record) {
  const normalized = {
    ...record,
    per: normalizeOptionalNumber(record.per),
    kcal: normalizeOptionalNumber(record.kcal),
    p: normalizeOptionalNumber(record.p),
    f: normalizeOptionalNumber(record.f),
    c: normalizeOptionalNumber(record.c)
  };
  if (record.id == null) {
    delete normalized.id;
  }
  return normalized;
}

function normalizeRoutineItem(item) {
  const source = item || {};
  return {
    exId: source.exId ?? null,
    name: source.name,
    minutes: normalizeOptionalNumber(source.minutes),
    mets: normalizeOptionalNumber(source.mets)
  };
}

function normalizeMyRoutine(record) {
  const items = Array.isArray(record.items) ? record.items.map(normalizeRoutineItem) : [];
  const normalized = {
    ...record,
    cat: record.cat ?? null,
    items,
    totalMinutes: normalizeOptionalNumber(record.totalMinutes)
  };
  if (record.id == null) {
    delete normalized.id;
  }
  return normalized;
}

function normalizeByStore(storeName, record) {
  switch (storeName) {
    case STORES.profile:
      return normalizeProfile(record);
    case STORES.weights:
      return normalizeWeight(record);
    case STORES.meals:
      return normalizeMeal(record);
    case STORES.waters:
      return normalizeWater(record);
    case STORES.exercises:
      return normalizeExercise(record);
    case STORES.myfoods:
      return normalizeMyFood(record);
    case STORES.myroutines:
      return normalizeMyRoutine(record);
    default:
      return cloneRecord(record);
  }
}

/**
 * 任意ストアの全件を取得する。
 * @param {string} storeName
 * @returns {Promise<Array<object>>}
 */
export async function getAll(storeName) {
  validateStoreName(storeName);
  return withStore(storeName, 'readonly', (store) => getAllRequest(store));
}

/**
 * 任意ストアからキーで1件取得する。
 * @param {string} storeName
 * @param {IDBValidKey} key
 * @returns {Promise<object|undefined>}
 */
export async function getItem(storeName, key) {
  validateStoreName(storeName);
  return withStore(storeName, 'readonly', (store) => getRequest(store, key));
}

/**
 * 任意ストアへ1件保存する。
 * @param {string} storeName
 * @param {object} record
 * @returns {Promise<IDBValidKey>}
 */
export async function putItem(storeName, record) {
  validateStoreName(storeName);
  const normalized = normalizeByStore(storeName, record);
  const key = await withStore(storeName, 'readwrite', (store) => putRequest(store, normalized));
  notifyStoreChanged(storeName, changeDateForWrite(storeName, normalized, key));
  return key;
}

/**
 * 任意ストアへ1件追加する。autoIncrement のキーを新規採番したい場合に使う。
 * @param {string} storeName
 * @param {object} record
 * @returns {Promise<IDBValidKey>}
 */
export async function addItem(storeName, record) {
  validateStoreName(storeName);
  const normalized = normalizeByStore(storeName, record);
  const key = await withStore(storeName, 'readwrite', (store) => addRequest(store, normalized));
  notifyStoreChanged(storeName, changeDateForWrite(storeName, normalized, key));
  return key;
}

/**
 * 任意ストアからキーで1件削除する。
 * @param {string} storeName
 * @param {IDBValidKey} key
 * @returns {Promise<void>}
 */
export async function deleteItem(storeName, key) {
  validateStoreName(storeName);
  const result = await withStore(storeName, 'readwrite', (store) => deleteRequest(store, key));
  notifyStoreChanged(storeName, changeDateForWrite(storeName, null, key));
  return result;
}

/**
 * 任意ストアを全消去する。
 * @param {string} storeName
 * @returns {Promise<void>}
 */
export async function clearStore(storeName) {
  validateStoreName(storeName);
  const result = await withStore(storeName, 'readwrite', (store) => requestToPromise(store.clear()));
  notifyStoreChanged(storeName, null);
  return result;
}

/**
 * プロフィールを取得する。
 * @returns {Promise<object|undefined>}
 */
export function getProfile() {
  return getItem(STORES.profile, 'me');
}

/**
 * プロフィールを保存する。
 * @param {object} profile
 * @returns {Promise<IDBValidKey>}
 */
export function saveProfile(profile) {
  return putItem(STORES.profile, normalizeProfile(profile));
}

/**
 * プロフィールを削除する。
 * @returns {Promise<void>}
 */
export function deleteProfile() {
  return deleteItem(STORES.profile, 'me');
}

/**
 * 日付キーで体重記録を取得する。
 * @param {string} date
 * @returns {Promise<object|undefined>}
 */
export function getWeight(date) {
  return getItem(STORES.weights, date);
}

/**
 * 体重記録を保存する。
 * @param {object} record
 * @returns {Promise<IDBValidKey>}
 */
export function saveWeight(record) {
  return putItem(STORES.weights, normalizeWeight(record));
}

/**
 * 体重記録を削除する。
 * @param {string} date
 * @returns {Promise<void>}
 */
export function deleteWeight(date) {
  return deleteItem(STORES.weights, date);
}

/**
 * 体重記録を日付範囲で取得する。
 * @param {string} startDate
 * @param {string} endDate
 * @returns {Promise<Array<object>>}
 */
export function getWeightsInRange(startDate, endDate) {
  return getByDateRange(STORES.weights, startDate, endDate);
}

/**
 * 食事記録を追加する。
 * @param {object} record
 * @returns {Promise<IDBValidKey>}
 */
export function addMeal(record) {
  return addItem(STORES.meals, normalizeMeal(record));
}

/**
 * 食事記録を更新する。
 * @param {object} record
 * @returns {Promise<IDBValidKey>}
 */
export function updateMeal(record) {
  return putItem(STORES.meals, normalizeMeal(record));
}

/**
 * 食事記録を取得する。
 * @param {number} id
 * @returns {Promise<object|undefined>}
 */
export function getMeal(id) {
  return getItem(STORES.meals, id);
}

/**
 * 食事記録を削除する。
 * @param {number} id
 * @returns {Promise<void>}
 */
export function deleteMeal(id) {
  return deleteItem(STORES.meals, id);
}

/**
 * 指定日の食事記録を取得する。
 * @param {string} date
 * @returns {Promise<Array<object>>}
 */
export function getMealsByDate(date) {
  return getByIndex(STORES.meals, 'date', date);
}

/**
 * 指定日・食事区分の食事記録を取得する。
 * @param {string} date
 * @param {'breakfast'|'lunch'|'dinner'|'snack'} slot
 * @returns {Promise<Array<object>>}
 */
export function getMealsByDateSlot(date, slot) {
  return getByIndex(STORES.meals, 'date_slot', [date, slot]);
}

/**
 * 食事記録を日付範囲で取得する。
 * @param {string} startDate
 * @param {string} endDate
 * @returns {Promise<Array<object>>}
 */
export function getMealsInRange(startDate, endDate) {
  return getByDateRange(STORES.meals, startDate, endDate);
}

/**
 * 水分記録を追加する。
 * @param {object} record
 * @returns {Promise<IDBValidKey>}
 */
export function addWater(record) {
  return addItem(STORES.waters, normalizeWater(record));
}

/**
 * 水分記録を更新する。
 * @param {object} record
 * @returns {Promise<IDBValidKey>}
 */
export function updateWater(record) {
  return putItem(STORES.waters, normalizeWater(record));
}

/**
 * 水分記録を取得する。
 * @param {number} id
 * @returns {Promise<object|undefined>}
 */
export function getWater(id) {
  return getItem(STORES.waters, id);
}

/**
 * 水分記録を削除する。
 * @param {number} id
 * @returns {Promise<void>}
 */
export function deleteWater(id) {
  return deleteItem(STORES.waters, id);
}

/**
 * 指定日の水分記録を取得する。
 * @param {string} date
 * @returns {Promise<Array<object>>}
 */
export function getWatersByDate(date) {
  return getByIndex(STORES.waters, 'date', date);
}

/**
 * 水分記録を日付範囲で取得する。
 * @param {string} startDate
 * @param {string} endDate
 * @returns {Promise<Array<object>>}
 */
export function getWatersInRange(startDate, endDate) {
  return getByDateRange(STORES.waters, startDate, endDate);
}

/**
 * 運動記録を追加する。
 * @param {object} record
 * @returns {Promise<IDBValidKey>}
 */
export function addExercise(record) {
  return addItem(STORES.exercises, normalizeExercise(record));
}

/**
 * 運動記録を更新する。
 * @param {object} record
 * @returns {Promise<IDBValidKey>}
 */
export function updateExercise(record) {
  return putItem(STORES.exercises, normalizeExercise(record));
}

/**
 * 運動記録を取得する。
 * @param {number} id
 * @returns {Promise<object|undefined>}
 */
export function getExercise(id) {
  return getItem(STORES.exercises, id);
}

/**
 * 運動記録を削除する。
 * @param {number} id
 * @returns {Promise<void>}
 */
export function deleteExercise(id) {
  return deleteItem(STORES.exercises, id);
}

/**
 * 指定日の運動記録を取得する。
 * @param {string} date
 * @returns {Promise<Array<object>>}
 */
export function getExercisesByDate(date) {
  return getByIndex(STORES.exercises, 'date', date);
}

/**
 * 指定日・カテゴリの運動記録を取得する。
 * @param {string} date
 * @param {'stretch'|'yoga'|'walk'|'run'|'strength'|'bike'|'swim'|'daily'|'other'} cat
 * @returns {Promise<Array<object>>}
 */
export function getExercisesByDateCat(date, cat) {
  return getByIndex(STORES.exercises, 'date_cat', [date, cat]);
}

/**
 * 運動記録を日付範囲で取得する。
 * @param {string} startDate
 * @param {string} endDate
 * @returns {Promise<Array<object>>}
 */
export function getExercisesInRange(startDate, endDate) {
  return getByDateRange(STORES.exercises, startDate, endDate);
}

/**
 * マイメニュー食品を追加する。
 * @param {object} record
 * @returns {Promise<IDBValidKey>}
 */
export function addMyFood(record) {
  return addItem(STORES.myfoods, normalizeMyFood(record));
}

/**
 * マイメニュー食品を更新する。
 * @param {object} record
 * @returns {Promise<IDBValidKey>}
 */
export function updateMyFood(record) {
  return putItem(STORES.myfoods, normalizeMyFood(record));
}

/**
 * マイメニュー食品を取得する。
 * @param {number} id
 * @returns {Promise<object|undefined>}
 */
export function getMyFood(id) {
  return getItem(STORES.myfoods, id);
}

/**
 * マイメニュー食品を削除する。
 * @param {number} id
 * @returns {Promise<void>}
 */
export function deleteMyFood(id) {
  return deleteItem(STORES.myfoods, id);
}

/**
 * マイメニュー食品を全件取得する。
 * @returns {Promise<Array<object>>}
 */
export function listMyFoods() {
  return getAll(STORES.myfoods);
}

/**
 * マイメニュー食品を名前の前方一致で検索する。
 * @param {string} name
 * @returns {Promise<Array<object>>}
 */
export async function searchMyFoodsByName(name) {
  const query = String(name || '');
  if (!query) {
    return listMyFoods();
  }
  const upperBound = `${query}\uffff`;
  return withStore(STORES.myfoods, 'readonly', (store) => {
    const range = IDBKeyRange.bound(query, upperBound);
    return getAllRequest(store.index('name'), range);
  });
}

/**
 * マイルーティンを追加する。
 * @param {object} record
 * @returns {Promise<IDBValidKey>}
 */
export function addMyRoutine(record) {
  return addItem(STORES.myroutines, normalizeMyRoutine(record));
}

/**
 * マイルーティンを更新する。
 * @param {object} record
 * @returns {Promise<IDBValidKey>}
 */
export function updateMyRoutine(record) {
  return putItem(STORES.myroutines, normalizeMyRoutine(record));
}

/**
 * マイルーティンを取得する。
 * @param {number} id
 * @returns {Promise<object|undefined>}
 */
export function getMyRoutine(id) {
  return getItem(STORES.myroutines, id);
}

/**
 * マイルーティンを削除する。
 * @param {number} id
 * @returns {Promise<void>}
 */
export function deleteMyRoutine(id) {
  return deleteItem(STORES.myroutines, id);
}

/**
 * マイルーティンを全件取得する。
 * @returns {Promise<Array<object>>}
 */
export function listMyRoutines() {
  return getAll(STORES.myroutines);
}

/**
 * マイルーティンを名前の前方一致で検索する。
 * @param {string} name
 * @returns {Promise<Array<object>>}
 */
export async function searchMyRoutinesByName(name) {
  const query = String(name || '');
  if (!query) {
    return listMyRoutines();
  }
  const upperBound = `${query}\uffff`;
  return withStore(STORES.myroutines, 'readonly', (store) => {
    const range = IDBKeyRange.bound(query, upperBound);
    return getAllRequest(store.index('name'), range);
  });
}

/**
 * インデックスで該当レコードを取得する。
 * @param {string} storeName
 * @param {string} indexName
 * @param {IDBValidKey|IDBKeyRange} query
 * @returns {Promise<Array<object>>}
 */
export async function getByIndex(storeName, indexName, query) {
  validateStoreName(storeName);
  return withStore(storeName, 'readonly', (store) => getAllRequest(store.index(indexName), query));
}

/**
 * 日付範囲で記録を取得する。weights は主キー、それ以外は date インデックスを使う。
 * @param {'weights'|'meals'|'waters'|'exercises'} storeName
 * @param {string} startDate
 * @param {string} endDate
 * @returns {Promise<Array<object>>}
 */
export async function getByDateRange(storeName, startDate, endDate) {
  validateStoreName(storeName);
  if (!DATE_RANGE_STORES.has(storeName)) {
    throw new Error(`日付範囲取得に対応していないストアです: ${storeName}`);
  }

  return withStore(storeName, 'readonly', (store) => {
    const range = IDBKeyRange.bound(startDate, endDate);
    const source = storeName === STORES.weights ? store : store.index('date');
    return getAllRequest(source, range);
  });
}

/**
 * 全ストアの内容をバックアップ用 JSON オブジェクトとして取得する。
 * @returns {Promise<{schemaVersion:number, exportedAt:string, profile:object|null, weights:Array<object>, meals:Array<object>, waters:Array<object>, exercises:Array<object>, myfoods:Array<object>, myroutines:Array<object>}>}
 */
export async function exportAll() {
  return withStores(STORE_NAMES, 'readonly', (stores) => Promise.all([
    getAllRequest(stores.profile),
    getAllRequest(stores.weights),
    getAllRequest(stores.meals),
    getAllRequest(stores.waters),
    getAllRequest(stores.exercises),
    getAllRequest(stores.myfoods),
    getAllRequest(stores.myroutines)
  ]).then(([profiles, weights, meals, waters, exercises, myfoods, myroutines]) => ({
    schemaVersion: 1,
    exportedAt: nowIso(),
    profile: profiles[0] || null,
    weights,
    meals,
    waters,
    exercises,
    myfoods,
    myroutines
  })));
}

function parseImportSource(source) {
  if (typeof source === 'string') {
    return JSON.parse(source);
  }
  return cloneRecord(source);
}

function normalizeImportPayload(source) {
  const payload = parseImportSource(source);
  if (!payload || payload.schemaVersion !== 1) {
    throw new Error('対応していないバックアップ形式です');
  }
  return {
    profile: payload.profile ? normalizeProfile(payload.profile) : null,
    weights: Array.isArray(payload.weights) ? payload.weights.map(normalizeWeight) : [],
    meals: Array.isArray(payload.meals) ? payload.meals.map(normalizeMeal) : [],
    waters: Array.isArray(payload.waters) ? payload.waters.map(normalizeWater) : [],
    exercises: Array.isArray(payload.exercises) ? payload.exercises.map(normalizeExercise) : [],
    myfoods: Array.isArray(payload.myfoods) ? payload.myfoods.map(normalizeMyFood) : [],
    myroutines: Array.isArray(payload.myroutines) ? payload.myroutines.map(normalizeMyRoutine) : []
  };
}

function buildConfirmMessage(mode) {
  if (mode === 'replace') {
    return 'バックアップを置換インポートします。現在の全データは削除されます。実行しますか？';
  }
  return 'バックアップをマージインポートします。同じ日付の既存データは保持します。実行しますか？';
}

async function runImportConfirm(mode, options) {
  if (options.skipConfirm) {
    return true;
  }
  const confirmFn = options.confirm || globalThis.confirm;
  if (typeof confirmFn !== 'function') {
    throw new Error('インポート確認ダイアログを表示できません');
  }
  return Boolean(confirmFn(buildConfirmMessage(mode)));
}

function putAll(store, records) {
  return Promise.all(records.map((record) => putRequest(store, record)));
}

function addAll(store, records) {
  return Promise.all(records.map((record) => addRequest(store, record)));
}

async function replaceAll(payload) {
  return withStores(STORE_NAMES, 'readwrite', (stores) => Promise.all(STORE_NAMES.map((name) => requestToPromise(stores[name].clear())))
    .then(() => Promise.all([
      payload.profile ? putRequest(stores.profile, payload.profile) : Promise.resolve(),
      putAll(stores.weights, payload.weights),
      putAll(stores.meals, payload.meals),
      putAll(stores.waters, payload.waters),
      putAll(stores.exercises, payload.exercises),
      putAll(stores.myfoods, payload.myfoods),
      putAll(stores.myroutines, payload.myroutines)
    ])));
}

function existingDateSet(records) {
  return new Set(records.map((record) => record.date).filter(Boolean));
}

async function mergeAll(payload) {
  return withStores(STORE_NAMES, 'readwrite', (stores) => Promise.all([
    getAllRequest(stores.profile),
    getAllRequest(stores.weights),
    getAllRequest(stores.meals),
    getAllRequest(stores.waters),
    getAllRequest(stores.exercises)
  ]).then(([profiles, weights, meals, waters, exercises]) => {
    const existingWeightDates = existingDateSet(weights);
    const existingMealDates = existingDateSet(meals);
    const existingWaterDates = existingDateSet(waters);
    const existingExerciseDates = existingDateSet(exercises);

    const mergedWeights = payload.weights.filter((record) => !existingWeightDates.has(record.date));
    const mergedMeals = payload.meals
      .filter((record) => !existingMealDates.has(record.date))
      .map(({ id, ...record }) => record);
    const mergedWaters = payload.waters
      .filter((record) => !existingWaterDates.has(record.date))
      .map(({ id, ...record }) => record);
    const mergedExercises = payload.exercises
      .filter((record) => !existingExerciseDates.has(record.date))
      .map(({ id, ...record }) => record);
    const mergedFoods = payload.myfoods.map(({ id, ...record }) => record);
    const mergedRoutines = payload.myroutines.map(({ id, ...record }) => record);

    return Promise.all([
      !profiles[0] && payload.profile ? putRequest(stores.profile, payload.profile) : Promise.resolve(),
      putAll(stores.weights, mergedWeights),
      addAll(stores.meals, mergedMeals),
      addAll(stores.waters, mergedWaters),
      addAll(stores.exercises, mergedExercises),
      addAll(stores.myfoods, mergedFoods),
      addAll(stores.myroutines, mergedRoutines)
    ]);
  }));
}

/**
 * バックアップ JSON をインポートする。
 * @param {string|object} json バックアップ JSON 文字列またはオブジェクト。
 * @param {'replace'|'merge'} [mode='merge'] 置換またはマージ。
 * @param {{skipConfirm?:boolean, confirm?:(message:string)=>boolean}} [options]
 * @returns {Promise<{cancelled:boolean, mode:'replace'|'merge'}>}
 */
export async function importAll(json, mode = 'merge', options = {}) {
  if (!['replace', 'merge'].includes(mode)) {
    throw new Error(`不明なインポートモードです: ${mode}`);
  }

  const payload = normalizeImportPayload(json);
  const confirmed = await runImportConfirm(mode, options);
  if (!confirmed) {
    return { cancelled: true, mode };
  }

  if (mode === 'replace') {
    await replaceAll(payload);
  } else {
    await mergeAll(payload);
  }
  notifyStoresChanged(STORE_NAMES);

  return { cancelled: false, mode };
}
