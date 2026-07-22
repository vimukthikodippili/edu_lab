import { registerAs } from '@nestjs/config';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { SportsAnalysisConfig } from './sports-analysis-config.type';

class EnvironmentVariablesValidator {
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  SPORTS_YOY_THRESHOLD_PERCENT: number;
}

export default registerAs<SportsAnalysisConfig>('sportsAnalysis', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    yoyThresholdPercent: process.env.SPORTS_YOY_THRESHOLD_PERCENT
      ? parseInt(process.env.SPORTS_YOY_THRESHOLD_PERCENT, 10)
      : 10,
  };
});
