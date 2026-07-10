import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ObjectLiteral, Repository } from 'typeorm';
import { ClassRoomQrPdfService } from './class-room-qr-pdf.service';
import { ClassRoomEntity } from '../entities/class-room.entity';
import { FileEntity } from '../../files/infrastructure/persistence/relational/entities/file.entity';

const writeFileSyncMock = jest.fn();
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: (...args: unknown[]) => writeFileSyncMock(...args),
}));

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  create: jest.fn((d: Partial<T>) => d as T),
  save: jest.fn((d: unknown) => Promise.resolve(d)),
});

describe('ClassRoomQrPdfService', () => {
  let service: ClassRoomQrPdfService;
  let fileRepo: MockRepo<FileEntity>;

  beforeEach(async () => {
    fileRepo = repoMock<FileEntity>();
    writeFileSyncMock.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassRoomQrPdfService,
        { provide: getRepositoryToken(FileEntity), useValue: fileRepo },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('api'),
            getOrThrow: jest.fn().mockReturnValue('https://sims.example.lk'),
          },
        },
      ],
    }).compile();

    service = module.get<ClassRoomQrPdfService>(ClassRoomQrPdfService);
    jest.clearAllMocks();
  });

  describe('generatePdf', () => {
    it('returns a non-empty Buffer for a list of rooms', async () => {
      const rooms = [
        { id: 'room-1', roomNumber: 'Room 5' },
        { id: 'room-2', roomNumber: 'Room 6' },
      ] as unknown as ClassRoomEntity[];

      const buffer = await service.generatePdf(rooms);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      // PDF files start with the %PDF- magic header
      expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    }, 15000);
  });

  describe('persistAsFile', () => {
    it('writes the buffer to disk and creates a FileEntity with the expected path shape', async () => {
      const buffer = Buffer.from('fake-pdf-bytes');

      const file = await service.persistAsFile(buffer);

      expect(writeFileSyncMock).toHaveBeenCalledTimes(1);
      const [writtenPath, writtenBuffer] = writeFileSyncMock.mock.calls[0];
      expect(String(writtenPath)).toMatch(/^files[\\/].+\.pdf$/);
      expect(writtenBuffer).toBe(buffer);

      expect(fileRepo.create).toHaveBeenCalledTimes(1);
      const createArg = (fileRepo.create as jest.Mock).mock.calls[0][0] as { path: string };
      expect(createArg.path).toMatch(/^\/api\/v1\/files\/.+\.pdf$/);
      expect(fileRepo.save).toHaveBeenCalledTimes(1);
      expect(file).toBeDefined();
    });
  });
});
