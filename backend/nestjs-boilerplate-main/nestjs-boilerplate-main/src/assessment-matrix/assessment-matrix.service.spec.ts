import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { AssessmentMatrixService } from './assessment-matrix.service';
import { AssessmentMatrixAgeBand, AssessmentMatrixEntryEntity } from './entities/assessment-matrix-entry.entity';
import { DisorderRegistryEntity, DisorderSection, RiskCategory } from '../disorder-registry/entities/disorder-registry.entity';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
});

function domain(id: string, code: string, name: string): DisorderRegistryEntity {
  return {
    id,
    code,
    name,
    section: DisorderSection.EDUCATIONAL_DISORDERS,
    riskCategory: RiskCategory.BEHAVIORAL_RISK,
    ageMin: 4,
    ageMax: 19,
    symptoms: [],
    tests: [],
    safetyFlag: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Mirrors the seed's resolved 16-row × 4-band mapping (DASS-21 row -> Stress / MHA-DOM-08).
const ROW_DEFS: { code: string; name: string; bands: Record<AssessmentMatrixAgeBand, boolean> }[] = [
  { code: 'MHA-DOM-04', name: 'ADHD', bands: { [AssessmentMatrixAgeBand.BAND_5_8]: true, [AssessmentMatrixAgeBand.BAND_9_12]: true, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true } },
  { code: 'MHA-DOM-05', name: 'Autism Spectrum Traits', bands: { [AssessmentMatrixAgeBand.BAND_5_8]: true, [AssessmentMatrixAgeBand.BAND_9_12]: true, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true } },
  { code: 'MHA-DOM-01', name: 'Dyslexia', bands: { [AssessmentMatrixAgeBand.BAND_5_8]: true, [AssessmentMatrixAgeBand.BAND_9_12]: true, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true } },
  { code: 'MHA-DOM-02', name: 'Dysgraphia', bands: { [AssessmentMatrixAgeBand.BAND_5_8]: true, [AssessmentMatrixAgeBand.BAND_9_12]: true, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true } },
  { code: 'MHA-DOM-03', name: 'Dyscalculia', bands: { [AssessmentMatrixAgeBand.BAND_5_8]: true, [AssessmentMatrixAgeBand.BAND_9_12]: true, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true } },
  { code: 'MHA-DOM-07', name: 'Anxiety', bands: { [AssessmentMatrixAgeBand.BAND_5_8]: true, [AssessmentMatrixAgeBand.BAND_9_12]: true, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true } },
  { code: 'MHA-DOM-06', name: 'Depression', bands: { [AssessmentMatrixAgeBand.BAND_5_8]: false, [AssessmentMatrixAgeBand.BAND_9_12]: true, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true } },
  { code: 'MHA-DOM-08', name: 'Stress', bands: { [AssessmentMatrixAgeBand.BAND_5_8]: false, [AssessmentMatrixAgeBand.BAND_9_12]: false, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true } },
  { code: 'MHA-DOM-10', name: 'Social Media Addiction', bands: { [AssessmentMatrixAgeBand.BAND_5_8]: false, [AssessmentMatrixAgeBand.BAND_9_12]: true, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true } },
  { code: 'MHA-DOM-11', name: 'Smartphone Addiction', bands: { [AssessmentMatrixAgeBand.BAND_5_8]: false, [AssessmentMatrixAgeBand.BAND_9_12]: true, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true } },
  { code: 'MHA-DOM-12', name: 'Gaming Addiction', bands: { [AssessmentMatrixAgeBand.BAND_5_8]: false, [AssessmentMatrixAgeBand.BAND_9_12]: true, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true } },
  { code: 'MHA-DOM-13', name: 'Internet Addiction', bands: { [AssessmentMatrixAgeBand.BAND_5_8]: false, [AssessmentMatrixAgeBand.BAND_9_12]: true, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true } },
  { code: 'MHA-DOM-17', name: 'Bullying (Victim)', bands: { [AssessmentMatrixAgeBand.BAND_5_8]: true, [AssessmentMatrixAgeBand.BAND_9_12]: true, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true } },
  { code: 'MHA-DOM-14', name: 'Academic Burnout', bands: { [AssessmentMatrixAgeBand.BAND_5_8]: false, [AssessmentMatrixAgeBand.BAND_9_12]: false, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true } },
  { code: 'MHA-DOM-15', name: 'Exam Anxiety', bands: { [AssessmentMatrixAgeBand.BAND_5_8]: false, [AssessmentMatrixAgeBand.BAND_9_12]: true, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true } },
  { code: 'MHA-DOM-20', name: 'Sleep Problems', bands: { [AssessmentMatrixAgeBand.BAND_5_8]: true, [AssessmentMatrixAgeBand.BAND_9_12]: true, [AssessmentMatrixAgeBand.BAND_13_15]: true, [AssessmentMatrixAgeBand.BAND_16_19]: true } },
];

function buildMockEntries(): AssessmentMatrixEntryEntity[] {
  const entries: AssessmentMatrixEntryEntity[] = [];
  for (const row of ROW_DEFS) {
    const d = domain(`domain-${row.code}`, row.code, row.name);
    for (const ageBand of Object.values(AssessmentMatrixAgeBand)) {
      entries.push({
        id: `${row.code}-${ageBand}`,
        domainId: d.id,
        domain: d,
        ageBand,
        recommended: row.bands[ageBand],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as AssessmentMatrixEntryEntity);
    }
  }
  return entries;
}

describe('AssessmentMatrixService', () => {
  let service: AssessmentMatrixService;
  let repo: MockRepo<AssessmentMatrixEntryEntity>;

  beforeEach(async () => {
    repo = repoMock<AssessmentMatrixEntryEntity>();
    repo.find!.mockResolvedValue(buildMockEntries());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentMatrixService,
        { provide: getRepositoryToken(AssessmentMatrixEntryEntity), useValue: repo },
      ],
    }).compile();

    service = module.get<AssessmentMatrixService>(AssessmentMatrixService);
  });

  it('queries with the domain relation populated', async () => {
    await service.getMatrix();
    expect(repo.find).toHaveBeenCalledWith({ relations: ['domain'] });
  });

  it('returns exactly 16 domain rows, each with exactly 4 band keys (16×4 = 64 total cells) — AI-prompt-mandated test', async () => {
    const rows = await service.getMatrix();
    expect(rows).toHaveLength(16);
    let totalCells = 0;
    for (const row of rows) {
      const bandKeys = Object.keys(row.bands);
      expect(bandKeys).toHaveLength(4);
      totalCells += bandKeys.length;
    }
    expect(totalCells).toBe(64);
  });

  it('sorts rows by domainCode ascending', async () => {
    const rows = await service.getMatrix();
    const codes = rows.map((r) => r.domainCode);
    expect(codes).toEqual([...codes].sort((a, b) => a.localeCompare(b)));
  });

  it('ADHD (MHA-DOM-04) is recommended across all 4 age bands', async () => {
    const rows = await service.getMatrix();
    const adhd = rows.find((r) => r.domainCode === 'MHA-DOM-04');
    expect(adhd?.bands).toEqual({ '5_8': true, '9_12': true, '13_15': true, '16_19': true });
  });

  it('Academic Burnout (MHA-DOM-14) is only recommended for 13-15 and 16-19', async () => {
    const rows = await service.getMatrix();
    const burnout = rows.find((r) => r.domainCode === 'MHA-DOM-14');
    expect(burnout?.bands).toEqual({ '5_8': false, '9_12': false, '13_15': true, '16_19': true });
  });

  it('Stress (MHA-DOM-08, the resolved "DASS-21" row) is only recommended for 13-15 and 16-19', async () => {
    const rows = await service.getMatrix();
    const stress = rows.find((r) => r.domainCode === 'MHA-DOM-08');
    expect(stress?.bands).toEqual({ '5_8': false, '9_12': false, '13_15': true, '16_19': true });
  });

  it('exportPdf() resolves to a non-empty Buffer starting with the PDF magic bytes', async () => {
    const buffer = await service.exportPdf();
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 4).toString('utf-8')).toBe('%PDF');
  });
});
