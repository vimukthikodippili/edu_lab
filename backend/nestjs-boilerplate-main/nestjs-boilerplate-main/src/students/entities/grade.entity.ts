import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'grade' })
export class GradeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  level: number; // 1–13

  @Column({ type: 'varchar' })
  name: string; // "Grade 1", "Grade 10"
}
