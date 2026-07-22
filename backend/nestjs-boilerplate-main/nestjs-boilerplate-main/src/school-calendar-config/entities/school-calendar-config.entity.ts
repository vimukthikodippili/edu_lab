import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';
import { GradeStageEntity } from '../../students/entities/grade-stage.entity';

@Entity({ name: 'school_calendar_config' })
export class SchoolCalendarConfigEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', unique: true })
  gradeStageId: string;

  @ManyToOne(() => GradeStageEntity, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gradeStageId' })
  gradeStage: GradeStageEntity;

  @Column({ type: 'int' })
  workingDaysPerWeek: number;

  @Column({ type: 'int' })
  periodsPerDay: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
