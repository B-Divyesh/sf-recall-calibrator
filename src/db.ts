import type { AppData, Card, Review, Settings } from './types';

const DB_NAME = 'recall-calibrator';
const DB_VERSION = 1;
const STORES = ['cards', 'reviews', 'settings'] as const;
const DEFAULT_SETTINGS: Settings = { sampleSize: 20, normalizedPunctuation: true };

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

export const db = {
  allCards: () => transaction<Card[]>('cards', 'readonly', (store) => store.getAll()),
  allReviews: () => transaction<Review[]>('reviews', 'readonly', (store) => store.getAll()),
  putCard: (card: Card) => transaction<IDBValidKey>('cards', 'readwrite', (store) => store.put(card)),
  deleteCard: (id: string) => transaction<undefined>('cards', 'readwrite', (store) => store.delete(id)),
  putReview: (review: Review) => transaction<IDBValidKey>('reviews', 'readwrite', (store) => store.put(review)),
  settings: async () => (await transaction<Settings | undefined>('settings', 'readonly', (store) => store.get('app'))) ?? DEFAULT_SETTINGS,
  putSettings: (settings: Settings) => transaction<IDBValidKey>('settings', 'readwrite', (store) => store.put(settings, 'app')),
  async clearAll() {
    const database = await openDb();
    await Promise.all(STORES.map((name) => new Promise<void>((resolve, reject) => {
      const tx = database.transaction(name, 'readwrite');
      tx.objectStore(name).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    })));
    database.close();
  },
  async exportData(): Promise<AppData> {
    const [cards, reviews, settings] = await Promise.all([this.allCards(), this.allReviews(), this.settings()]);
    return { schemaVersion: 1, exportedAt: new Date().toISOString(), cards, reviews, settings };
  },
  async importData(data: AppData) {
    if (data.schemaVersion !== 1 || !Array.isArray(data.cards) || !Array.isArray(data.reviews)) throw new Error('This is not a Recall Calibrator v1 export.');
    await this.clearAll();
    await Promise.all(data.cards.map((card) => this.putCard(card)));
    await Promise.all(data.reviews.map((review) => this.putReview(review)));
    await this.putSettings(data.settings ?? DEFAULT_SETTINGS);
  },
};
