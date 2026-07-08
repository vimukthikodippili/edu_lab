import { registerAs } from '@nestjs/config';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { GradeTrendConfig } from './grade-trend-config.type';

class EnvironmentVariablesValidator {
  @IsInt()
  @Min(2)
  @Max(20)
  @IsOptional()
  GRADE_TREND_WINDOW_SIZE: number;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  GRADE_TREND_DROP_THRESHOLD: number;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  GRADE_TREND_ATTENDANCE_DROP_THRESHOLD: number;
}

export default registerAs<GradeTrendConfig>('gradeTrend', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    windowSize: process.env.GRADE_TREND_WINDOW_SIZE
      ? parseInt(process.env.GRADE_TREND_WINDOW_SIZE, 10)
      : 3,
    dropThreshold: process.env.GRADE_TREND_DROP_THRESHOLD
      ? parseInt(process.env.GRADE_TREND_DROP_THRESHOLD, 10)
      : 5,
    attendanceDropThreshold: process.env.GRADE_TREND_ATTENDANCE_DROP_THRESHOLD
      ? parseInt(process.env.GRADE_TREND_ATTENDANCE_DROP_THRESHOLD, 10)
      : 15,
  };
});
