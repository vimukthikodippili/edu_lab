import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DataSource, DataSourceOptions } from 'typeorm';
import { TypeOrmConfigService } from '../../typeorm-config.service';
import { RoleSeedModule } from './role/role-seed.module';
import { StatusSeedModule } from './status/status-seed.module';
import { UserSeedModule } from './user/user-seed.module';
import { GradeSeedModule } from './grade/grade-seed.module';
import { GradeStageSeedModule } from './grade-stage/grade-stage-seed.module';
import { ClassSectionSeedModule } from './class-section/class-section-seed.module';
import { SportTypeSeedModule } from './sport-type/sport-type-seed.module';
import { SportMetricSeedModule } from './sport-metric/sport-metric-seed.module';
import { LabTypeSeedModule } from './lab-type/lab-type-seed.module';
import { EquipmentCategorySeedModule } from './equipment-category/equipment-category-seed.module';
import { StudentSeedModule } from './student/student-seed.module';
import databaseConfig from '../../config/database.config';
import appConfig from '../../../config/app.config';

@Module({
  imports: [
    RoleSeedModule,
    StatusSeedModule,
    UserSeedModule,
    GradeSeedModule,
    GradeStageSeedModule,
    ClassSectionSeedModule,
    SportTypeSeedModule,
    SportMetricSeedModule,
    LabTypeSeedModule,
    EquipmentCategorySeedModule,
    StudentSeedModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, appConfig],
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
      dataSourceFactory: async (options: DataSourceOptions) => {
        return new DataSource(options).initialize();
      },
    }),
  ],
})
export class SeedModule {}
