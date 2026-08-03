import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

/** P5-EH — FR-P5-EH-01/02. A physical exam hall — a shared resource, not owned by any one grade
 * or exam. No `schoolId` (confirmed single-tenant throughout this codebase). `rowCount`/
 * `columnCount` drive auto-generation of its `ExamSeatEntity` grid the moment the hall is created. */
@Entity({ name: 'exam_hall' })
export class ExamHallEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  building: string | null;

  @Column({ type: 'varchar', nullable: true })
  floor: string | null;

  @Column({ type: 'int' })
  capacity: number;

  @Column({ type: 'int' })
  rowCount: number;

  @Column({ type: 'int' })
  columnCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
