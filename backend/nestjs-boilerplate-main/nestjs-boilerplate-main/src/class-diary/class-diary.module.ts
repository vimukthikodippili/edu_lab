import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassDiaryEntryEntity } from './entities/class-diary-entry.entity';
import { TimetableEntryEntity } from '../timetable/entities/timetable-entry.entity';
import { SchoolHolidayEntity } from '../attendance/entities/school-holiday.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';
import { ClassDiaryService } from './class-diary.service';
import { ClassDiaryController } from './class-diary.controller';
import { NotificationModule } from '../notification/notification.module';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClassDiaryEntryEntity,
      TimetableEntryEntity,
      SchoolHolidayEntity,
      FileEntity,
    ]),
    NotificationModule,
    UsersModule,
    StaffModule,
  ],
  providers: [ClassDiaryService],
  controllers: [ClassDiaryController],
  exports: [ClassDiaryService],
})
export class ClassDiaryModule {}
