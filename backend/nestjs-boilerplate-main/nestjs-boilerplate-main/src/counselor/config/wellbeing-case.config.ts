import { registerAs } from '@nestjs/config';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { WellbeingCaseConfig } from './wellbeing-case-config.type';

class EnvironmentVariablesValidator {
  @IsInt()
  @Min(1)
  @Max(60)
  @IsOptional()
  WELLBEING_CASE_LOOKBACK_DAYS: number;

  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  WELLBEING_CASE_OBSERVATION_THRESHOLD: number;

  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  WELLBEING_CASE_LOW_MOOD_THRESHOLD: number;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  WELLBEING_CASE_LOW_MOOD_MAX_VALUE: number;
}

export default registerAs<WellbeingCaseConfig>('wellbeingCase', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    lookbackDays: process.env.WELLBEING_CASE_LOOKBACK_DAYS
      ? parseInt(process.env.WELLBEING_CASE_LOOKBACK_DAYS, 10)
      : 7,
    observationThreshold: process.env.WELLBEING_CASE_OBSERVATION_THRESHOLD
      ? parseInt(process.env.WELLBEING_CASE_OBSERVATION_THRESHOLD, 10)
      : 3,
    lowMoodThreshold: process.env.WELLBEING_CASE_LOW_MOOD_THRESHOLD
      ? parseInt(process.env.WELLBEING_CASE_LOW_MOOD_THRESHOLD, 10)
      : 3,
    lowMoodMaxValue: process.env.WELLBEING_CASE_LOW_MOOD_MAX_VALUE
      ? parseInt(process.env.WELLBEING_CASE_LOW_MOOD_MAX_VALUE, 10)
      : 2,
  };
});
