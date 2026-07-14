import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CounselorNoteCryptoService } from './counselor-note-crypto.service';

const TEST_KEY = '0'.repeat(63) + '1'; // 64 hex chars

describe('CounselorNoteCryptoService', () => {
  let service: CounselorNoteCryptoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CounselorNoteCryptoService,
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue(TEST_KEY) },
        },
      ],
    }).compile();

    service = module.get<CounselorNoteCryptoService>(CounselorNoteCryptoService);
  });

  it('round-trips: decrypting an encrypted plaintext returns the original plaintext', () => {
    const plaintext = 'Discussed exam anxiety strategies and follow-up plan.';
    const { ciphertext, iv, authTag } = service.encrypt(plaintext);

    const decrypted = service.decrypt(ciphertext, iv, authTag);

    expect(decrypted).toBe(plaintext);
  });

  it('never stores the plaintext as-is — ciphertext differs from the original text', () => {
    const plaintext = 'Session notes must never be stored in the clear.';
    const { ciphertext } = service.encrypt(plaintext);

    expect(ciphertext).not.toBe(plaintext);
    expect(ciphertext).not.toContain(plaintext);
  });

  it('produces a different ciphertext and IV on each call, even for identical plaintext', () => {
    const plaintext = 'Same note text.';
    const first = service.encrypt(plaintext);
    const second = service.encrypt(plaintext);

    expect(first.iv).not.toBe(second.iv);
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });

  it('fails to decrypt (auth tag mismatch) if the ciphertext has been tampered with', () => {
    const { iv, authTag } = service.encrypt('original note');
    const tamperedCiphertext = Buffer.from('tampered-data').toString('base64');

    expect(() => service.decrypt(tamperedCiphertext, iv, authTag)).toThrow();
  });
});
