import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnprocessableEntityException } from '@nestjs/common';
import { LiveKitService } from './livekit.service';

const mockToJwt = jest.fn().mockResolvedValue('mock-jwt-token');
const mockAddGrant = jest.fn();
const mockDeleteRoom = jest.fn();

jest.mock('livekit-server-sdk', () => ({
  AccessToken: jest.fn().mockImplementation(() => ({
    addGrant: mockAddGrant,
    toJwt: mockToJwt,
  })),
  RoomServiceClient: jest.fn().mockImplementation(() => ({
    deleteRoom: mockDeleteRoom,
  })),
}));

describe('LiveKitService', () => {
  let service: LiveKitService;
  let configService: { get: jest.Mock };

  const CONFIGURED_MAP: Record<string, unknown> = {
    'livekit.url': 'wss://example.livekit.cloud',
    'livekit.apiKey': 'test-api-key',
    'livekit.apiSecret': 'test-api-secret',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockToJwt.mockResolvedValue('mock-jwt-token');
    configService = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveKitService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<LiveKitService>(LiveKitService);
  });

  describe('when LiveKit is not configured (the real state until real credentials are added)', () => {
    it('mintToken throws UnprocessableEntityException with a clear, actionable message', async () => {
      configService.get.mockReturnValue(undefined);

      await expect(service.mintToken('room-1', 'user-1', 'Test User')).rejects.toThrow(
        UnprocessableEntityException,
      );
      await expect(service.mintToken('room-1', 'user-1', 'Test User')).rejects.toThrow(
        /not configured/i,
      );
    });

    it('endRoom throws UnprocessableEntityException', async () => {
      configService.get.mockReturnValue(undefined);

      await expect(service.endRoom('room-1')).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws when only some of the 3 required values are set', async () => {
      configService.get.mockImplementation((key: string) =>
        key === 'livekit.url' ? 'wss://example.livekit.cloud' : undefined,
      );

      await expect(service.mintToken('room-1', 'user-1', 'Test User')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });

  describe('when LiveKit is configured', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => CONFIGURED_MAP[key]);
    });

    it('mints a token with a room-join grant scoped to the given room, returning the token and url', async () => {
      const result = await service.mintToken('room-1', 'user-1', 'Test User');

      expect(mockAddGrant).toHaveBeenCalledWith({
        roomJoin: true,
        room: 'room-1',
        canPublish: true,
        canSubscribe: true,
        canPublishData: false,
      });
      expect(result).toEqual({ token: 'mock-jwt-token', url: 'wss://example.livekit.cloud' });
    });

    it('defaults canPublishData to false when not passed (e.g. a student join)', async () => {
      await service.mintToken('room-1', 'student-1', 'Student One');

      expect(mockAddGrant).toHaveBeenCalledWith(
        expect.objectContaining({ canPublishData: false }),
      );
    });

    it('grants canPublishData:true when explicitly requested (e.g. the host, for air-writing broadcast)', async () => {
      await service.mintToken('room-1', 'teacher-1', 'Teacher One', true);

      expect(mockAddGrant).toHaveBeenCalledWith(
        expect.objectContaining({ canPublishData: true }),
      );
    });

    it('endRoom calls deleteRoom with the given room name', async () => {
      mockDeleteRoom.mockResolvedValue(undefined);

      await service.endRoom('room-1');

      expect(mockDeleteRoom).toHaveBeenCalledWith('room-1');
    });

    it('endRoom swallows a "room not found" error — nobody ever joined, DB is still the source of truth', async () => {
      mockDeleteRoom.mockRejectedValue(new Error('room not found'));

      await expect(service.endRoom('room-1')).resolves.toBeUndefined();
    });

    it('endRoom rethrows an unrelated error', async () => {
      mockDeleteRoom.mockRejectedValue(new Error('network timeout'));

      await expect(service.endRoom('room-1')).rejects.toThrow('network timeout');
    });
  });
});
