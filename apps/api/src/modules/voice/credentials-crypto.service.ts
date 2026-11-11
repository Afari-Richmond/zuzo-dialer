import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EncryptedPayload {
  iv: string;
  authTag: string;
  ciphertext: string;
}

/**
 * Single master key for v1 (CREDENTIALS_ENCRYPTION_KEY) — per-tenant KMS
 * envelope keys are a hardening step for later, once there are enough
 * tenants to justify the extra infrastructure. Whatever secret is
 * configured gets hashed down to a stable 32-byte AES-256 key, so any
 * non-empty string works as the env value (no strict base64 parsing).
 */
@Injectable()
export class CredentialsCryptoService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const secret = config.get<string>('CREDENTIALS_ENCRYPTION_KEY');
    if (!secret) throw new Error('CREDENTIALS_ENCRYPTION_KEY is not set');
    this.key = createHash('sha256').update(secret).digest();
  }

  encrypt(plaintext: string): EncryptedPayload {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return {
      iv: iv.toString('hex'),
      authTag: cipher.getAuthTag().toString('hex'),
      ciphertext: ciphertext.toString('hex'),
    };
  }

  decrypt(payload: EncryptedPayload): string {
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(payload.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(payload.authTag, 'hex'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, 'hex')),
      decipher.final(),
    ]);
    return plaintext.toString('utf8');
  }
}
