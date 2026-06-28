import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEntity } from '../../../../roles/infrastructure/persistence/relational/entities/role.entity';
import { RoleEnum } from '../../../../roles/roles.enum';

const ROLES = [
  { id: RoleEnum.admin,            name: 'Admin' },
  { id: RoleEnum.user,             name: 'User' },
  { id: RoleEnum.principal,        name: 'Principal' },
  { id: RoleEnum.section_head,     name: 'Section Head' },
  { id: RoleEnum.teacher,          name: 'Teacher' },
  { id: RoleEnum.student,          name: 'Student' },
  { id: RoleEnum.guardian,         name: 'Guardian' },
  { id: RoleEnum.counselor,        name: 'Counselor' },
  { id: RoleEnum.security_officer, name: 'Security Officer' },
  { id: RoleEnum.librarian,        name: 'Librarian' },
  { id: RoleEnum.accountant,       name: 'Accountant' },
];

@Injectable()
export class RoleSeedService {
  constructor(
    @InjectRepository(RoleEntity)
    private repository: Repository<RoleEntity>,
  ) {}

  async run() {
    for (const role of ROLES) {
      const exists = await this.repository.count({ where: { id: role.id } });
      if (!exists) {
        await this.repository.save(this.repository.create(role));
      }
    }
  }
}
