import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MhaSessionEntity } from '../mha-session/entities/mha-session.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { QueryCaseloadDto } from './dto/query-caseload.dto';
import { CaseloadItemDto } from './dto/caseload-item.dto';

interface CaseloadRawRow {
  studentId: string;
  latestSessionId: string;
  latestSessionDate: Date;
  highestRiskLevel: CaseloadItemDto['highestRiskLevel'];
  hasPendingActions: boolean;
  hasSafetyFlag: boolean;
}

/** FR-MHA-31 — read-model aggregation across `mha_session`/`risk_summary`/`session_action`/
 * `domain_result`, one row per student with >=1 completed session. Mirrors
 * MhaSessionService.abandonStaleDrafts()'s raw-SQL convention (the only existing precedent for a
 * real cross-table aggregation in this module family) rather than fetch-then-Map-join in JS,
 * since this needs 4 simultaneous per-student aggregates. `student` is deliberately not joined at
 * the DB level, consistent with `mha_session.studentId`'s documented bare-FK-no-relation
 * convention — Student rows are batch-loaded separately and merged in memory, exactly like
 * MhaSessionService.listSessions() already does. */
@Injectable()
export class MhaCaseloadService {
  constructor(
    @InjectRepository(MhaSessionEntity)
    private readonly sessionRepo: Repository<MhaSessionEntity>,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,
  ) {}

  async getCaseload(filters: QueryCaseloadDto): Promise<CaseloadItemDto[]> {
    const rows: CaseloadRawRow[] = await this.sessionRepo.query(
      `SELECT * FROM (
         SELECT
           ls."studentId"                                AS "studentId",
           ls."sessionId"                                 AS "latestSessionId",
           ls."completedAt"                                AS "latestSessionDate",
           COALESCE(mr."maxLevel"::text, 'not_assessed')   AS "highestRiskLevel",
           EXISTS (
             SELECT 1 FROM session_action sa
             INNER JOIN mha_session s2 ON s2.id = sa."sessionId"
             WHERE s2."studentId" = ls."studentId" AND sa.status = 'open'
           )                                                AS "hasPendingActions",
           EXISTS (
             SELECT 1 FROM domain_result dr
             INNER JOIN mha_session s3 ON s3.id = dr."sessionId"
             WHERE s3."studentId" = ls."studentId" AND dr."safetyFlagRaised" = true
           )                                                AS "hasSafetyFlag"
         FROM (
           SELECT DISTINCT ON (s."studentId") s."studentId", s.id AS "sessionId", s."completedAt"
           FROM mha_session s
           WHERE s.status = 'complete'
           ORDER BY s."studentId", s."completedAt" DESC NULLS LAST
         ) ls
         LEFT JOIN LATERAL (
           SELECT rs.level AS "maxLevel"
           FROM risk_summary rs
           WHERE rs."sessionId" = ls."sessionId"
           ORDER BY CASE rs.level
             WHEN 'severe' THEN 5 WHEN 'high' THEN 4 WHEN 'moderate' THEN 3
             WHEN 'low' THEN 2 WHEN 'none' THEN 1 ELSE 0 END DESC
           LIMIT 1
         ) mr ON true
       ) caseload
       WHERE ($1::text IS NULL OR caseload."highestRiskLevel" = $1)
         AND ($2::boolean IS NULL OR caseload."hasPendingActions" = $2)
         AND ($3::boolean IS NULL OR caseload."hasSafetyFlag" = $3)
       ORDER BY caseload."latestSessionDate" DESC NULLS LAST`,
      [filters.riskLevel ?? null, filters.hasPendingActions ?? null, filters.hasSafetyFlag ?? null],
    );

    if (rows.length === 0) {
      return [];
    }

    const studentIds = rows.map((r) => r.studentId);
    const students = await this.studentRepo.find({ where: { id: In(studentIds) } });
    const studentById = new Map(students.map((s) => [s.id, s]));

    const items: CaseloadItemDto[] = [];
    for (const row of rows) {
      const student = studentById.get(row.studentId);
      if (!student) continue;
      if (filters.gradeId !== undefined && student.gradeId !== filters.gradeId) continue;

      items.push({
        studentId: row.studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        grade: `${student.grade.level}${student.classSection.name}`,
        latestSessionId: row.latestSessionId,
        latestSessionDate: row.latestSessionDate,
        highestRiskLevel: row.highestRiskLevel,
        hasPendingActions: row.hasPendingActions,
        hasSafetyFlag: row.hasSafetyFlag,
      });
    }
    return items;
  }
}
