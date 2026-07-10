import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentYearEndNoteEntity } from './entities/student-year-end-note.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { StudentNotesService } from './student-notes.service';
import { StudentNotesController } from './student-notes.controller';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StudentYearEndNoteEntity, StudentEntity]),
    UsersModule,
    StaffModule,
  ],
  providers: [StudentNotesService],
  controllers: [StudentNotesController],
  exports: [StudentNotesService],
})
export class StudentNotesModule {}
