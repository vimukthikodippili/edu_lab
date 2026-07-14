import { registerAs } from '@nestjs/config';
import { IsOptional, IsString } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { LiveKitConfig } from './livekit-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsOptional()
  LIVEKIT_URL: string;

  @IsString()
  @IsOptional()
  LIVEKIT_API_KEY: string;

  @IsString()
  @IsOptional()
  LIVEKIT_API_SECRET: string;
}

export default registerAs<LiveKitConfig>('livekit', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    url: process.env.LIVEKIT_URL ?? null,
    apiKey: process.env.LIVEKIT_API_KEY ?? null,
    apiSecret: process.env.LIVEKIT_API_SECRET ?? null,
  };
});
