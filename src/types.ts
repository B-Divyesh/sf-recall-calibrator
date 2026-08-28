export type MatchMode = 'exact' | 'keywords';
export type Grade = 'again' | 'hard' | 'good' | 'easy';
export type ProxyLabel = 'match' | 'partial' | 'miss';

export interface Card {
  id: string;
  prompt: string;
  answers: string[];
  keywords: string[];
  matchMode: MatchMode;
  intervalDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  cardId: string;
  prompt: string;
  typedRecall: string;
  proxyScore: number;
  proxyLabel: ProxyLabel;
  matchedKeywords: string[];
  grade: Grade;
  gradeScore: number;
  gap: number;
  suggestedIntervalDays: number;
  reviewedAt: string;
}

export interface Settings {
  sampleSize: number;
  normalizedPunctuation: boolean;
}

export interface AppData {
  schemaVersion: 1;
  exportedAt: string;
  cards: Card[];
  reviews: Review[];
  settings: Settings;
}
