import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolSettingsEntity } from './entities/school-settings.entity';
import { SchoolSettingsService } from './school-settings.service';
import { SchoolSettingsController } from './school-settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SchoolSettingsEntity])],
  providers: [SchoolSettingsService],
  controllers: [SchoolSettingsController],
  exports: [SchoolSettingsService],
})
export class SchoolSettingsModule {}
