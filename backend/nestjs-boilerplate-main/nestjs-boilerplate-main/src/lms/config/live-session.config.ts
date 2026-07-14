import { registerAs } from '@nestjs/config';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { LiveSessionConfig } from './live-session-config.type';

class EnvironmentVariablesValidator {
  @IsInt()
  @Min(1)
  @Max(60)
  @IsOptional()
  LIVE_SESSION_JOIN_WINDOW_MINUTES: number;
}

export default registerAs<LiveSessionConfig>('liveSession', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    joinWindowMinutes: process.env.LIVE_SESSION_JOIN_WINDOW_MINUTES
      ? parseInt(process.env.LIVE_SESSION_JOIN_WINDOW_MINUTES, 10)
      : 10,
  };
});
