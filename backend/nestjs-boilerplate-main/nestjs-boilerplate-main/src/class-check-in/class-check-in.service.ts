import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import {
  ClassCheckInEntity,
  ClassCheckInMethod,
} from './entities/class-check-in.entity';
import { TimetableEntryEntity } from '../timetable/entities/timetable-entry.entity';
import { ClassRoomEntity } from '../class-rooms/entities/class-room.entity';
import { AllConfigType } from '../config/config.type';

export interface ActiveEntryStatus {
  entry: TimetableEntryEntity;
  alreadyCheckedIn: boolean;
}

@Injectable()
export class ClassCheckInService {
  constructor(
    @InjectRepository(ClassCheckInEntity)
    private readonly checkInRepo: Repository<ClassCheckInEntity>,

    @InjectRepository(TimetableEntryEntity)
    private readonly timetableRepo: Repository<TimetableEntryEntity>,

    @InjectRepository(ClassRoomEntity)
    private readonly classRoomRepo: Repository<ClassRoomEntity>,

    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  getCurrentPeriod(now: Date): number {
    const schoolStartTime = this.configService.get('freePeriod.schoolStartTime', {
      infer: true,
    }) as string;
    const periodDurationMinutes = this.configService.get(
      'freePeriod.periodDurationMinutes',
      { infer: true },
    ) as number;

    const [startHour, startMinute] = schoolStartTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const elapsed = nowMinutes - startMinutes;

    if (elapsed < 0) return 0;
    return Math.floor(elapsed / periodDurationMinutes) + 1;
  }

  async getActiveEntryForTeacher(
    teacherId: string,
  ): Promise<ActiveEntryStatus | null> {
    const now = new Date();
    const currentPeriod = this.getCurrentPeriod(now);
    if (currentPeriod <= 0) return null;

    const entry = await this.timetableRepo.findOne({
      where: { teacherId, day: now.getDay(), period: currentPeriod },
    });
    if (!entry) return null;

    const today = now.toISOString().split('T')[0];
    const existingCheckIn = await this.checkInRepo.findOne({
      where: { timetableEntryId: entry.id, date: today },
    });

    return { entry, alreadyCheckedIn: !!existingCheckIn };
  }

  async checkIn(teacherId: string): Promise<ClassCheckInEntity> {
    const status = await this.getActiveEntryForTeacher(teacherId);
    if (!status) {
      throw new UnprocessableEntityException(
        'There is no active class period right now.',
      );
    }

    return this.saveCheckIn(status.entry, teacherId, ClassCheckInMethod.PWA_TAP);
  }

  async getActiveEntryForRoom(
    roomNumber: string,
  ): Promise<TimetableEntryEntity | null> {
    const now = new Date();
    const currentPeriod = this.getCurrentPeriod(now);
    if (currentPeriod <= 0) return null;

    return this.timetableRepo.findOne({
      where: { roomNumber, day: now.getDay(), period: currentPeriod },
    });
  }

  async checkInByRoom(
    teacherId: string,
    roomId: string,
  ): Promise<ClassCheckInEntity> {
    const room = await this.classRoomRepo.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException('Room not found.');
    }

    const entry = await this.getActiveEntryForRoom(room.roomNumber);
    if (!entry) {
      throw new NotFoundException('No active class in this room right now.');
    }

    return this.saveCheckIn(entry, teacherId, ClassCheckInMethod.QR_SCAN);
  }

  private async saveCheckIn(
    entry: TimetableEntryEntity,
    teacherId: string,
    method: ClassCheckInMethod,
  ): Promise<ClassCheckInEntity> {
    const today = new Date().toISOString().split('T')[0];

    const existing = await this.checkInRepo.findOne({
      where: { timetableEntryId: entry.id, date: today },
    });
    if (existing) return existing;

    try {
      return await this.checkInRepo.save(
        this.checkInRepo.create({
          timetableEntryId: entry.id,
          date: today,
          teacherId,
          method,
        }),
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        const existingAfterRace = await this.checkInRepo.findOne({
          where: { timetableEntryId: entry.id, date: today },
        });
        if (existingAfterRace) return existingAfterRace;
      }
      throw error;
    }
  }
}
