import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { AllConfigType } from '../config/config.type';

export interface EncryptResult {
  ciphertext: string; // AES-256-GCM encrypted, base64
  iv: string; // 12-byte random IV, 24-char hex
  authTag: string; // 16-byte GCM auth tag, 32-char hex
}

// Mirrors BiometricCryptoService's AES-256-GCM shape exactly (src/biometric/biometric-crypto.service.ts),
// but with its own dedicated key — counseling records and biometric templates are different
// confidentiality domains, so a compromised key in one must never expose the other.
@Injectable()
export class CounselorNoteCryptoService {
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService<AllConfigType>) {
    const keyHex = this.configService.getOrThrow('counselorNote.encryptionKey', {
      infer: true,
    });
    this.key = Buffer.from(keyHex, 'hex');
  }

  encrypt(plaintext: string): EncryptResult {
    const iv = crypto.randomBytes(12); // 96-bit IV is GCM standard
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return {
      ciphertext: encrypted.toString('base64'),
      iv: iv.toString('hex'),
      authTag: cipher.getAuthTag().toString('hex'),
    };
  }

  decrypt(ciphertext: string, iv: string, authTag: string): string {
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }
}
