import { registerAs } from '@nestjs/config';
import { IsString, Length } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { DomainResultNoteConfig } from './domain-result-note-config.type';

class EnvironmentVariablesValidator {
  // 64 hex characters = 32 bytes / 256 bits, for AES-256-GCM. No default — a
  // confidential-record encryption key must be explicitly provisioned per deployment,
  // never silently fall back to a shared/guessable value.
  @IsString()
  @Length(64, 64)
  DOMAIN_RESULT_NOTE_ENCRYPTION_KEY: string;
}

export default registerAs<DomainResultNoteConfig>('domainResultNote', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    encryptionKey: process.env.DOMAIN_RESULT_NOTE_ENCRYPTION_KEY as string,
  };
});
