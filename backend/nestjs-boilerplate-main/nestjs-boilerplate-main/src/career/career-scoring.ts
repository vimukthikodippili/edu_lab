import { OCEAN_QUESTIONS } from './data/ocean-questions';
import { RIASEC_QUESTIONS } from './data/riasec-questions';
import {
  OceanScores,
  OceanTrait,
  QuestionAnswer,
  RiasecDimension,
  RiasecScores,
  RiasecSuggestion,
  TraitDescription,
} from './career.types';

const OCEAN_TRAITS: OceanTrait[] = [
  'openness',
  'conscientiousness',
  'extraversion',
  'agreeableness',
  'neuroticism',
];

const RIASEC_DIMENSIONS: RiasecDimension[] = [
  'realistic',
  'investigative',
  'artistic',
  'social',
  'enterprising',
  'conventional',
];

// Likert 1-5 -> 0-100.
function toPercent(average: number): number {
  return Math.round(((average - 1) / 4) * 100);
}

export function scoreOcean(answers: QuestionAnswer[]): OceanScores {
  const questionById = new Map(OCEAN_QUESTIONS.map((q) => [q.id, q]));
  const valuesByTrait = new Map<OceanTrait, number[]>();

  for (const answer of answers) {
    const question = questionById.get(answer.questionId);
    if (!question) continue;
    const value = question.reverseScored ? 6 - answer.value : answer.value;
    const list = valuesByTrait.get(question.trait) ?? [];
    list.push(value);
    valuesByTrait.set(question.trait, list);
  }

  const scores = {} as OceanScores;
  for (const trait of OCEAN_TRAITS) {
    const values = valuesByTrait.get(trait) ?? [];
    scores[trait] = values.length
      ? toPercent(values.reduce((a, b) => a + b, 0) / values.length)
      : 0;
  }
  return scores;
}

export function scoreRiasec(answers: QuestionAnswer[]): RiasecScores {
  const questionById = new Map(RIASEC_QUESTIONS.map((q) => [q.id, q]));
  const valuesByDimension = new Map<RiasecDimension, number[]>();

  for (const answer of answers) {
    const question = questionById.get(answer.questionId);
    if (!question) continue;
    const list = valuesByDimension.get(question.dimension) ?? [];
    list.push(answer.value);
    valuesByDimension.set(question.dimension, list);
  }

  const scores = {} as RiasecScores;
  for (const dimension of RIASEC_DIMENSIONS) {
    const values = valuesByDimension.get(dimension) ?? [];
    scores[dimension] = values.length
      ? toPercent(values.reduce((a, b) => a + b, 0) / values.length)
      : 0;
  }
  return scores;
}

function levelFor(score: number): 'low' | 'moderate' | 'high' {
  if (score < 40) return 'low';
  if (score <= 70) return 'moderate';
  return 'high';
}

// Fixed, descriptive templates — never a verdict, never a label beyond the trait itself.
// See career-scoring.spec.ts's content-safety test for the exact phrasing guarantee.
const TRAIT_DESCRIPTIONS: Record<OceanTrait, Record<'low' | 'moderate' | 'high', string>> = {
  openness: {
    low: 'You tend to prefer familiar, tried-and-tested approaches over unfamiliar ones.',
    moderate: 'You show a balanced mix of curiosity and comfort with familiar approaches.',
    high: 'You tend to enjoy new ideas, creativity, and exploring unfamiliar subjects.',
  },
  conscientiousness: {
    low: 'You may prefer a flexible, go-with-the-flow approach to tasks and planning.',
    moderate: 'You show a balanced mix of planning ahead and staying flexible.',
    high: 'You tend to be organized, detail-oriented, and reliable in following through on plans.',
  },
  extraversion: {
    low: 'You tend to feel most comfortable with quieter, more independent activities.',
    moderate: 'You show a balanced mix of enjoying company and enjoying time alone.',
    high: 'You tend to feel energized by social interaction and group activities.',
  },
  agreeableness: {
    low: 'You tend to value directness and your own perspective in group settings.',
    moderate: 'You show a balanced mix of cooperation and standing firm on your views.',
    high: 'You tend to be cooperative, considerate, and easy to work with in a team.',
  },
  neuroticism: {
    low: 'You tend to stay calm and steady, even in stressful situations.',
    moderate: 'You show a balanced mix of steadiness and normal everyday stress responses.',
    high: 'You may notice stress or mood shifts more readily during busy or uncertain periods.',
  },
};

export function buildTraitDescriptions(scores: OceanScores): TraitDescription[] {
  return OCEAN_TRAITS.map((trait) => {
    const level = levelFor(scores[trait]);
    return { trait, level, description: TRAIT_DESCRIPTIONS[trait][level] };
  });
}

const RIASEC_LABELS: Record<RiasecDimension, string> = {
  realistic: 'Realistic — Hands-On & Practical',
  investigative: 'Investigative — Research & Problem-Solving',
  artistic: 'Artistic — Creative & Expressive',
  social: 'Social — Helping & Teaching',
  enterprising: 'Enterprising — Leading & Persuading',
  conventional: 'Conventional — Organizing & Structuring',
};

// Fixed "you may enjoy exploring..." templates — deliberately exploratory framing,
// never a directive verdict or a single recommended career (FR-CE-03/FR-CE-06).
const RIASEC_SUGGESTIONS: Record<RiasecDimension, string> = {
  realistic: 'You may enjoy exploring hands-on fields like engineering, trades, agriculture, or applied technology.',
  investigative: 'You may enjoy exploring research-driven fields like science, medicine, data analysis, or technology.',
  artistic: 'You may enjoy exploring creative fields like design, media, the arts, or writing.',
  social: 'You may enjoy exploring people-focused fields like teaching, counseling, healthcare, or community work.',
  enterprising: 'You may enjoy exploring leadership-oriented fields like business, entrepreneurship, or public speaking.',
  conventional: 'You may enjoy exploring detail-oriented fields like finance, administration, or data management.',
};

export function rankRiasecSuggestions(scores: RiasecScores, topN = 3): RiasecSuggestion[] {
  return [...RIASEC_DIMENSIONS]
    .sort((a, b) => scores[b] - scores[a])
    .slice(0, topN)
    .map((dimension) => ({
      dimension,
      label: RIASEC_LABELS[dimension],
      description: RIASEC_SUGGESTIONS[dimension],
    }));
}
