import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SubjectEntity } from '../../subjects/entities/subject.entity';
import { SubjectSelectionRequestEntity } from './subject-selection-request.entity';

export enum SubjectSelectionType {
  CORE = 'core',
  OPTIONAL = 'optional',
  STREAM_PACKAGE = 'stream_package',
}

@Entity({ name: 'subject_selection_request_item' })
export class SubjectSelectionRequestItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  requestId: string;

  @ManyToOne(() => SubjectSelectionRequestEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requestId' })
  request: SubjectSelectionRequestEntity;

  @Column({ type: 'uuid' })
  subjectId: string;

  @ManyToOne(() => SubjectEntity, { nullable: false, eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subjectId' })
  subject: SubjectEntity;

  @Column({ type: 'varchar', length: 20, enumName: 'subject_selection_item_type' })
  selectionType: SubjectSelectionType;
}
