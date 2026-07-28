import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MhaSessionEntity } from '../mha-session/entities/mha-session.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { MhaCaseloadService } from './mha-caseload.service';

@Module({
  imports: [TypeOrmModule.forFeature([MhaSessionEntity, StudentEntity])],
  providers: [MhaCaseloadService],
  exports: [MhaCaseloadService],
})
export class MhaCaseloadModule {}
