import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssessmentMatrixSeedService } from './assessment-matrix-seed.service';
import { AssessmentMatrixEntryEntity } from '../../../../assessment-matrix/entities/assessment-matrix-entry.entity';
import { DisorderRegistryEntity } from '../../../../disorder-registry/entities/disorder-registry.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AssessmentMatrixEntryEntity, DisorderRegistryEntity])],
  providers: [AssessmentMatrixSeedService],
  exports: [AssessmentMatrixSeedService],
})
export class AssessmentMatrixSeedModule {}
