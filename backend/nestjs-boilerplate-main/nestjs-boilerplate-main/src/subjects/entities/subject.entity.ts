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
import { SubjectCategoryEntity } from './subject-category.entity';

@Entity({ name: 'subject' })
export class SubjectEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  code: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  @Column({ type: 'int' })
  categoryId: number;

  @ManyToOne(() => SubjectCategoryEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'categoryId' })
  category: SubjectCategoryEntity;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
  // No @DeleteDateColumn — isActive=false is the deactivation mechanism; rows are never deleted
}
