import { registerAs } from '@nestjs/config';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { TeacherPerformanceConfig } from './teacher-performance-config.type';

class EnvironmentVariablesValidator {
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  TEACHER_PERFORMANCE_PASS_MARK_PERCENT: number;

  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  TEACHER_PERFORMANCE_BEHIND_SCHEDULE_CONSECUTIVE_PERIODS: number;
}

export default registerAs<TeacherPerformanceConfig>('teacherPerformance', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    passMarkPercent: process.env.TEACHER_PERFORMANCE_PASS_MARK_PERCENT
      ? parseInt(process.env.TEACHER_PERFORMANCE_PASS_MARK_PERCENT, 10)
      : 40,
    behindScheduleConsecutivePeriods: process.env.TEACHER_PERFORMANCE_BEHIND_SCHEDULE_CONSECUTIVE_PERIODS
      ? parseInt(process.env.TEACHER_PERFORMANCE_BEHIND_SCHEDULE_CONSECUTIVE_PERIODS, 10)
      : 2,
  };
});
