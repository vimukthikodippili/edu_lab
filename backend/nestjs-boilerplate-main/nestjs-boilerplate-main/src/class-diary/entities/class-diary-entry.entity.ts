import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { TimetableEntryEntity } from '../../timetable/entities/timetable-entry.entity';

@Entity({ name: 'class_diary_entry' })
@Unique(['timetableEntryId', 'date'])
export class ClassDiaryEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  timetableEntryId: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'jsonb', default: [] })
  attachmentFileIds: string[];

  // Virtual — populated by ClassDiaryService after loading (not a DB column)
  attachments?: { id: string; path: string }[];

  @ManyToOne(() => TimetableEntryEntity, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'timetableEntryId' })
  timetableEntry: TimetableEntryEntity;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
