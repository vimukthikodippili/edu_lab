import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MoodCheckInEntity } from './entities/mood-check-in.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { MoodCheckInService } from './mood-check-in.service';
import { MoodCheckInController } from './mood-check-in.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MoodCheckInEntity, StudentEntity])],
  providers: [MoodCheckInService],
  controllers: [MoodCheckInController],
  exports: [MoodCheckInService],
})
export class MoodCheckInModule {}
