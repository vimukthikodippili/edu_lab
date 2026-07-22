import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GradeStageSeedService } from './grade-stage-seed.service';
import { GradeStageEntity } from '../../../../students/entities/grade-stage.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GradeStageEntity])],
  providers: [GradeStageSeedService],
  exports: [GradeStageSeedService],
})
export class GradeStageSeedModule {}
