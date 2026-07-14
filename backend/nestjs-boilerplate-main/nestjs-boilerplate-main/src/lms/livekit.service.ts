import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { AllConfigType } from '../config/config.type';

export interface LiveKitTokenResult {
  token: string;
  url: string;
}

@Injectable()
export class LiveKitService {
  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  private assertConfigured(): { url: string; apiKey: string; apiSecret: string } {
    const url = this.configService.get('livekit.url', { infer: true });
    const apiKey = this.configService.get('livekit.apiKey', { infer: true });
    const apiSecret = this.configService.get('livekit.apiSecret', { infer: true });

    if (!url || !apiKey || !apiSecret) {
      throw new UnprocessableEntityException(
        'Video calling is not configured for this school yet — contact your administrator.',
      );
    }
    return { url, apiKey, apiSecret };
  }

  async mintToken(
    roomName: string,
    identity: string,
    displayName: string,
    canPublishData = false,
  ): Promise<LiveKitTokenResult> {
    const { url, apiKey, apiSecret } = this.assertConfigured();

    const accessToken = new AccessToken(apiKey, apiSecret, {
      identity,
      name: displayName,
      ttl: '4h',
    });
    accessToken.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData,
    });

    const token = await accessToken.toJwt();
    return { token, url };
  }

  async endRoom(roomName: string): Promise<void> {
    const { url, apiKey, apiSecret } = this.assertConfigured();

    const roomService = new RoomServiceClient(url, apiKey, apiSecret);
    try {
      await roomService.deleteRoom(roomName);
    } catch (err) {
      // A room that nobody ever joined doesn't exist on the LiveKit server — the DB-side
      // `endedAt` write is the source of truth regardless, so this is not a failure.
      const message = err instanceof Error ? err.message : String(err);
      if (!/not.?found/i.test(message)) {
        throw err;
      }
    }
  }
}
