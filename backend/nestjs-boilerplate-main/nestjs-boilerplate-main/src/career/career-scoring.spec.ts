import {
  buildTraitDescriptions,
  rankRiasecSuggestions,
  scoreOcean,
  scoreRiasec,
} from './career-scoring';
import { OCEAN_QUESTIONS } from './data/ocean-questions';
import { RIASEC_QUESTIONS } from './data/riasec-questions';
import { QuestionAnswer } from './career.types';

function allFives(): QuestionAnswer[] {
  return OCEAN_QUESTIONS.map((q) => ({ questionId: q.id, value: 5 }));
}

function allOnes(): QuestionAnswer[] {
  return OCEAN_QUESTIONS.map((q) => ({ questionId: q.id, value: 1 }));
}

describe('scoreOcean', () => {
  it('scores a trait at 100 when every non-reverse item is answered 5 and every reverse item is answered 1', () => {
    const answers: QuestionAnswer[] = OCEAN_QUESTIONS.map((q) => ({
      questionId: q.id,
      value: q.reverseScored ? 1 : 5,
    }));

    const scores = scoreOcean(answers);

    for (const trait of Object.keys(scores) as (keyof typeof scores)[]) {
      expect(scores[trait]).toBe(100);
    }
  });

  it('inverts reverse-scored items before averaging, so uniformly-high raw answers do not always mean a high trait score', () => {
    // Answering "5" (strongly agree) to a reverse-scored item like "I prefer routines"
    // should pull the openness score DOWN, not up.
    const scores = scoreOcean(allFives());
    // openness has one reverse item (O3) among 3 — 2x value=5 (=100%) + 1x reversed (6-5=1, =0%) -> avg 66.67 -> 67
    expect(scores.openness).toBeLessThan(100);
    expect(scores.openness).toBeGreaterThan(0);
  });

  it('returns 0 for a trait with no matching answers', () => {
    const scores = scoreOcean([]);
    expect(scores.openness).toBe(0);
    expect(scores.neuroticism).toBe(0);
  });

  it('ignores answers for unknown question ids', () => {
    const scores = scoreOcean([{ questionId: 'not-a-real-id', value: 5 }]);
    expect(scores.openness).toBe(0);
  });

  it('scores every trait at 0 when every non-reverse item is 1 and every reverse item is 5', () => {
    const answers: QuestionAnswer[] = OCEAN_QUESTIONS.map((q) => ({
      questionId: q.id,
      value: q.reverseScored ? 5 : 1,
    }));
    const scores = scoreOcean(answers);
    for (const trait of Object.keys(scores) as (keyof typeof scores)[]) {
      expect(scores[trait]).toBe(0);
    }
  });
});

describe('scoreRiasec', () => {
  it('scores a dimension at 100 when all its items are answered 5', () => {
    const answers: QuestionAnswer[] = RIASEC_QUESTIONS.map((q) => ({ questionId: q.id, value: 5 }));
    const scores = scoreRiasec(answers);
    for (const dimension of Object.keys(scores) as (keyof typeof scores)[]) {
      expect(scores[dimension]).toBe(100);
    }
  });

  it('has no reverse-scored items (unlike OCEAN) — direct interest ratings', () => {
    const someRealistic = RIASEC_QUESTIONS.filter((q) => q.dimension === 'realistic');
    expect(someRealistic.every((q) => !('reverseScored' in q))).toBe(true);
  });
});

describe('buildTraitDescriptions — content safety (never a verdict, never a disorder-style label)', () => {
  const FORBIDDEN_VERDICT_PHRASES = [
    'you should become',
    'you must',
    'you are meant to be',
    'you will be a',
    'diagnos',
    'disorder',
  ];

  it('never contains a directive verdict phrase, at any score level', () => {
    for (const rawScore of [0, 25, 50, 75, 100]) {
      const scores = { openness: rawScore, conscientiousness: rawScore, extraversion: rawScore, agreeableness: rawScore, neuroticism: rawScore };
      const descriptions = buildTraitDescriptions(scores);
      for (const d of descriptions) {
        const lower = d.description.toLowerCase();
        for (const phrase of FORBIDDEN_VERDICT_PHRASES) {
          expect(lower).not.toContain(phrase);
        }
      }
    }
  });

  it('returns one description per trait, each tagged with a level', () => {
    const descriptions = buildTraitDescriptions(scoreOcean(allFives()));
    expect(descriptions).toHaveLength(5);
    for (const d of descriptions) {
      expect(['low', 'moderate', 'high']).toContain(d.level);
    }
  });
});

describe('rankRiasecSuggestions — content safety (exploratory framing, never a single recommended career)', () => {
  it('every suggestion uses exploratory language ("may enjoy exploring"), never a directive verdict', () => {
    const scores = { realistic: 90, investigative: 80, artistic: 10, social: 20, enterprising: 30, conventional: 40 };
    const suggestions = rankRiasecSuggestions(scores);

    for (const s of suggestions) {
      expect(s.description.toLowerCase()).toContain('may enjoy exploring');
      expect(s.description.toLowerCase()).not.toContain('you should become');
      expect(s.description.toLowerCase()).not.toContain('the best career for you');
    }
  });

  it('ranks by score descending and returns the top N, never all 6 dimensions at once as an ordered list of "the" answer', () => {
    const scores = { realistic: 10, investigative: 90, artistic: 20, social: 80, enterprising: 30, conventional: 70 };
    const suggestions = rankRiasecSuggestions(scores, 3);

    expect(suggestions).toHaveLength(3);
    expect(suggestions.map((s) => s.dimension)).toEqual(['investigative', 'social', 'conventional']);
  });

  it('never singles out one dimension as "the" answer — always returns multiple suggestion cards', () => {
    const scores = { realistic: 10, investigative: 90, artistic: 20, social: 80, enterprising: 30, conventional: 70 };
    const suggestions = rankRiasecSuggestions(scores);
    expect(suggestions.length).toBeGreaterThan(1);
  });
});
