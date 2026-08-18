import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export enum PromotionRecommendationOutcome {
  PROMOTE = 'promote',
  REPEAT = 'repeat',
  GRADUATE = 'graduate',
}

// Advisory, pre-commit input from a class teacher — distinct from
// StudentEnrollmentHistoryEntity, which is the post-commit audit trail written
// once admin actually commits a promotion. A recommendation never blocks or
// auto-applies a commit; admin sees it and can follow or override it.
@Entity({ name: 'promotion_recommendation' })
@Unique(['studentId', 'academicYear'])
export class PromotionRecommendationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'varchar', length: 4 })
  academicYear: string;

  @Column({ type: 'int' })
  classSectionId: number;

  @Column({ type: 'uuid' })
  recommendedById: string;

  @Column({ type: 'enum', enum: PromotionRecommendationOutcome })
  outcome: PromotionRecommendationOutcome;

  @Column({ type: 'varchar', length: 500, nullable: true })
  comment: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
