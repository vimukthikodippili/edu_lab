import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { getMetadataArgsStorage } from 'typeorm';
import { BehavioralObservationsService } from './behavioral-observations.service';
import { BehavioralObservationEntity } from './entities/behavioral-observation.entity';
import { StudentEntity } from '../students/entities/student.entity';

describe('BehavioralObservationEntity — structural non-clinical schema guarantee', () => {
  it('has exactly the safe column set, with no severity/label/category/score/level column of any kind', () => {
    const columnNames = getMetadataArgsStorage()
      .columns.filter((c) => c.target === BehavioralObservationEntity)
      .map((c) => c.propertyName)
      .sort();

    expect(columnNames).toEqual(['authorStaffId', 'createdAt', 'id', 'notes', 'studentId'].sort());

    const forbidden = ['severity', 'label', 'category', 'score', 'level', 'rating', 'risk', 'type'];
    for (const name of columnNames) {
      expect(forbidden).not.toContain(name.toLowerCase());
    }
  });
});

describe('BehavioralObservationsService', () => {
  let service: BehavioralObservationsService;
  let observationRepo: { find: jest.Mock; create: jest.Mock; save: jest.Mock };
  let studentRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    observationRepo = {
      find: jest.fn(),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'obs-1', ...d })),
    };
    studentRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BehavioralObservationsService,
        { provide: getRepositoryToken(BehavioralObservationEntity), useValue: observationRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
      ],
    }).compile();

    service = module.get<BehavioralObservationsService>(BehavioralObservationsService);
  });

  describe('create', () => {
    it('throws NotFoundException when the student does not exist', async () => {
      studentRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create('missing-student', 'teacher-1', 'Seemed withdrawn today.'),
      ).rejects.toThrow(NotFoundException);
      expect(observationRepo.save).not.toHaveBeenCalled();
    });

    it('creates an observation with the author self-derived, on the happy path', async () => {
      studentRepo.findOne.mockResolvedValue({ id: 'student-1' });

      const result = await service.create('student-1', 'teacher-1', 'Seemed withdrawn today.');

      expect(observationRepo.create).toHaveBeenCalledWith({
        studentId: 'student-1',
        authorStaffId: 'teacher-1',
        notes: 'Seemed withdrawn today.',
      });
      expect(result.id).toBe('obs-1');
    });
  });

  describe('findForStudent', () => {
    it('returns observations ordered newest-first', async () => {
      const rows = [{ id: 'obs-2' }, { id: 'obs-1' }];
      observationRepo.find.mockResolvedValue(rows);

      const result = await service.findForStudent('student-1');

      expect(observationRepo.find).toHaveBeenCalledWith({
        where: { studentId: 'student-1' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toBe(rows);
    });
  });
});
