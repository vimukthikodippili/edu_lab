import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Index('UQ_sh_date', ['date'], { unique: true })
@Entity({ name: 'school_holiday' })
export class SchoolHolidayEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'varchar', length: 200 })
  description: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
