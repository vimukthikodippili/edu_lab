import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassCheckInEntity } from './entities/class-check-in.entity';
import { TimetableEntryEntity } from '../timetable/entities/timetable-entry.entity';
import { ClassRoomEntity } from '../class-rooms/entities/class-room.entity';
import { ClassCheckInService } from './class-check-in.service';
import { ClassCheckInHandler } from './class-check-in.handler';
import { ClassCheckInController } from './class-check-in.controller';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClassCheckInEntity,
      TimetableEntryEntity,
      ClassRoomEntity,
    ]),
    UsersModule,
    StaffModule,
  ],
  providers: [ClassCheckInService, ClassCheckInHandler],
  controllers: [ClassCheckInController],
  exports: [ClassCheckInService],
})
export class ClassCheckInModule {}
