import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DomainResultEntity, DomainResultLevel } from './entities/domain-result.entity';
import { MhaSessionEntity, MhaSessionStatus } from '../mha-session/entities/mha-session.entity';
import { DisorderRegistryEntity } from '../disorder-registry/entities/disorder-registry.entity';
import { UpdateDomainResultDto } from './dto/update-domain-result.dto';
import { AuditService } from '../audit/audit.service';
import { DomainResultNoteCryptoService } from './domain-result-note-crypto.service';
import { SafetyFlagEscalationService } from './safety-flag-escalation.service';
import { CrisisResource } from './config/crisis-resources.config';

/** MHA-121 — the decrypted, API-facing shape. `counselorNotes` is plaintext here; the
 * ciphertext/iv/authTag columns never leave DomainResultService (see `toDecrypted`). */
export interface DecryptedDomainResult {
  id: string;
  sessionId: string;
  domainId: string;
  domain?: DisorderRegistryEntity;
  level: DomainResultLevel;
  checkedSymptoms: string[];
  counselorNotes: string | null;
  safetyFlagRaised: boolean;
  assessedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /** MHA-122 — only populated on the response of the PATCH that just raised the flag
   * (false->true). Never persisted; undefined on every other read/write. */
  crisisResources?: CrisisResource[];
}

/** MHA-120 — FR-MHA-08/09/11/12/AC#23-27. `DomainResult` rows are pre-created by
 * MhaSessionService.createSession(); this service only lists and updates them. `update()`
 * deliberately never reads `checkedSymptoms` when deciding `level` — that's the structural
 * guarantee behind AC #27 (system never derives a risk level from symptoms or any other data).
 * MHA-121 — `counselorNotes` is AES-256-GCM encrypted at rest (DomainResultNoteCryptoService).
 * Encrypt-on-write/decrypt-on-read happen only here, in the service layer, funneled through
 * `toDecrypted()` for both read paths — never a TypeORM hook or column transformer. */
@Injectable()
export class DomainResultService {
  constructor(
    @InjectRepository(DomainResultEntity)
    private readonly domainResultRepo: Repository<DomainResultEntity>,

    @InjectRepository(MhaSessionEntity)
    private readonly sessionRepo: Repository<MhaSessionEntity>,

    @InjectRepository(DisorderRegistryEntity)
    private readonly disorderRegistryRepo: Repository<DisorderRegistryEntity>,

    private readonly auditService: AuditService,

    private readonly cryptoService: DomainResultNoteCryptoService,

    private readonly safetyFlagEscalationService: SafetyFlagEscalationService,
  ) {}

  private async assertSessionExists(sessionId: string): Promise<void> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException(`MHA session ${sessionId} not found.`);
    }
  }

  async listBySession(sessionId: string): Promise<DecryptedDomainResult[]> {
    await this.assertSessionExists(sessionId);

    const rows = await this.domainResultRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.domain', 'domain')
      .where('r.sessionId = :sessionId', { sessionId })
      .orderBy('domain.section', 'ASC')
      .addOrderBy('domain.name', 'ASC')
      .getMany();

    return rows.map((row) => this.toDecrypted(row));
  }

  async update(
    sessionId: string,
    id: string,
    dto: UpdateDomainResultDto,
    actorId: string,
  ): Promise<DecryptedDomainResult> {
    const row = await this.domainResultRepo.findOne({ where: { id, sessionId } });
    if (!row) {
      throw new NotFoundException(`Domain result ${id} not found for session ${sessionId}.`);
    }

    // MHA-123 — AC #5. A completed/abandoned session is immutable. Fetched unconditionally here
    // (previously only fetched inside the safety-flag branch below) so the safety-flag branch
    // can reuse this same session instead of a second redundant fetch.
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session || session.status !== MhaSessionStatus.DRAFT) {
      throw new ForbiddenException(`Session ${sessionId} is not editable.`);
    }

    // MHA-122 — immutability guard (AC #4). Once raised, safetyFlagRaised can never be unset.
    if (row.safetyFlagRaised && dto.safetyFlagRaised === false) {
      throw new UnprocessableEntityException('safetyFlagRaised cannot be unset once raised.');
    }

    let crisisResources: CrisisResource[] | undefined;
    const isRaisingSafetyFlag = dto.safetyFlagRaised === true && !row.safetyFlagRaised;

    if (dto.safetyFlagRaised === true) {
      const domain = await this.disorderRegistryRepo.findOne({ where: { id: row.domainId } });
      if (!domain?.safetyFlag) {
        throw new UnprocessableEntityException('This domain does not support a safety flag.');
      }
    }

    // Escalation must fully resolve BEFORE this row is persisted — FR-MHA-16 requires the
    // notification to fire "at the moment the flag is set," not gated behind the save.
    if (isRaisingSafetyFlag) {
      // session already fetched unconditionally above — no second sessionRepo.findOne call.
      crisisResources = await this.safetyFlagEscalationService.escalate({
        counselorStaffId: session.counselorStaffId,
        studentId: session.studentId,
        sessionId: session.id,
        caseNumber: session.caseNumber,
      });
      row.safetyFlagRaised = true;
      await this.auditService.log({
        actorId,
        action: 'raise_safety_flag',
        targetType: 'domain_result',
        targetId: row.id,
      });
    }

    if (dto.checkedSymptoms !== undefined) {
      row.checkedSymptoms = dto.checkedSymptoms;
    }
    if (dto.counselorNotes !== undefined) {
      if (dto.counselorNotes === null) {
        row.counselorNotesCiphertext = null;
        row.counselorNotesIv = null;
        row.counselorNotesAuthTag = null;
      } else {
        const { ciphertext, iv, authTag } = this.cryptoService.encrypt(dto.counselorNotes);
        row.counselorNotesCiphertext = ciphertext;
        row.counselorNotesIv = iv;
        row.counselorNotesAuthTag = authTag;
      }
    }
    if (dto.level !== undefined) {
      row.level = dto.level;
    }
    if (dto.level !== undefined || dto.checkedSymptoms !== undefined) {
      row.assessedAt = new Date();
    }

    const saved = await this.domainResultRepo.save(row);

    await this.auditService.log({
      actorId,
      action: 'update_domain',
      targetType: 'domain_result',
      targetId: saved.id,
    });

    return { ...this.toDecrypted(saved), crisisResources };
  }

  private toDecrypted(row: DomainResultEntity): DecryptedDomainResult {
    return {
      id: row.id,
      sessionId: row.sessionId,
      domainId: row.domainId,
      domain: row.domain,
      level: row.level,
      checkedSymptoms: row.checkedSymptoms,
      counselorNotes: row.counselorNotesCiphertext
        ? this.cryptoService.decrypt(
            row.counselorNotesCiphertext,
            row.counselorNotesIv as string,
            row.counselorNotesAuthTag as string,
          )
        : null,
      safetyFlagRaised: row.safetyFlagRaised,
      assessedAt: row.assessedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
