import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import bcrypt from 'bcryptjs';
import { RoleEnum } from '../../../../roles/roles.enum';
import { StatusEnum } from '../../../../statuses/statuses.enum';
import { UserEntity } from '../../../../users/infrastructure/persistence/relational/entities/user.entity';

const SEED_USERS = [
  { firstName: 'Super',    lastName: 'Admin',    email: 'admin@sims.edu.lk',    roleId: RoleEnum.admin,            roleName: 'Admin' },
  { firstName: 'Priya',    lastName: 'Fernando', email: 'principal@sims.edu.lk', roleId: RoleEnum.principal,        roleName: 'Principal' },
  { firstName: 'Chamara',  lastName: 'Silva',    email: 'sectionhead@sims.edu.lk', roleId: RoleEnum.section_head,   roleName: 'Section Head' },
  { firstName: 'Nimal',    lastName: 'Perera',   email: 'teacher@sims.edu.lk',   roleId: RoleEnum.teacher,          roleName: 'Teacher' },
  { firstName: 'Kasun',    lastName: 'Bandara',  email: 'student@sims.edu.lk',   roleId: RoleEnum.student,          roleName: 'Student' },
  { firstName: 'Sunethra', lastName: 'Perera',   email: 'guardian@sims.edu.lk',  roleId: RoleEnum.guardian,         roleName: 'Guardian' },
  { firstName: 'Dilini',   lastName: 'Jayawardena', email: 'counselor@sims.edu.lk', roleId: RoleEnum.counselor,     roleName: 'Counselor' },
  { firstName: 'Roshan',   lastName: 'Kumara',   email: 'security@sims.edu.lk',  roleId: RoleEnum.security_officer, roleName: 'Security Officer' },
  { firstName: 'Amali',    lastName: 'Wickrama', email: 'librarian@sims.edu.lk', roleId: RoleEnum.librarian,        roleName: 'Librarian' },
  { firstName: 'Ruwan',    lastName: 'Dissanayake', email: 'accountant@sims.edu.lk', roleId: RoleEnum.accountant,   roleName: 'Accountant' },
  { firstName: 'Nadeesha', lastName: 'Rajapaksha', email: 'psychologist@sims.edu.lk', roleId: RoleEnum.school_psychologist, roleName: 'School Psychologist' },
];

@Injectable()
export class UserSeedService {
  constructor(
    @InjectRepository(UserEntity)
    private repository: Repository<UserEntity>,
  ) {}

  async run() {
    for (const seedUser of SEED_USERS) {
      const exists = await this.repository.count({
        where: { role: { id: seedUser.roleId } },
      });

      if (!exists) {
        const salt = await bcrypt.genSalt();
        const password = await bcrypt.hash('secret', salt);

        await this.repository.save(
          this.repository.create({
            firstName: seedUser.firstName,
            lastName: seedUser.lastName,
            email: seedUser.email,
            password,
            role: {
              id: seedUser.roleId,
              name: seedUser.roleName,
            },
            status: {
              id: StatusEnum.active,
              name: 'Active',
            },
          }),
        );
      }
    }
  }
}
