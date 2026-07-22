import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

/** Mirrors GuardianNotificationEntity's exact shape — this codebase had no student-facing
 * notification channel before this story (confirmed via research: only staff and guardian
 * notifications existed). A disclosed, deliberate infrastructure addition, not scope creep —
 * the AC explicitly requires students be notified of new lab report assignments and grades. */
@Entity({ name: 'student_notification' })
export class StudentNotificationEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 40 })
  type: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
