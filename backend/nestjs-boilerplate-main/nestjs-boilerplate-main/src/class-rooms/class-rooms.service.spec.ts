import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { ClassRoomsService } from './class-rooms.service';
import { ClassRoomEntity } from './entities/class-room.entity';

describe('ClassRoomsService', () => {
  let service: ClassRoomsService;
  let roomRepo: { find: jest.Mock; create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    roomRepo = {
      find: jest.fn(),
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassRoomsService,
        { provide: getRepositoryToken(ClassRoomEntity), useValue: roomRepo },
      ],
    }).compile();

    service = module.get<ClassRoomsService>(ClassRoomsService);
  });

  describe('create', () => {
    it('creates a room on the happy path', async () => {
      roomRepo.save.mockResolvedValue({ id: 'room-1', roomNumber: 'Room 5' });

      const result = await service.create('Room 5');

      expect(roomRepo.create).toHaveBeenCalledWith({ roomNumber: 'Room 5' });
      expect(result).toEqual({ id: 'room-1', roomNumber: 'Room 5' });
    });

    it('throws ConflictException when the room number already exists', async () => {
      roomRepo.save.mockRejectedValue({ code: '23505' });

      await expect(service.create('Room 5')).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('returns all rooms ordered by roomNumber', async () => {
      const rooms = [{ id: 'room-1', roomNumber: 'Room 5' }];
      roomRepo.find.mockResolvedValue(rooms);

      const result = await service.findAll();

      expect(roomRepo.find).toHaveBeenCalledWith({ order: { roomNumber: 'ASC' } });
      expect(result).toBe(rooms);
    });
  });
});
