import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'behavioral_observation' })
export class BehavioralObservationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'uuid' })
  authorStaffId: string;

  @Column({ type: 'text' })
  notes: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
