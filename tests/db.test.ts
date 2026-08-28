import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db, validateImportData } from '../src/db';
import type { AppData, Card, Review } from '../src/types';

const timestamp = '2026-08-28T00:00:00.000Z';
const originalCard: Card = {
  id: 'card-original',
  prompt: 'Original prompt',
  answers: ['Original answer'],
  keywords: [],
  matchMode: 'exact',
  intervalDays: 3,
  createdAt: timestamp,
  updatedAt: timestamp,
};
const originalReview: Review = {
  id: 'review-original',
  cardId: originalCard.id,
  prompt: originalCard.prompt,
  typedRecall: 'Original answer',
  proxyScore: 1,
  proxyLabel: 'match',
  matchedKeywords: [],
  grade: 'good',
  gradeScore: 0.75,
  gap: 0.25,
  suggestedIntervalDays: 8,
  reviewedAt: timestamp,
};

function exportData(overrides: Partial<AppData> = {}): AppData {
  return {
    schemaVersion: 1,
    exportedAt: timestamp,
    cards: [originalCard],
    reviews: [originalReview],
    settings: { sampleSize: 20, normalizedPunctuation: true },
    ...overrides,
  };
}

beforeEach(async () => {
  vi.restoreAllMocks();
  await db.clearAll();
});

describe('untrusted JSON import boundary', () => {
  it('rejects malformed nested card, review, and settings records with a field-specific recovery message', () => {
    const malformed = [
      exportData({ cards: [{ id: 'broken' } as Card] }),
      exportData({ reviews: [{ ...originalReview, proxyLabel: 'miss' }] }),
      exportData({ settings: { sampleSize: 0, normalizedPunctuation: true } }),
    ];

    for (const input of malformed) {
      expect(() => validateImportData(input)).toThrow(/Invalid Recall Calibrator export: .+ Your current data was not changed\./);
    }
  });

  it('rejects duplicate IDs instead of silently overwriting records', () => {
    expect(() => validateImportData(exportData({ cards: [originalCard, { ...originalCard }] }))).toThrow(/cards\[1\]\.id must be unique/);
  });

  it('preserves every existing store when validation fails', async () => {
    await db.importData(exportData());

    await expect(db.importData({
      schemaVersion: 1,
      exportedAt: timestamp,
      cards: [{ id: 'broken' }],
      reviews: [],
      settings: { sampleSize: 20, normalizedPunctuation: true },
    })).rejects.toThrow(/cards\[0\]\.prompt/);

    await expect(db.allCards()).resolves.toEqual([originalCard]);
    await expect(db.allReviews()).resolves.toEqual([originalReview]);
    await expect(db.settings()).resolves.toEqual({ sampleSize: 20, normalizedPunctuation: true });
  });

  it('rolls back clears and earlier writes when a later store write fails', async () => {
    await db.importData(exportData());
    const replacementCard = { ...originalCard, id: 'card-replacement', prompt: 'Replacement prompt' };
    const replacementReview = { ...originalReview, id: 'review-replacement', cardId: replacementCard.id, prompt: replacementCard.prompt };
    const nativePut = IDBObjectStore.prototype.put;
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
      if (this.name === 'reviews') throw new Error('Simulated review-store write failure');
      return key === undefined ? nativePut.call(this, value) : nativePut.call(this, value, key);
    });

    await expect(db.importData(exportData({
      cards: [replacementCard],
      reviews: [replacementReview],
      settings: { sampleSize: 5, normalizedPunctuation: false },
    }))).rejects.toThrow('The import could not be saved. Your current data was not changed.');
    vi.restoreAllMocks();

    await expect(db.allCards()).resolves.toEqual([originalCard]);
    await expect(db.allReviews()).resolves.toEqual([originalReview]);
    await expect(db.settings()).resolves.toEqual({ sampleSize: 20, normalizedPunctuation: true });
  });
});
