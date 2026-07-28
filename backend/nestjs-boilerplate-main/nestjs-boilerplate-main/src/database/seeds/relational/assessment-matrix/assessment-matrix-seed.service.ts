import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AssessmentMatrixAgeBand,
  AssessmentMatrixEntryEntity,
} from '../../../../assessment-matrix/entities/assessment-matrix-entry.entity';
import { DisorderRegistryEntity } from '../../../../disorder-registry/entities/disorder-registry.entity';

interface SeedRow {
  code: string;
  bands: Record<AssessmentMatrixAgeBand, boolean>;
}

// SRS Addendum §12.4 Recommended Assessment Matrix — 16 rows. Resolved against the user: the
// source table's "DASS-21" row is a test-instrument name, not a domain; it maps to the Stress
// domain (MHA-DOM-08), the one DASS-21 subscale not already separately represented (Depression
// and Anxiety each have their own rows).
const MATRIX: SeedRow[] = [
  {
    code: 'MHA-DOM-04', // ADHD
    bands: { [AssessmentMatrixAgeBand.BAND_5_8]: true, [AssessmentMatrixAgeBand.BAND_9_12]: true, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true },
  },
  {
    code: 'MHA-DOM-05', // Autism Spectrum Traits
    bands: { [AssessmentMatrixAgeBand.BAND_5_8]: true, [AssessmentMatrixAgeBand.BAND_9_12]: true, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true },
  },
  {
    code: 'MHA-DOM-01', // Dyslexia
    bands: { [AssessmentMatrixAgeBand.BAND_5_8]: true, [AssessmentMatrixAgeBand.BAND_9_12]: true, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true },
  },
  {
    code: 'MHA-DOM-02', // Dysgraphia
    bands: { [AssessmentMatrixAgeBand.BAND_5_8]: true, [AssessmentMatrixAgeBand.BAND_9_12]: true, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true },
  },
  {
    code: 'MHA-DOM-03', // Dyscalculia
    bands: { [AssessmentMatrixAgeBand.BAND_5_8]: true, [AssessmentMatrixAgeBand.BAND_9_12]: true, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true },
  },
  {
    code: 'MHA-DOM-07', // Anxiety
    bands: { [AssessmentMatrixAgeBand.BAND_5_8]: true, [AssessmentMatrixAgeBand.BAND_9_12]: true, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true },
  },
  {
    code: 'MHA-DOM-06', // Depression
    bands: { [AssessmentMatrixAgeBand.BAND_5_8]: false, [AssessmentMatrixAgeBand.BAND_9_12]: true, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true },
  },
  {
    code: 'MHA-DOM-08', // Stress (source row: "DASS-21")
    bands: { [AssessmentMatrixAgeBand.BAND_5_8]: false, [AssessmentMatrixAgeBand.BAND_9_12]: false, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true },
  },
  {
    code: 'MHA-DOM-10', // Social Media Addiction
    bands: { [AssessmentMatrixAgeBand.BAND_5_8]: false, [AssessmentMatrixAgeBand.BAND_9_12]: true, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true },
  },
  {
    code: 'MHA-DOM-11', // Smartphone Addiction
    bands: { [AssessmentMatrixAgeBand.BAND_5_8]: false, [AssessmentMatrixAgeBand.BAND_9_12]: true, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true },
  },
  {
    code: 'MHA-DOM-12', // Gaming Addiction
    bands: { [AssessmentMatrixAgeBand.BAND_5_8]: false, [AssessmentMatrixAgeBand.BAND_9_12]: true, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true },
  },
  {
    code: 'MHA-DOM-13', // Internet Addiction
    bands: { [AssessmentMatrixAgeBand.BAND_5_8]: false, [AssessmentMatrixAgeBand.BAND_9_12]: true, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true },
  },
  {
    code: 'MHA-DOM-17', // Bullying (Victim)
    bands: { [AssessmentMatrixAgeBand.BAND_5_8]: true, [AssessmentMatrixAgeBand.BAND_9_12]: true, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true },
  },
  {
    code: 'MHA-DOM-14', // Academic Burnout
    bands: { [AssessmentMatrixAgeBand.BAND_5_8]: false, [AssessmentMatrixAgeBand.BAND_9_12]: false, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true },
  },
  {
    code: 'MHA-DOM-15', // Exam Anxiety
    bands: { [AssessmentMatrixAgeBand.BAND_5_8]: false, [AssessmentMatrixAgeBand.BAND_9_12]: true, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true },
  },
  {
    code: 'MHA-DOM-20', // Sleep Problems (source row: "Sleep Disorder")
    bands: { [AssessmentMatrixAgeBand.BAND_5_8]: true, [AssessmentMatrixAgeBand.BAND_9_12]: true, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true },
  },
];

@Injectable()
export class AssessmentMatrixSeedService {
  constructor(
    @InjectRepository(AssessmentMatrixEntryEntity)
    private readonly repository: Repository<AssessmentMatrixEntryEntity>,

    @InjectRepository(DisorderRegistryEntity)
    private readonly domainRepository: Repository<DisorderRegistryEntity>,
  ) {}

  async run(): Promise<void> {
    for (const row of MATRIX) {
      const domain = await this.domainRepository.findOne({ where: { code: row.code } });
      if (!domain) {
        // The disorder-registry seed must run first (see run-seed.ts ordering). Fail loudly
        // rather than silently seeding fewer than 64 rows if a code is ever renamed.
        throw new Error(
          `AssessmentMatrixSeedService: no disorder_registry row found for code "${row.code}".`,
        );
      }

      for (const ageBand of Object.values(AssessmentMatrixAgeBand)) {
        const exists = await this.repository.findOne({
          where: { domainId: domain.id, ageBand },
        });
        if (!exists) {
          await this.repository.save(
            this.repository.create({
              domainId: domain.id,
              ageBand,
              recommended: row.bands[ageBand],
            }),
          );
        }
      }
    }
  }
}
