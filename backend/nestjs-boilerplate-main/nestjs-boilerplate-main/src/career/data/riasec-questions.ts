import { RiasecQuestion } from '../career.types';

// RIASEC (Holland Code) interest inventory — 3 items per dimension, Likert 1-5
// (1 = not interested, 5 = very interested). Short-form interest questionnaire (FR-CE-02).
export const RIASEC_QUESTIONS: RiasecQuestion[] = [
  { id: 'R1', dimension: 'realistic', text: 'Building, fixing, or working with tools and machines.' },
  { id: 'R2', dimension: 'realistic', text: 'Working outdoors or with your hands on a physical project.' },
  { id: 'R3', dimension: 'realistic', text: 'Operating or assembling equipment and devices.' },

  { id: 'I1', dimension: 'investigative', text: 'Investigating how things work through experiments or research.' },
  { id: 'I2', dimension: 'investigative', text: 'Solving puzzles, math problems, or logical challenges.' },
  { id: 'I3', dimension: 'investigative', text: 'Reading about science, technology, or how the natural world works.' },

  { id: 'A1', dimension: 'artistic', text: 'Creating art, music, writing, or other original work.' },
  { id: 'A2', dimension: 'artistic', text: 'Designing something with your own personal style.' },
  { id: 'A3', dimension: 'artistic', text: 'Performing, whether on stage, on camera, or in front of others.' },

  { id: 'S1', dimension: 'social', text: 'Helping, teaching, or mentoring other people.' },
  { id: 'S2', dimension: 'social', text: 'Working in a team to support a shared goal.' },
  { id: 'S3', dimension: 'social', text: 'Listening to and supporting a friend through a problem.' },

  { id: 'E1', dimension: 'enterprising', text: 'Leading a group or organizing a project from start to finish.' },
  { id: 'E2', dimension: 'enterprising', text: 'Persuading others or pitching an idea you believe in.' },
  { id: 'E3', dimension: 'enterprising', text: 'Starting something new, like a club, event, or small business idea.' },

  { id: 'C1', dimension: 'conventional', text: 'Organizing information, records, or schedules carefully.' },
  { id: 'C2', dimension: 'conventional', text: 'Following clear steps and procedures to complete a task accurately.' },
  { id: 'C3', dimension: 'conventional', text: 'Working with numbers, spreadsheets, or structured data.' },
];
