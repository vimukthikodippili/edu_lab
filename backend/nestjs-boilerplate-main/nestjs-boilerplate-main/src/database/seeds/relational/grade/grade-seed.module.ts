import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GradeSeedService } from './grade-seed.service';
import { GradeEntity } from '../../../../students/entities/grade.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GradeEntity])],
  providers: [GradeSeedService],
  exports: [GradeSeedService],
})
export class GradeSeedModule {}
