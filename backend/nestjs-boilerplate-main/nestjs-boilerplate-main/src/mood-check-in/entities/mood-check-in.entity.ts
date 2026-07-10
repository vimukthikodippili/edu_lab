import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity({ name: 'mood_check_in' })
@Unique(['studentId', 'date'])
export class MoodCheckInEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'date' })
  date: string;

  /** 1 (very low) – 5 (very good). A bounded ordinal scale, not a category — see the migration's CHECK constraint. */
  @Column({ type: 'smallint' })
  moodValue: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
