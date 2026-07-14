import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EgressClient,
  EgressStatus,
  EncodedFileOutput,
  S3Upload,
} from 'livekit-server-sdk';
import { AllConfigType } from '../config/config.type';

export interface EgressStatusResult {
  status: 'processing' | 'available' | 'failed';
  url: string | null;
}

@Injectable()
export class LiveKitEgressService {
  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  private assertConfigured(): {
    url: string;
    apiKey: string;
    apiSecret: string;
    s3Bucket: string;
    s3Region: string;
    s3AccessKey: string;
    s3Secret: string;
    s3Endpoint: string | null;
  } {
    const url = this.configService.get('livekit.url', { infer: true });
    const apiKey = this.configService.get('livekit.apiKey', { infer: true });
    const apiSecret = this.configService.get('livekit.apiSecret', { infer: true });
    const s3Bucket = this.configService.get('livekitEgress.s3Bucket', { infer: true });
    const s3Region = this.configService.get('livekitEgress.s3Region', { infer: true });
    const s3AccessKey = this.configService.get('livekitEgress.s3AccessKey', { infer: true });
    const s3Secret = this.configService.get('livekitEgress.s3Secret', { infer: true });
    const s3Endpoint = this.configService.get('livekitEgress.s3Endpoint', { infer: true });

    if (!url || !apiKey || !apiSecret || !s3Bucket || !s3Region || !s3AccessKey || !s3Secret) {
      throw new UnprocessableEntityException(
        'Automatic recording is not configured for this school yet — contact your administrator.',
      );
    }
    return {
      url,
      apiKey,
      apiSecret,
      s3Bucket,
      s3Region,
      s3AccessKey,
      s3Secret,
      s3Endpoint: s3Endpoint ?? null,
    };
  }

  async startRecording(roomName: string): Promise<string> {
    const { url, apiKey, apiSecret, s3Bucket, s3Region, s3AccessKey, s3Secret, s3Endpoint } =
      this.assertConfigured();

    const egressClient = new EgressClient(url, apiKey, apiSecret);
    const output = new EncodedFileOutput({
      filepath: `recordings/${roomName}/{time}.mp4`,
      output: {
        case: 's3',
        value: new S3Upload({
          accessKey: s3AccessKey,
          secret: s3Secret,
          region: s3Region,
          bucket: s3Bucket,
          endpoint: s3Endpoint ?? undefined,
        }),
      },
    });

    const info = await egressClient.startRoomCompositeEgress(roomName, output);
    return info.egressId;
  }

  async stopRecording(egressId: string): Promise<void> {
    const { url, apiKey, apiSecret } = this.assertConfigured();

    const egressClient = new EgressClient(url, apiKey, apiSecret);
    try {
      await egressClient.stopEgress(egressId);
    } catch (err) {
      // Recording may already have stopped (e.g. the room emptied on its own) — the DB-side
      // status transition is the source of truth regardless, so this is not a failure.
      const message = err instanceof Error ? err.message : String(err);
      if (!/not.?found/i.test(message)) {
        throw err;
      }
    }
  }

  async checkStatus(egressId: string): Promise<EgressStatusResult> {
    const { url, apiKey, apiSecret } = this.assertConfigured();

    const egressClient = new EgressClient(url, apiKey, apiSecret);
    const results = await egressClient.listEgress({ egressId });
    const info = results[0];

    if (!info) {
      return { status: 'failed', url: null };
    }
    if (info.status === EgressStatus.EGRESS_COMPLETE) {
      const location = info.fileResults[0]?.location ?? null;
      return { status: location ? 'available' : 'failed', url: location };
    }
    if (info.status === EgressStatus.EGRESS_FAILED) {
      return { status: 'failed', url: null };
    }
    return { status: 'processing', url: null };
  }
}
