import { registerAs } from '@nestjs/config';
import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { FreePeriodConfig } from './free-period-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'FREE_PERIOD_SCHOOL_START_TIME must be in HH:mm 24-hour format',
  })
  @IsOptional()
  FREE_PERIOD_SCHOOL_START_TIME: string;

  @IsInt()
  @Min(1)
  @Max(180)
  @IsOptional()
  FREE_PERIOD_PERIOD_DURATION_MINUTES: number;
}

export default registerAs<FreePeriodConfig>('freePeriod', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    schoolStartTime: process.env.FREE_PERIOD_SCHOOL_START_TIME ?? '07:30',
    periodDurationMinutes: process.env.FREE_PERIOD_PERIOD_DURATION_MINUTES
      ? parseInt(process.env.FREE_PERIOD_PERIOD_DURATION_MINUTES, 10)
      : 40,
  };
});
