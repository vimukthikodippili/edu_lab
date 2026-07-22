import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** A school-configurable catalog of lab/specialist-room types (Science, Computer, Language,
 * Art, Other by default) — an Admin/Principal can add custom types beyond the defaults. Mirrors
 * SportTypeEntity's shape exactly. */
@Entity({ name: 'lab_type' })
export class LabTypeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
