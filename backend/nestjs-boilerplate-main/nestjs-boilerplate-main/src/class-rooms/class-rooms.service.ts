import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassRoomEntity } from './entities/class-room.entity';

@Injectable()
export class ClassRoomsService {
  constructor(
    @InjectRepository(ClassRoomEntity)
    private readonly roomRepo: Repository<ClassRoomEntity>,
  ) {}

  async create(roomNumber: string): Promise<ClassRoomEntity> {
    try {
      return await this.roomRepo.save(this.roomRepo.create({ roomNumber }));
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('A room with this number already exists.');
      }
      throw error;
    }
  }

  async findAll(): Promise<ClassRoomEntity[]> {
    return this.roomRepo.find({ order: { roomNumber: 'ASC' } });
  }
}
