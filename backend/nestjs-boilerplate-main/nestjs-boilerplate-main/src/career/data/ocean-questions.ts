import { OceanQuestion } from '../career.types';

// Simplified Big Five (OCEAN) — 3 items per trait, Likert 1 (strongly disagree) to 5 (strongly agree).
// Age-appropriate, self-administered from Grade 9+ (FR-CE-01). A small number of reverse-scored
// items are included per standard Big Five short-form practice (see reverseScored handling in
// career-scoring.ts) — they are inverted before averaging, never displayed inverted to the student.
export const OCEAN_QUESTIONS: OceanQuestion[] = [
  { id: 'O1', trait: 'openness', text: 'I enjoy exploring new ideas and unfamiliar subjects.' },
  { id: 'O2', trait: 'openness', text: 'I like imagining new possibilities and creative solutions.' },
  { id: 'O3', trait: 'openness', text: 'I prefer sticking to familiar routines rather than trying new things.', reverseScored: true },

  { id: 'C1', trait: 'conscientiousness', text: 'I plan my work ahead of time instead of leaving it to the last minute.' },
  { id: 'C2', trait: 'conscientiousness', text: 'I pay close attention to detail and try to do things thoroughly.' },
  { id: 'C3', trait: 'conscientiousness', text: 'I often leave tasks unfinished or lose track of my belongings.', reverseScored: true },

  { id: 'E1', trait: 'extraversion', text: 'I feel energized when I am around other people.' },
  { id: 'E2', trait: 'extraversion', text: 'I enjoy starting conversations with people I don\'t know well.' },
  { id: 'E3', trait: 'extraversion', text: 'I prefer spending time alone rather than in a group.', reverseScored: true },

  { id: 'A1', trait: 'agreeableness', text: 'I try to be considerate and kind to the people around me.' },
  { id: 'A2', trait: 'agreeableness', text: 'I find it easy to trust and cooperate with others.' },
  { id: 'A3', trait: 'agreeableness', text: 'I often argue or disagree with people just to make a point.', reverseScored: true },

  { id: 'N1', trait: 'neuroticism', text: 'I tend to feel anxious or stressed about upcoming events.' },
  { id: 'N2', trait: 'neuroticism', text: 'My mood changes easily depending on what happens during the day.' },
  { id: 'N3', trait: 'neuroticism', text: 'I generally stay calm and relaxed, even under pressure.', reverseScored: true },
];
