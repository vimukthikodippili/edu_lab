import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'class_room' })
export class ClassRoomEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  roomNumber: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
