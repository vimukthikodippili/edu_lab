import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CareerAssessmentEntity } from './entities/career-assessment.entity';
import { CareerAssessmentService } from './career.service';
import { CareerController } from './career.controller';

// Deliberately the ONLY import here is this module's own entity — no UsersModule,
// StudentsModule, StaffModule, or anything else. See career-isolation.spec.ts.
@Module({
  imports: [TypeOrmModule.forFeature([CareerAssessmentEntity])],
  providers: [CareerAssessmentService],
  controllers: [CareerController],
  exports: [CareerAssessmentService],
})
export class CareerModule {}
