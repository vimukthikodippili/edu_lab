import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  async sendSms(to: string, body: string): Promise<void> {
    this.logger.log(`[SMS → ${to}]: ${body}`);
    // TODO: Replace with Twilio client
    // Requires env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
  }
}
