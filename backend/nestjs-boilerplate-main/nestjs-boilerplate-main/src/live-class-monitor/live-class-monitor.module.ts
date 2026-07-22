import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimetableEntryEntity } from '../timetable/entities/timetable-entry.entity';
import { ClassCheckInEntity } from '../class-check-in/entities/class-check-in.entity';
import { SchoolSettingsModule } from '../school-settings/school-settings.module';
import { LiveClassMonitorService } from './live-class-monitor.service';
import { LiveClassMonitorController } from './live-class-monitor.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([TimetableEntryEntity, ClassCheckInEntity]),
    SchoolSettingsModule,
  ],
  providers: [LiveClassMonitorService],
  controllers: [LiveClassMonitorController],
  exports: [LiveClassMonitorService],
})
export class LiveClassMonitorModule {}
