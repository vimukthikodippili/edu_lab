import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { MoodCheckInEntity } from './entities/mood-check-in.entity';

@Injectable()
export class MoodCheckInService {
  constructor(
    @InjectRepository(MoodCheckInEntity)
    private readonly moodCheckInRepo: Repository<MoodCheckInEntity>,
  ) {}

  private today(): string {
    return new Date().toISOString().split('T')[0];
  }

  /** Never throws when nothing exists — an optional feature must never block on absent data. */
  async getTodayStatus(studentId: string): Promise<MoodCheckInEntity | null> {
    return this.moodCheckInRepo.findOne({
      where: { studentId, date: this.today() },
    });
  }

  /** Upsert — a student can change their mind; this never creates a second row for the same day. */
  async submit(studentId: string, moodValue: number): Promise<MoodCheckInEntity> {
    const today = this.today();
    const existing = await this.moodCheckInRepo.findOne({
      where: { studentId, date: today },
    });

    if (existing) {
      existing.moodValue = moodValue;
      return this.moodCheckInRepo.save(existing);
    }

    return this.moodCheckInRepo.save(
      this.moodCheckInRepo.create({ studentId, date: today, moodValue }),
    );
  }

  /** Cross-student lookup for the counselor-case detection job — every other method here is single-student. */
  async findLowMoodCheckInsSince(
    cutoffDate: string,
    maxLowValue: number,
  ): Promise<MoodCheckInEntity[]> {
    return this.moodCheckInRepo.find({
      where: { date: MoreThanOrEqual(cutoffDate), moodValue: LessThanOrEqual(maxLowValue) },
    });
  }
}
