import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolCalendarConfigEntity } from './entities/school-calendar-config.entity';
import { SchoolCalendarConfigService } from './school-calendar-config.service';
import { SchoolCalendarConfigController } from './school-calendar-config.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SchoolCalendarConfigEntity])],
  providers: [SchoolCalendarConfigService],
  controllers: [SchoolCalendarConfigController],
  exports: [SchoolCalendarConfigService],
})
export class SchoolCalendarConfigModule {}
