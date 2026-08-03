import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

/** P5-EH — FR-P5-EH-08. Kept exactly to the AI prompt's literal model — no QR code (a scannable
 * code would only be useful for the deferred entry-list/invigilator-scan features). One admit
 * card per allocation. */
@Entity({ name: 'admit_card' })
export class AdmitCardEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  examSeatAllocationId: string;

  @Column({ type: 'timestamptz' })
  generatedAt: Date;
}
