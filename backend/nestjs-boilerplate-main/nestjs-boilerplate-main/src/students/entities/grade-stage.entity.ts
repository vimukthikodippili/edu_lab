import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Replaces the old hardcoded GradeStage enum — an Admin/Principal can define however many
 * stages a school actually uses, with whatever grade-range boundaries it actually follows,
 * instead of the fixed Sri Lankan default (Primary 1-5 / Junior Secondary 6-9 / Senior
 * Secondary 10-11 / Collegiate 12-13). Stage membership is a computed range lookup
 * (GradeStageService.resolveStageForLevel), never a stored per-grade FK — GradeEntity itself
 * carries no stage reference. */
@Entity({ name: 'grade_stage' })
export class GradeStageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  stageName: string;

  @Column({ type: 'int' })
  fromGrade: number;

  @Column({ type: 'int' })
  toGrade: number;

  @Column({ type: 'int' })
  ordering: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
