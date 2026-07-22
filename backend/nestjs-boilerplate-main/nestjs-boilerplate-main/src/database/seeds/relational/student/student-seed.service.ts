import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  StudentEntity,
  StudentGender,
  StudentStatus,
} from '../../../../students/entities/student.entity';
import {
  GuardianEntity,
  GuardianRelationship,
} from '../../../../students/entities/guardian.entity';
import { StudentGuardianEntity } from '../../../../students/entities/student-guardian.entity';
import { ClassSectionEntity } from '../../../../students/entities/class-section.entity';

const ACADEMIC_YEAR = String(new Date().getFullYear());
const STUDENTS_PER_SECTION = 10;

// Grade level → expected birth year for a student entering that grade in 2026.
const GRADE_BIRTH_YEAR: Record<number, number> = {
  1: 2019, 2: 2018, 3: 2017, 4: 2016, 5: 2015, 6: 2014,
  7: 2013, 8: 2012, 9: 2011, 10: 2010, 11: 2009, 12: 2008, 13: 2007,
};

// 10 student+guardian profiles. Rotated per section so each class has realistic variety.
const PROFILES = [
  { firstName: 'Kasun',    lastName: 'Perera',          gender: StudentGender.MALE,   dobMonth: 3,  dobDay: 15, gFirst: 'Sunil',     gLast: 'Perera',          gRel: GuardianRelationship.FATHER },
  { firstName: 'Nethmi',   lastName: 'Silva',            gender: StudentGender.FEMALE, dobMonth: 7,  dobDay: 22, gFirst: 'Kamala',    gLast: 'Silva',            gRel: GuardianRelationship.MOTHER },
  { firstName: 'Nuwan',    lastName: 'Fernando',         gender: StudentGender.MALE,   dobMonth: 1,  dobDay: 10, gFirst: 'Pradeep',   gLast: 'Fernando',         gRel: GuardianRelationship.FATHER },
  { firstName: 'Dilini',   lastName: 'Bandara',          gender: StudentGender.FEMALE, dobMonth: 9,  dobDay: 5,  gFirst: 'Renuka',    gLast: 'Bandara',          gRel: GuardianRelationship.MOTHER },
  { firstName: 'Lahiru',   lastName: 'Jayawardena',      gender: StudentGender.MALE,   dobMonth: 11, dobDay: 18, gFirst: 'Nimal',     gLast: 'Jayawardena',      gRel: GuardianRelationship.FATHER },
  { firstName: 'Sanduni',  lastName: 'Dissanayake',      gender: StudentGender.FEMALE, dobMonth: 4,  dobDay: 30, gFirst: 'Indrani',   gLast: 'Dissanayake',      gRel: GuardianRelationship.MOTHER },
  { firstName: 'Tharindu', lastName: 'Wickramasinghe',   gender: StudentGender.MALE,   dobMonth: 6,  dobDay: 14, gFirst: 'Anura',     gLast: 'Wickramasinghe',   gRel: GuardianRelationship.FATHER },
  { firstName: 'Kavisha',  lastName: 'Rajapaksa',        gender: StudentGender.FEMALE, dobMonth: 8,  dobDay: 25, gFirst: 'Sunethra',  gLast: 'Rajapaksa',        gRel: GuardianRelationship.MOTHER },
  { firstName: 'Chamara',  lastName: 'Gunasekara',       gender: StudentGender.MALE,   dobMonth: 2,  dobDay: 8,  gFirst: 'Mahinda',   gLast: 'Gunasekara',       gRel: GuardianRelationship.FATHER },
  { firstName: 'Thilini',  lastName: 'Karunaratne',      gender: StudentGender.FEMALE, dobMonth: 12, dobDay: 20, gFirst: 'Anoja',     gLast: 'Karunaratne',      gRel: GuardianRelationship.MOTHER },
];

@Injectable()
export class StudentSeedService {
  constructor(
    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,

    @InjectRepository(GuardianEntity)
    private readonly guardianRepo: Repository<GuardianEntity>,

    @InjectRepository(StudentGuardianEntity)
    private readonly sgRepo: Repository<StudentGuardianEntity>,

    @InjectRepository(ClassSectionEntity)
    private readonly sectionRepo: Repository<ClassSectionEntity>,
  ) {}

  async run(): Promise<void> {
    const sections = await this.sectionRepo.find({
      where: { academicYear: ACADEMIC_YEAR },
      relations: ['grade'],
      order: { gradeId: 'ASC', name: 'ASC' },
    });

    // Global sequence counter so admission numbers stay contiguous and unique.
    let sequence = await this.getNextSequence();

    for (let sIdx = 0; sIdx < sections.length; sIdx++) {
      const section = sections[sIdx];
      const birthYear = GRADE_BIRTH_YEAR[section.grade?.level ?? 1] ?? 2012;

      const existingCount = await this.studentRepo.count({
        where: { classSectionId: section.id, academicYear: ACADEMIC_YEAR },
      });

      const needed = Math.max(0, STUDENTS_PER_SECTION - existingCount);
      if (needed === 0) continue;

      for (let i = 0; i < needed; i++) {
        const profile = PROFILES[(existingCount + i) % PROFILES.length];

        // NIC is unique: prefix "QA" + zero-padded global index.
        // Stored as 9-digit + V to match Sri Lankan old-format length.
        const globalIdx = sIdx * STUDENTS_PER_SECTION + existingCount + i + 1;
        const nicStr = `${String(globalIdx).padStart(9, '9')}V`;
        const phoneStr = `077${String(globalIdx).padStart(7, '0')}`;

        // Upsert guardian — safe to re-run because we look up by NIC first.
        let guardian = await this.guardianRepo.findOne({ where: { nic: nicStr } });
        if (!guardian) {
          guardian = await this.guardianRepo.save(
            this.guardianRepo.create({
              firstName: profile.gFirst,
              lastName: profile.gLast,
              relationship: profile.gRel,
              nic: nicStr,
              phone: phoneStr,
              email: `guardian${globalIdx}@qa.sims.edu.lk`,
              address: `${globalIdx} Temple Road, Colombo, Sri Lanka`,
              userId: null,
              pushToken: null,
              idProofFileId: null,
            }),
          );
        }

        // Create student.
        const admissionNumber = `SIMS/${ACADEMIC_YEAR}/${String(sequence).padStart(5, '0')}`;
        const dob = new Date(birthYear, profile.dobMonth - 1, profile.dobDay);

        const student = await this.studentRepo.save(
          this.studentRepo.create({
            admissionNumber,
            firstName: profile.firstName,
            lastName: `${profile.lastName} ${section.name}${section.grade?.level ?? ''}`,
            dateOfBirth: dob,
            gender: profile.gender,
            academicYear: ACADEMIC_YEAR,
            status: StudentStatus.ACTIVE,
            gradeId: section.gradeId,
            classSectionId: section.id,
            address: `No.${sequence}, Galle Road, Colombo ${(globalIdx % 15) + 1}, Sri Lanka`,
            contactNumber: phoneStr,
            userId: null,
            photoId: null,
            streamId: null,
          }),
        );

        // Link student ↔ guardian (primary contact).
        await this.sgRepo.save(
          this.sgRepo.create({
            studentId: student.id,
            guardianId: guardian.id,
            isPrimaryContact: true,
          }),
        );

        sequence++;
      }
    }
  }

  /** Mirrors StudentsService.generateAdmissionNumber — reads the highest existing sequence. */
  private async getNextSequence(): Promise<number> {
    const prefix = `SIMS/${ACADEMIC_YEAR}/`;
    const last = await this.studentRepo
      .createQueryBuilder('s')
      .where('s.admissionNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('s.admissionNumber', 'DESC')
      .withDeleted()
      .getOne();

    if (!last) return 1;
    const parts = last.admissionNumber.split('/');
    const lastSeq = parseInt(parts[2] ?? '0', 10);
    return isNaN(lastSeq) ? 1 : lastSeq + 1;
  }
}
