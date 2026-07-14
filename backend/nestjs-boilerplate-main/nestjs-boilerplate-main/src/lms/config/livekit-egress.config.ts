import { registerAs } from '@nestjs/config';
import { IsOptional, IsString } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { LiveKitEgressConfig } from './livekit-egress-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsOptional()
  LIVEKIT_EGRESS_S3_BUCKET: string;

  @IsString()
  @IsOptional()
  LIVEKIT_EGRESS_S3_REGION: string;

  @IsString()
  @IsOptional()
  LIVEKIT_EGRESS_S3_ACCESS_KEY: string;

  @IsString()
  @IsOptional()
  LIVEKIT_EGRESS_S3_SECRET: string;

  @IsString()
  @IsOptional()
  LIVEKIT_EGRESS_S3_ENDPOINT: string;
}

export default registerAs<LiveKitEgressConfig>('livekitEgress', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    s3Bucket: process.env.LIVEKIT_EGRESS_S3_BUCKET ?? null,
    s3Region: process.env.LIVEKIT_EGRESS_S3_REGION ?? null,
    s3AccessKey: process.env.LIVEKIT_EGRESS_S3_ACCESS_KEY ?? null,
    s3Secret: process.env.LIVEKIT_EGRESS_S3_SECRET ?? null,
    s3Endpoint: process.env.LIVEKIT_EGRESS_S3_ENDPOINT ?? null,
  };
});
