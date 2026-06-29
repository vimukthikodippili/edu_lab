import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { SubjectEntity } from '../../subjects/entities/subject.entity';
import { ALStreamEntity } from './al-stream.entity';

@Entity({ name: 'al_stream_subject' })
export class ALStreamSubjectEntity {
  @PrimaryColumn({ type: 'int' })
  streamId: number;

  @PrimaryColumn({ type: 'uuid' })
  subjectId: string;

  @ManyToOne(() => ALStreamEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'streamId' })
  stream: ALStreamEntity;

  @ManyToOne(() => SubjectEntity, { nullable: false, eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subjectId' })
  subject: SubjectEntity;
}
