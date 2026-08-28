import { describe, expect, it } from 'vitest';
import { calibrationSummary, normalize, scoreRecall, suggestedInterval } from '../src/logic';
import type { Review } from '../src/types';

describe('deterministic recall matching', () => {
  it('normalizes case, accents, whitespace, and punctuation', () => {
    expect(normalize('  Crème—BRÛLÉE! ')).toBe('creme brulee');
  });

  it('accepts one of multiple exact answers without fuzzy guessing', () => {
    const card = { matchMode: 'exact' as const, answers: ['Hypertext Transfer Protocol', 'Hyper Text Transfer Protocol'], keywords: [] };
    expect(scoreRecall(card, 'hyper-text transfer protocol').label).toBe('match');
    expect(scoreRecall(card, 'HTTP').label).toBe('miss');
  });

  it('reports full, partial, and missed keyword recall', () => {
    const card = { matchMode: 'keywords' as const, answers: ['Carbon dioxide and water'], keywords: ['carbon dioxide', 'water'] };
    expect(scoreRecall(card, 'Water and carbon dioxide').label).toBe('match');
    expect(scoreRecall(card, 'Only water')).toMatchObject({ label: 'partial', score: 0.5 });
    expect(scoreRecall(card, 'sunlight')).toMatchObject({ label: 'miss', score: 0 });
  });

  it('matches complete keyword phrases rather than substrings', () => {
    const card = { matchMode: 'keywords' as const, answers: ['ion'], keywords: ['ion'] };
    expect(scoreRecall(card, 'condition')).toMatchObject({ label: 'miss' });
  });
});

describe('transparent intervals and calibration', () => {
  it('uses documented proxy-led interval rules', () => {
    expect(suggestedInterval(10, 0)).toBe(1);
    expect(suggestedInterval(10, 0.5)).toBe(12);
    expect(suggestedInterval(10, 1)).toBe(25);
  });

  it('reports grade bias and improvement after eight samples', () => {
    const reviews = Array.from({ length: 8 }, (_, index): Review => ({
      id: `${index}`, cardId: 'c', prompt: 'p', typedRecall: 'a', proxyScore: 1,
      proxyLabel: 'match', matchedKeywords: [], grade: 'good', gradeScore: index < 4 ? 0.5 : 0.75,
      gap: index < 4 ? 0.5 : 0.25, suggestedIntervalDays: 2, reviewedAt: new Date(index).toISOString(),
    }));
    const summary = calibrationSummary(reviews);
    expect(summary.improvement).toBe(50);
    expect(summary.bias).toBeLessThan(0);
  });
});
