import type { AppData, Card, Review, Settings } from './types';

const DB_NAME = 'recall-calibrator';
const DB_VERSION = 1;
const STORES = ['cards', 'reviews', 'settings'] as const;
const DEFAULT_SETTINGS: Settings = { sampleSize: 20, normalizedPunctuation: true };

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(path: string, expectation: string): never {
  throw new Error(`Invalid Recall Calibrator export: ${path} ${expectation}. Your current data was not changed.`);
}

function record(value: unknown, path: string): JsonRecord {
  if (!isRecord(value)) fail(path, 'must be an object');
  return value;
}

function string(value: unknown, path: string, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && value.trim().length === 0)) fail(path, allowEmpty ? 'must be text' : 'must be non-empty text');
  return value;
}

function stringArray(value: unknown, path: string, requireItem = false): string[] {
  if (!Array.isArray(value) || (requireItem && value.length === 0)) fail(path, requireItem ? 'must contain at least one text value' : 'must be an array of text values');
  return value.map((item, index) => string(item, `${path}[${index}]`));
}

function finiteNumber(value: unknown, path: string, minimum: number, maximum: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) fail(path, `must be a number from ${minimum} to ${maximum}`);
  return value;
}

function positiveInteger(value: unknown, path: string): number {
  const result = finiteNumber(value, path, 1, Number.MAX_SAFE_INTEGER);
  if (!Number.isInteger(result)) fail(path, 'must be a positive whole number');
  return result;
}

function dateString(value: unknown, path: string): string {
  const result = string(value, path);
  if (!Number.isFinite(Date.parse(result))) fail(path, 'must be a valid date');
  return result;
}

function enumValue<T extends string>(value: unknown, path: string, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) fail(path, `must be one of ${allowed.join(', ')}`);
  return value as T;
}

function validateCard(value: unknown, index: number): Card {
  const path = `cards[${index}]`;
  const item = record(value, path);
  const id = string(item.id, `${path}.id`);
  const prompt = string(item.prompt, `${path}.prompt`);
  const matchMode = enumValue(item.matchMode, `${path}.matchMode`, ['exact', 'keywords'] as const);
  const answers = stringArray(item.answers, `${path}.answers`, true);
  const keywords = stringArray(item.keywords, `${path}.keywords`, matchMode === 'keywords');
  return {
    id,
    prompt,
    answers,
    keywords,
    matchMode,
    intervalDays: positiveInteger(item.intervalDays, `${path}.intervalDays`),
    createdAt: dateString(item.createdAt, `${path}.createdAt`),
    updatedAt: dateString(item.updatedAt, `${path}.updatedAt`),
  };
}

function validateReview(value: unknown, index: number): Review {
  const path = `reviews[${index}]`;
  const item = record(value, path);
  const proxyScore = finiteNumber(item.proxyScore, `${path}.proxyScore`, 0, 1);
  if (![0, 0.5, 1].includes(proxyScore)) fail(`${path}.proxyScore`, 'must be 0, 0.5, or 1');
  const proxyLabel = enumValue(item.proxyLabel, `${path}.proxyLabel`, ['match', 'partial', 'miss'] as const);
  const expectedProxyLabel = proxyScore === 1 ? 'match' : proxyScore === 0.5 ? 'partial' : 'miss';
  if (proxyLabel !== expectedProxyLabel) fail(`${path}.proxyLabel`, `must agree with proxyScore (${expectedProxyLabel})`);
  const grade = enumValue(item.grade, `${path}.grade`, ['again', 'hard', 'good', 'easy'] as const);
  const expectedGradeScore = { again: 0, hard: 0.5, good: 0.75, easy: 1 }[grade];
  const gradeScore = finiteNumber(item.gradeScore, `${path}.gradeScore`, 0, 1);
  if (gradeScore !== expectedGradeScore) fail(`${path}.gradeScore`, `must agree with grade (${expectedGradeScore})`);
  const gap = finiteNumber(item.gap, `${path}.gap`, 0, 1);
  if (Math.abs(gap - Math.abs(gradeScore - proxyScore)) > Number.EPSILON) fail(`${path}.gap`, 'must agree with proxyScore and gradeScore');
  return {
    id: string(item.id, `${path}.id`),
    cardId: string(item.cardId, `${path}.cardId`),
    prompt: string(item.prompt, `${path}.prompt`),
    typedRecall: string(item.typedRecall, `${path}.typedRecall`),
    proxyScore,
    proxyLabel,
    matchedKeywords: stringArray(item.matchedKeywords, `${path}.matchedKeywords`),
    grade,
    gradeScore,
    gap,
    suggestedIntervalDays: positiveInteger(item.suggestedIntervalDays, `${path}.suggestedIntervalDays`),
    reviewedAt: dateString(item.reviewedAt, `${path}.reviewedAt`),
  };
}

function validateSettings(value: unknown): Settings {
  const item = record(value, 'settings');
  const sampleSize = positiveInteger(item.sampleSize, 'settings.sampleSize');
  if (sampleSize > 1000) fail('settings.sampleSize', 'must be no greater than 1000');
  if (typeof item.normalizedPunctuation !== 'boolean') fail('settings.normalizedPunctuation', 'must be true or false');
  return { sampleSize, normalizedPunctuation: item.normalizedPunctuation };
}

function ensureUniqueIds(records: Array<{ id: string }>, path: string) {
  const ids = new Set<string>();
  records.forEach((item, index) => {
    if (ids.has(item.id)) fail(`${path}[${index}].id`, 'must be unique');
    ids.add(item.id);
  });
}

/** Parse the untrusted JSON boundary before asking the user to replace data. */
export function validateImportData(value: unknown): AppData {
  const data = record(value, 'export');
  if (data.schemaVersion !== 1) throw new Error('This is not a Recall Calibrator v1 export. Your current data was not changed.');
  const exportedAt = dateString(data.exportedAt, 'exportedAt');
  if (!Array.isArray(data.cards)) fail('cards', 'must be an array');
  if (!Array.isArray(data.reviews)) fail('reviews', 'must be an array');
  const cards = data.cards.map(validateCard);
  const reviews = data.reviews.map(validateReview);
  ensureUniqueIds(cards, 'cards');
  ensureUniqueIds(reviews, 'reviews');
  return { schemaVersion: 1, exportedAt, cards, reviews, settings: validateSettings(data.settings) };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('cards')) db.createObjectStore('cards', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('reviews')) {
        const store = db.createObjectStore('reviews', { keyPath: 'id' });
        store.createIndex('reviewedAt', 'reviewedAt');
      }
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local storage.'));
  });
}

async function transaction<T>(storeName: typeof STORES[number], mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const request = action(tx.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Local storage request failed.'));
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error ?? new Error('Local storage transaction failed.'));
  });
}

async function writeAll(action: (stores: Record<typeof STORES[number], IDBObjectStore>, tx: IDBTransaction) => void, failureMessage: string): Promise<void> {
  const database = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction(STORES, 'readwrite');
    const stores = Object.fromEntries(STORES.map((name) => [name, tx.objectStore(name)])) as Record<typeof STORES[number], IDBObjectStore>;
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(new Error(failureMessage));
    tx.onerror = () => undefined;
    try {
      action(stores, tx);
    } catch {
      tx.abort();
    }
  }).finally(() => database.close());
}

export const db = {
  allCards: () => transaction<Card[]>('cards', 'readonly', (store) => store.getAll()),
  allReviews: () => transaction<Review[]>('reviews', 'readonly', (store) => store.getAll()),
  putCard: (card: Card) => transaction<IDBValidKey>('cards', 'readwrite', (store) => store.put(card)),
  deleteCard: (id: string) => transaction<undefined>('cards', 'readwrite', (store) => store.delete(id)),
  putReview: (review: Review) => transaction<IDBValidKey>('reviews', 'readwrite', (store) => store.put(review)),
  settings: async () => (await transaction<Settings | undefined>('settings', 'readonly', (store) => store.get('app'))) ?? DEFAULT_SETTINGS,
  putSettings: (settings: Settings) => transaction<IDBValidKey>('settings', 'readwrite', (store) => store.put(settings, 'app')),
  async clearAll() {
    await writeAll((stores) => STORES.forEach((name) => stores[name].clear()), 'Local data could not be deleted. Your current data was not changed.');
  },
  async exportData(): Promise<AppData> {
    const [cards, reviews, settings] = await Promise.all([this.allCards(), this.allReviews(), this.settings()]);
    return { schemaVersion: 1, exportedAt: new Date().toISOString(), cards, reviews, settings };
  },
  async importData(input: unknown) {
    const data = validateImportData(input);
    await writeAll((stores) => {
      STORES.forEach((name) => stores[name].clear());
      data.cards.forEach((card) => stores.cards.put(card));
      data.reviews.forEach((review) => stores.reviews.put(review));
      stores.settings.put(data.settings, 'app');
    }, 'The import could not be saved. Your current data was not changed.');
  },
};
