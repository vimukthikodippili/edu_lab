import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassSectionSeedService } from './class-section-seed.service';
import { ClassSectionEntity } from '../../../../students/entities/class-section.entity';
import { GradeEntity } from '../../../../students/entities/grade.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ClassSectionEntity, GradeEntity])],
  providers: [ClassSectionSeedService],
  exports: [ClassSectionSeedService],
})
export class ClassSectionSeedModule {}
