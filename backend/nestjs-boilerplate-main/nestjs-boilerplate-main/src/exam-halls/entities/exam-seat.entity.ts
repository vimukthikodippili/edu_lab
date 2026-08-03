import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

/** P5-EH — FR-P5-EH-02. Auto-generated (`rowCount × columnCount` rows) the moment an
 * `ExamHallEntity` is created — row letters (A, B, C…) + column numbers, e.g. "A1", "B4". */
@Entity({ name: 'exam_seat' })
@Unique(['examHallId', 'seatLabel'])
export class ExamSeatEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  examHallId: string;

  @Column({ type: 'varchar' })
  seatLabel: string;

  @Column({ type: 'int' })
  rowNumber: number;

  @Column({ type: 'int' })
  columnNumber: number;
}
