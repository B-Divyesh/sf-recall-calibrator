import type { Card, Grade, ProxyLabel, Review } from './types';

export const GRADE_SCORES: Record<Grade, number> = {
  again: 0,
  hard: 0.5,
  good: 0.75,
  easy: 1,
};

export function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function scoreRecall(card: Pick<Card, 'answers' | 'keywords' | 'matchMode'>, typed: string): {
  score: number;
  label: ProxyLabel;
  matchedKeywords: string[];
} {
  const response = normalize(typed);
  if (!response) return { score: 0, label: 'miss', matchedKeywords: [] };

  if (card.matchMode === 'exact') {
    const match = card.answers.some((answer) => normalize(answer) === response);
    return { score: match ? 1 : 0, label: match ? 'match' : 'miss', matchedKeywords: [] };
  }

  const unique = [...new Set(card.keywords.map(normalize).filter(Boolean))];
  if (!unique.length) return { score: 0, label: 'miss', matchedKeywords: [] };
  const padded = ` ${response} `;
  const matchedKeywords = unique.filter((keyword) => padded.includes(` ${keyword} `));
  const ratio = matchedKeywords.length / unique.length;
  const score = ratio === 1 ? 1 : ratio > 0 ? 0.5 : 0;
  return { score, label: score === 1 ? 'match' : score === 0.5 ? 'partial' : 'miss', matchedKeywords };
}

export function suggestedInterval(currentDays: number, proxyScore: number): number {
  if (proxyScore === 0) return 1;
  const factor = proxyScore === 0.5 ? 1.2 : 2.5;
  return Math.max(1, Math.round(currentDays * factor));
}

export function calibrationSummary(reviews: Review[]) {
  if (!reviews.length) return { score: 0, bias: 0, meanGap: 0, latestGap: 0, improvement: null as number | null };
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const meanGap = mean(reviews.map((review) => review.gap));
  const bias = mean(reviews.map((review) => review.gradeScore - review.proxyScore));
  const split = Math.floor(reviews.length / 2);
  let improvement: number | null = null;
  if (reviews.length >= 8) {
    const earlier = mean(reviews.slice(0, split).map((review) => review.gap));
    const later = mean(reviews.slice(split).map((review) => review.gap));
    improvement = earlier === 0 ? 0 : ((earlier - later) / earlier) * 100;
  }
  return {
    score: Math.max(0, Math.round((1 - meanGap) * 100)),
    bias,
    meanGap,
    latestGap: reviews.at(-1)?.gap ?? 0,
    improvement,
  };
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
}
