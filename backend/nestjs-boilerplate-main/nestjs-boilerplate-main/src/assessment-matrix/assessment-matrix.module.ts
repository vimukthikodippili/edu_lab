import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssessmentMatrixEntryEntity } from './entities/assessment-matrix-entry.entity';
import { DisorderRegistryEntity } from '../disorder-registry/entities/disorder-registry.entity';
import { AssessmentMatrixController } from './assessment-matrix.controller';
import { AssessmentMatrixService } from './assessment-matrix.service';

@Module({
  imports: [TypeOrmModule.forFeature([AssessmentMatrixEntryEntity, DisorderRegistryEntity])],
  controllers: [AssessmentMatrixController],
  providers: [AssessmentMatrixService],
  exports: [AssessmentMatrixService],
})
export class AssessmentMatrixModule {}
