import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  async sendPush(
    token: string | null,
    title: string,
    body: string,
  ): Promise<void> {
    if (!token) return;
    this.logger.log(`[PUSH → ${token.slice(0, 20)}…] ${title}: ${body}`);
    // TODO: Replace with Firebase Admin SDK
    // Requires env: FIREBASE_SERVICE_ACCOUNT_JSON
  }
}
