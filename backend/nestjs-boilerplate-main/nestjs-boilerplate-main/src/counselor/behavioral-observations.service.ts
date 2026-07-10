import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BehavioralObservationEntity } from './entities/behavioral-observation.entity';
import { StudentEntity } from '../students/entities/student.entity';

@Injectable()
export class BehavioralObservationsService {
  constructor(
    @InjectRepository(BehavioralObservationEntity)
    private readonly observationRepo: Repository<BehavioralObservationEntity>,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,
  ) {}

  async create(
    studentId: string,
    authorStaffId: string,
    notes: string,
  ): Promise<BehavioralObservationEntity> {
    const student = await this.studentRepo.findOne({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException(`Student with id ${studentId} not found.`);
    }

    return this.observationRepo.save(
      this.observationRepo.create({ studentId, authorStaffId, notes }),
    );
  }

  async findForStudent(studentId: string): Promise<BehavioralObservationEntity[]> {
    return this.observationRepo.find({
      where: { studentId },
      order: { createdAt: 'DESC' },
    });
  }
}
