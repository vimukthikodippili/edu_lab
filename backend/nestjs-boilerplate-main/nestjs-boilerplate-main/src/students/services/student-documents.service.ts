import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentDocumentEntity, StudentDocumentType } from '../entities/student-document.entity';

@Injectable()
export class StudentDocumentsService {
  constructor(
    @InjectRepository(StudentDocumentEntity)
    private readonly documentRepo: Repository<StudentDocumentEntity>,
  ) {}

  async listForStudent(studentId: string): Promise<StudentDocumentEntity[]> {
    return this.documentRepo.find({
      where: { studentId },
      order: { createdAt: 'DESC' },
    });
  }

  async recordIssued(
    studentId: string,
    type: StudentDocumentType,
    fileId: string,
    issuedByUserId: number | null,
  ): Promise<StudentDocumentEntity> {
    return this.documentRepo.save(
      this.documentRepo.create({ studentId, type, fileId, issuedByUserId }),
    );
  }
}
