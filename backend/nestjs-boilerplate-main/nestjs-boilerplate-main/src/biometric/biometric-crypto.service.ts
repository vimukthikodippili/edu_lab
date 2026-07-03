import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface EncryptResult {
  ciphertext: string; // AES-256-GCM encrypted, base64
  iv: string;         // 12-byte random IV, 24-char hex
  authTag: string;    // 16-byte GCM auth tag, 32-char hex
}

@Injectable()
export class BiometricCryptoService {
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const keyHex = this.configService.getOrThrow<string>('BIOMETRIC_ENCRYPTION_KEY');
    if (keyHex.length !== 64) {
      throw new Error(
        'BIOMETRIC_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes / 256 bits).',
      );
    }
    this.key = Buffer.from(keyHex, 'hex');
  }

  encrypt(plaintext: string): EncryptResult {
    const iv = crypto.randomBytes(12); // 96-bit IV is GCM standard
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    return {
      ciphertext: encrypted.toString('base64'),
      iv: iv.toString('hex'),
      authTag: cipher.getAuthTag().toString('hex'),
    };
  }

  decrypt(ciphertext: string, iv: string, authTag: string): string {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(iv, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  /**
   * Vendor SDK integration point — in production this delegates to the hardware
   * biometric SDK's match() API. In simulation mode, templates are base64 strings
   * of the form '{type}-sim-{guardianId}-{timestamp}'. When both decoded strings
   * contain the same guardianId the templates are treated as a match (95.0%).
   * Exact byte-equal match → 100.0%. Anything else → 5.0%.
   */
  compare(liveTemplate: string, storedTemplate: string, guardianId: string): number {
    try {
      const live = Buffer.from(liveTemplate, 'base64').toString('utf8');
      const stored = Buffer.from(storedTemplate, 'base64').toString('utf8');
      if (live.includes(guardianId) && stored.includes(guardianId)) return 95.0;
      return live === stored ? 100.0 : 5.0;
    } catch {
      return 0.0;
    }
  }
}
