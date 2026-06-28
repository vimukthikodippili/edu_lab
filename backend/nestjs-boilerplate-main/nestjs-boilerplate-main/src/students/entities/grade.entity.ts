import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum GradeStage {
  PRIMARY = 'primary',               // Grades 1-5
  JUNIOR_SECONDARY = 'junior_secondary', // Grades 6-9
  SENIOR_SECONDARY = 'senior_secondary', // Grades 10-11
  COLLEGIATE = 'collegiate',         // Grades 12-13
}

@Entity({ name: 'grade' })
export class GradeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  level: number; // 1–13

  @Column({ type: 'varchar' })
  name: string; // "Grade 1", "Grade 10"

  @Column({ type: 'enum', enum: GradeStage })
  stage: GradeStage;
}
