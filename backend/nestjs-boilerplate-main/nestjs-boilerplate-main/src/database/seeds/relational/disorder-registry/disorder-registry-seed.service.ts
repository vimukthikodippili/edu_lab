import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DisorderRegistryEntity,
  DisorderSection,
  RiskCategory,
} from '../../../../disorder-registry/entities/disorder-registry.entity';

interface SeedDomain {
  code: string;
  name: string;
  section: DisorderSection;
  riskCategory: RiskCategory;
  ageMin: number;
  ageMax: number;
  symptoms: string[];
  tests: string[];
  safetyFlag?: boolean;
}

// All 21 screening domains from SRS Addendum — Module 12 §12.3. `symptoms` are plain, publicly
// known descriptive keywords (not a clinical instrument's scored items) — this table defines the
// domain, it never labels a student. Only Depression carries the SRS's ⚑ safety flag.
const DOMAINS: SeedDomain[] = [
  {
    code: 'MHA-DOM-01',
    name: 'Dyslexia (Reading Disorder)',
    section: DisorderSection.EDUCATIONAL_DISORDERS,
    riskCategory: RiskCategory.LEARNING_DISABILITY_RISK,
    ageMin: 7,
    ageMax: 18,
    symptoms: ['difficulty decoding words', 'slow reading pace', 'frequent letter reversals', 'poor spelling'],
    tests: ['Dyslexia Screening Test', 'Reading Fluency Assessment', 'Word Recognition Test'],
  },
  {
    code: 'MHA-DOM-02',
    name: 'Dysgraphia (Writing Disorder)',
    section: DisorderSection.EDUCATIONAL_DISORDERS,
    riskCategory: RiskCategory.LEARNING_DISABILITY_RISK,
    ageMin: 7,
    ageMax: 18,
    symptoms: ['illegible handwriting', 'difficulty organizing thoughts on paper', 'inconsistent letter spacing', 'slow writing speed'],
    tests: ['Writing Skills Assessment', 'Written Expression Assessment'],
  },
  {
    code: 'MHA-DOM-03',
    name: 'Dyscalculia (Mathematics Disorder)',
    section: DisorderSection.EDUCATIONAL_DISORDERS,
    riskCategory: RiskCategory.LEARNING_DISABILITY_RISK,
    ageMin: 7,
    ageMax: 18,
    symptoms: ['difficulty with number sense', 'trouble with basic arithmetic', 'confusion with math symbols', 'difficulty telling time'],
    tests: ['Numerical Skills Assessment', 'Math Achievement Test'],
  },
  {
    code: 'MHA-DOM-04',
    name: 'ADHD',
    section: DisorderSection.EDUCATIONAL_DISORDERS,
    riskCategory: RiskCategory.BEHAVIORAL_RISK,
    ageMin: 5,
    ageMax: 18,
    symptoms: ['inattention', 'hyperactivity', 'impulsivity', 'difficulty following instructions', 'easily distracted'],
    tests: ['Vanderbilt ADHD Assessment', 'Conners Rating Scale', 'Teacher Observation Form'],
  },
  {
    code: 'MHA-DOM-05',
    name: 'Autism Spectrum Traits',
    section: DisorderSection.EDUCATIONAL_DISORDERS,
    riskCategory: RiskCategory.BEHAVIORAL_RISK,
    ageMin: 4,
    ageMax: 18,
    symptoms: ['difficulty with social communication', 'repetitive behaviors', 'strong preference for routine', 'sensory sensitivities'],
    tests: ['Autism Screening Questionnaire', 'Social Communication Assessment'],
  },
  {
    code: 'MHA-DOM-06',
    name: 'Depression',
    section: DisorderSection.EMOTIONAL_MENTAL_HEALTH,
    riskCategory: RiskCategory.EMOTIONAL_RISK,
    ageMin: 12,
    ageMax: 19,
    symptoms: ['persistent sadness', 'loss of interest in activities', 'fatigue', 'changes in appetite or sleep', 'withdrawal from peers'],
    tests: ['DASS-21', 'PHQ-A (Adolescent Depression)'],
    safetyFlag: true,
  },
  {
    code: 'MHA-DOM-07',
    name: 'Anxiety',
    section: DisorderSection.EMOTIONAL_MENTAL_HEALTH,
    riskCategory: RiskCategory.EMOTIONAL_RISK,
    ageMin: 9,
    ageMax: 19,
    symptoms: ['excessive worry', 'restlessness', 'difficulty concentrating', 'physical tension', 'avoidance of feared situations'],
    tests: ['DASS-21 Anxiety Scale', 'GAD-7'],
  },
  {
    code: 'MHA-DOM-08',
    name: 'Stress',
    section: DisorderSection.EMOTIONAL_MENTAL_HEALTH,
    riskCategory: RiskCategory.EMOTIONAL_RISK,
    ageMin: 12,
    ageMax: 19,
    symptoms: ['irritability', 'difficulty relaxing', 'physical tension', 'trouble sleeping', 'feeling overwhelmed'],
    tests: ['DASS-21 Stress Scale'],
  },
  {
    code: 'MHA-DOM-09',
    name: 'Social Anxiety',
    section: DisorderSection.EMOTIONAL_MENTAL_HEALTH,
    riskCategory: RiskCategory.EMOTIONAL_RISK,
    ageMin: 10,
    ageMax: 19,
    symptoms: ['fear of social situations', 'avoidance of speaking in class', 'physical symptoms before social events', 'excessive self-consciousness'],
    tests: ['Social Anxiety Questionnaire'],
  },
  {
    code: 'MHA-DOM-10',
    name: 'Social Media Addiction',
    section: DisorderSection.ADDICTION_ASSESSMENTS,
    riskCategory: RiskCategory.ADDICTION_RISK,
    ageMin: 10,
    ageMax: 19,
    symptoms: ['compulsive checking of social media', 'distress when unable to access it', 'neglect of responsibilities', 'preoccupation with likes/comments'],
    tests: ['Bergen Social Media Addiction Scale (BSMAS)'],
  },
  {
    code: 'MHA-DOM-11',
    name: 'Smartphone Addiction',
    section: DisorderSection.ADDICTION_ASSESSMENTS,
    riskCategory: RiskCategory.ADDICTION_RISK,
    ageMin: 10,
    ageMax: 19,
    symptoms: ['excessive phone use', 'anxiety when phone is unavailable', 'using phone late into the night', 'difficulty limiting use'],
    tests: ['Smartphone Addiction Scale (SAS)'],
  },
  {
    code: 'MHA-DOM-12',
    name: 'Gaming Addiction',
    section: DisorderSection.ADDICTION_ASSESSMENTS,
    riskCategory: RiskCategory.ADDICTION_RISK,
    ageMin: 10,
    ageMax: 19,
    symptoms: ['preoccupation with gaming', 'gaming despite negative consequences', 'loss of interest in other activities', 'irritability when unable to play'],
    tests: ['Internet Gaming Disorder Scale (IGDS)'],
  },
  {
    code: 'MHA-DOM-13',
    name: 'Internet Addiction',
    section: DisorderSection.ADDICTION_ASSESSMENTS,
    riskCategory: RiskCategory.ADDICTION_RISK,
    ageMin: 10,
    ageMax: 19,
    symptoms: ['excessive time online', 'neglect of offline responsibilities', 'withdrawal symptoms when offline', 'loss of time awareness while online'],
    tests: ['Young Internet Addiction Test (IAT)'],
  },
  {
    code: 'MHA-DOM-14',
    name: 'Academic Burnout',
    section: DisorderSection.SCHOOL_ACADEMIC_PROBLEMS,
    riskCategory: RiskCategory.ACADEMIC_RISK,
    ageMin: 13,
    ageMax: 19,
    symptoms: ['exhaustion related to schoolwork', 'cynicism or detachment from studies', 'reduced sense of academic efficacy', 'declining motivation'],
    tests: ['Student Burnout Inventory'],
  },
  {
    code: 'MHA-DOM-15',
    name: 'Exam Anxiety',
    section: DisorderSection.SCHOOL_ACADEMIC_PROBLEMS,
    riskCategory: RiskCategory.ACADEMIC_RISK,
    ageMin: 10,
    ageMax: 19,
    symptoms: ['excessive worry before tests', 'physical symptoms during exams', 'difficulty recalling known material under pressure', 'avoidance of test-related situations'],
    tests: ['Test Anxiety Inventory'],
  },
  {
    code: 'MHA-DOM-16',
    name: 'School Refusal',
    section: DisorderSection.SCHOOL_ACADEMIC_PROBLEMS,
    riskCategory: RiskCategory.ACADEMIC_RISK,
    ageMin: 6,
    ageMax: 16,
    symptoms: ['reluctance or refusal to attend school', 'physical complaints on school days', 'excessive absences', 'distress about separation from caregivers'],
    tests: ['School Refusal Assessment Scale'],
  },
  {
    code: 'MHA-DOM-17',
    name: 'Bullying (Victim)',
    section: DisorderSection.SOCIAL_PROBLEMS,
    riskCategory: RiskCategory.SOCIAL_RISK,
    ageMin: 7,
    ageMax: 19,
    symptoms: ['unexplained injuries or lost belongings', 'reluctance to attend school', 'drop in academic performance', 'withdrawal from friends'],
    tests: ['Bullying Experience Questionnaire'],
  },
  {
    code: 'MHA-DOM-18',
    name: 'Peer Pressure',
    section: DisorderSection.SOCIAL_PROBLEMS,
    riskCategory: RiskCategory.SOCIAL_RISK,
    ageMin: 10,
    ageMax: 19,
    symptoms: ['difficulty resisting group influence', 'behavior change around certain peers', 'anxiety about peer acceptance', 'uncharacteristic risk-taking'],
    tests: ['Peer Relations Scale'],
  },
  {
    code: 'MHA-DOM-19',
    name: 'Social Isolation',
    section: DisorderSection.SOCIAL_PROBLEMS,
    riskCategory: RiskCategory.SOCIAL_RISK,
    ageMin: 10,
    ageMax: 19,
    symptoms: ['eating alone', 'few or no close friendships', 'reluctance to participate in group activities', 'spending most free time alone'],
    tests: ['Social Connectedness Scale'],
  },
  {
    code: 'MHA-DOM-20',
    name: 'Sleep Problems',
    section: DisorderSection.LIFESTYLE_ASSESSMENTS,
    riskCategory: RiskCategory.HEALTH_LIFESTYLE_RISK,
    ageMin: 10,
    ageMax: 19,
    symptoms: ['difficulty falling or staying asleep', 'daytime fatigue', 'irregular sleep schedule', 'irritability due to poor sleep'],
    tests: ['Pittsburgh Sleep Quality Index (adapted)'],
  },
  {
    code: 'MHA-DOM-21',
    name: 'Physical Activity (Low)',
    section: DisorderSection.LIFESTYLE_ASSESSMENTS,
    riskCategory: RiskCategory.HEALTH_LIFESTYLE_RISK,
    ageMin: 6,
    ageMax: 19,
    symptoms: ['low participation in physical activities', 'preference for sedentary activities', 'low physical stamina', 'reluctance to join sports/PE'],
    tests: ['Youth Physical Activity Questionnaire'],
  },
];

@Injectable()
export class DisorderRegistrySeedService {
  constructor(
    @InjectRepository(DisorderRegistryEntity)
    private readonly repository: Repository<DisorderRegistryEntity>,
  ) {}

  async run(): Promise<void> {
    for (const domain of DOMAINS) {
      const exists = await this.repository.findOne({ where: { code: domain.code } });
      if (!exists) {
        await this.repository.save(
          this.repository.create({
            code: domain.code,
            name: domain.name,
            section: domain.section,
            riskCategory: domain.riskCategory,
            ageMin: domain.ageMin,
            ageMax: domain.ageMax,
            symptoms: domain.symptoms,
            tests: domain.tests,
            safetyFlag: domain.safetyFlag ?? false,
          }),
        );
      }
    }
  }
}
