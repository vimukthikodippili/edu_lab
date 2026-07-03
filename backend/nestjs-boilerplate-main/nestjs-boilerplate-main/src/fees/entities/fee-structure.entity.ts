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
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';
import { GradeEntity } from '../../students/entities/grade.entity';
import { AcademicTermEntity } from '../../grades/entities/academic-term.entity';

@Unique('UQ_fee_structure_grade_term_category', [
  'gradeId',
  'termId',
  'feeCategory',
])
@Entity({ name: 'fee_structure' })
export class FeeStructureEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  gradeId: number;

  @Column({ type: 'int' })
  termId: number;

  @Column({ type: 'varchar', length: 100 })
  feeCategory: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount: string;

  @ManyToOne(() => GradeEntity, {
    nullable: false,
    eager: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'gradeId' })
  grade: GradeEntity;

  @ManyToOne(() => AcademicTermEntity, {
    nullable: false,
    eager: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'termId' })
  term: AcademicTermEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
