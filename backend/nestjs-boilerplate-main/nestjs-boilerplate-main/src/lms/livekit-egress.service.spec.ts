import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnprocessableEntityException } from '@nestjs/common';
import { LiveKitEgressService } from './livekit-egress.service';

const mockStartRoomCompositeEgress = jest.fn();
const mockStopEgress = jest.fn();
const mockListEgress = jest.fn();

jest.mock('livekit-server-sdk', () => ({
  EgressClient: jest.fn().mockImplementation(() => ({
    startRoomCompositeEgress: mockStartRoomCompositeEgress,
    stopEgress: mockStopEgress,
    listEgress: mockListEgress,
  })),
  EgressStatus: {
    EGRESS_STARTING: 0,
    EGRESS_ACTIVE: 1,
    EGRESS_ENDING: 2,
    EGRESS_COMPLETE: 3,
    EGRESS_FAILED: 4,
  },
  EncodedFileOutput: jest.fn().mockImplementation((opts) => opts),
  S3Upload: jest.fn().mockImplementation((opts) => opts),
}));

describe('LiveKitEgressService', () => {
  let service: LiveKitEgressService;
  let configService: { get: jest.Mock };

  const CONFIGURED_MAP: Record<string, unknown> = {
    'livekit.url': 'wss://example.livekit.cloud',
    'livekit.apiKey': 'test-api-key',
    'livekit.apiSecret': 'test-api-secret',
    'livekitEgress.s3Bucket': 'recordings-bucket',
    'livekitEgress.s3Region': 'us-east-1',
    'livekitEgress.s3AccessKey': 'test-s3-access-key',
    'livekitEgress.s3Secret': 'test-s3-secret',
    'livekitEgress.s3Endpoint': null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    configService = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveKitEgressService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<LiveKitEgressService>(LiveKitEgressService);
  });

  describe('when egress is not configured (real state until both credential sets are added)', () => {
    it('startRecording throws UnprocessableEntityException', async () => {
      configService.get.mockReturnValue(undefined);

      await expect(service.startRecording('room-1')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('stopRecording throws UnprocessableEntityException', async () => {
      configService.get.mockReturnValue(undefined);

      await expect(service.stopRecording('egress-1')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('checkStatus throws UnprocessableEntityException', async () => {
      configService.get.mockReturnValue(undefined);

      await expect(service.checkStatus('egress-1')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws when the LiveKit connection is configured but the S3 bucket is not', async () => {
      configService.get.mockImplementation((key: string) =>
        key.startsWith('livekit.') ? CONFIGURED_MAP[key] : undefined,
      );

      await expect(service.startRecording('room-1')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });

  describe('when fully configured', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => CONFIGURED_MAP[key]);
    });

    it('starts room composite egress with an S3 output and returns the egressId', async () => {
      mockStartRoomCompositeEgress.mockResolvedValue({ egressId: 'egress-1' });

      const egressId = await service.startRecording('room-1');

      expect(egressId).toBe('egress-1');
      expect(mockStartRoomCompositeEgress).toHaveBeenCalledWith(
        'room-1',
        expect.objectContaining({
          output: expect.objectContaining({
            case: 's3',
            value: expect.objectContaining({
              accessKey: 'test-s3-access-key',
              secret: 'test-s3-secret',
              region: 'us-east-1',
              bucket: 'recordings-bucket',
            }),
          }),
        }),
      );
    });

    it('stopRecording calls stopEgress with the given egressId', async () => {
      mockStopEgress.mockResolvedValue(undefined);

      await service.stopRecording('egress-1');

      expect(mockStopEgress).toHaveBeenCalledWith('egress-1');
    });

    it('stopRecording swallows a "not found" error — egress may have already stopped', async () => {
      mockStopEgress.mockRejectedValue(new Error('egress not found'));

      await expect(service.stopRecording('egress-1')).resolves.toBeUndefined();
    });

    it('stopRecording rethrows an unrelated error', async () => {
      mockStopEgress.mockRejectedValue(new Error('network timeout'));

      await expect(service.stopRecording('egress-1')).rejects.toThrow('network timeout');
    });

    it('checkStatus maps EGRESS_COMPLETE with a file result to "available" + url', async () => {
      mockListEgress.mockResolvedValue([
        { status: 3, fileResults: [{ location: 'https://cdn.example.com/rec.mp4' }] },
      ]);

      const result = await service.checkStatus('egress-1');

      expect(result).toEqual({ status: 'available', url: 'https://cdn.example.com/rec.mp4' });
    });

    it('checkStatus maps EGRESS_COMPLETE with no file result to "failed"', async () => {
      mockListEgress.mockResolvedValue([{ status: 3, fileResults: [] }]);

      const result = await service.checkStatus('egress-1');

      expect(result).toEqual({ status: 'failed', url: null });
    });

    it('checkStatus maps EGRESS_FAILED to "failed"', async () => {
      mockListEgress.mockResolvedValue([{ status: 4, fileResults: [] }]);

      const result = await service.checkStatus('egress-1');

      expect(result).toEqual({ status: 'failed', url: null });
    });

    it('checkStatus maps an in-progress status (e.g. EGRESS_ACTIVE) to "processing"', async () => {
      mockListEgress.mockResolvedValue([{ status: 1, fileResults: [] }]);

      const result = await service.checkStatus('egress-1');

      expect(result).toEqual({ status: 'processing', url: null });
    });

    it('checkStatus treats a missing egress (empty result) as "failed"', async () => {
      mockListEgress.mockResolvedValue([]);

      const result = await service.checkStatus('egress-1');

      expect(result).toEqual({ status: 'failed', url: null });
    });
  });
});
