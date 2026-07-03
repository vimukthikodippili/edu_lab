import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { StaffEntity, StaffStatus } from './entities/staff.entity';
import { StaffFunctionalRole, StaffRoleAssignmentEntity } from './entities/staff-role-assignment.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { UpdateStaffRolesDto } from './dto/update-staff-roles.dto';
import { QueryStaffDto } from './dto/query-staff.dto';
import { UsersService } from '../users/users.service';
import { RoleEnum } from '../roles/roles.enum';
import { StatusEnum } from '../statuses/statuses.enum';

export interface PaginatedStaff {
  data: StaffEntity[];
  total: number;
  page: number;
  limit: number;
}

const STAFF_RELATIONS = ['roleAssignments', 'photo'];

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(StaffEntity)
    private readonly staffRepository: Repository<StaffEntity>,

    @InjectRepository(StaffRoleAssignmentEntity)
    private readonly roleRepository: Repository<StaffRoleAssignmentEntity>,

    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,

    private readonly dataSource: DataSource,

    private readonly usersService: UsersService,
  ) {}

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(dto: CreateStaffDto): Promise<StaffEntity> {
    // Pre-validate uniqueness before entering the transaction for a cleaner error message
    const [existingEmail, existingNic] = await Promise.all([
      this.staffRepository.findOne({ where: { email: dto.email }, withDeleted: true }),
      this.staffRepository.findOne({ where: { nicNumber: dto.nicNumber }, withDeleted: true }),
    ]);
    if (existingEmail) {
      throw new ConflictException(`A staff member with email "${dto.email}" already exists.`);
    }
    if (existingNic) {
      throw new ConflictException(`A staff member with NIC "${dto.nicNumber}" already exists.`);
    }

    // Validate photo if provided
    if (dto.photoId) {
      const photo = await this.fileRepository.findOne({ where: { id: dto.photoId } });
      if (!photo) {
        throw new UnprocessableEntityException({
          status: 422,
          errors: { photoId: `File with id ${dto.photoId} does not exist.` },
        });
      }
    }

    // Validate qualification documents if provided
    if (dto.qualificationDocIds?.length) {
      await this.validateQualificationDocs(dto.qualificationDocIds);
    }

    const staff = await this.dataSource.transaction(async (manager) => {
      const employeeNumber = await this.generateEmployeeNumber(
        manager.getRepository(StaffEntity),
      );

      const staff = await manager.save(
        StaffEntity,
        manager.create(StaffEntity, {
          employeeNumber,
          firstName: dto.firstName,
          lastName: dto.lastName,
          designation: dto.designation,
          department: dto.department,
          startDate: new Date(dto.startDate),
          email: dto.email,
          phone: dto.phone,
          nicNumber: dto.nicNumber,
          address: dto.address ?? null,
          qualifications: dto.qualifications ?? [],
          qualificationDocIds: dto.qualificationDocIds ?? [],
          status: StaffStatus.ACTIVE,
          photoId: dto.photoId ?? null,
        }),
      );

      await this.clearAndSaveRoles(manager, staff.id, dto.roles);

      return this.loadStaffViaManager(manager, staff.id);
    });

    await this.provisionUserAccount(staff, dto);

    return staff;
  }

  /**
   * Auto-creates the portal login for a newly registered staff member.
   * Without this, staff records existed with no way to ever log in.
   */
  private async provisionUserAccount(
    staff: StaffEntity,
    dto: CreateStaffDto,
  ): Promise<void> {
    const existingUser = await this.usersService.findByEmail(staff.email);
    if (existingUser) return;

    await this.usersService.create({
      firstName: staff.firstName,
      lastName: staff.lastName,
      email: staff.email,
      password: dto.initialPassword ?? staff.nicNumber,
      role: { id: dto.systemRoleId ?? RoleEnum.teacher },
      status: { id: StatusEnum.active },
    });
  }

  // ─── Read ─────────────────────────────────────────────────────────────────

  async findMany(query: QueryStaffDto): Promise<PaginatedStaff> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.staffRepository
      .createQueryBuilder('staff')
      .leftJoinAndSelect('staff.roleAssignments', 'roleAssignment')
      .leftJoinAndSelect('staff.photo', 'photo')
      .where('staff.deletedAt IS NULL');

    if (query.search) {
      qb.andWhere(
        `(staff.firstName ILIKE :q
          OR staff.lastName ILIKE :q
          OR staff.designation ILIKE :q
          OR staff.department ILIKE :q
          OR staff.email ILIKE :q)`,
        { q: `%${query.search}%` },
      );
    }
    if (query.department) {
      qb.andWhere('staff.department ILIKE :dept', { dept: `%${query.department}%` });
    }
    if (query.designation) {
      qb.andWhere('staff.designation ILIKE :desig', { desig: `%${query.designation}%` });
    }
    if (query.status) {
      qb.andWhere('staff.status = :status', { status: query.status });
    }
    if (query.functionalRole) {
      // Sub-select avoids duplicate rows from the LEFT JOIN when filtering on role
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM "staff_role_assignment" sra
          WHERE sra."staffId" = staff.id
          AND sra."role" = :role
        )`,
        { role: query.functionalRole },
      );
    }

    const [data, total] = await qb
      .orderBy('staff.lastName', 'ASC')
      .addOrderBy('staff.firstName', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findById(id: string): Promise<StaffEntity> {
    const staff = await this.staffRepository.findOne({
      where: { id },
      relations: STAFF_RELATIONS,
    });
    if (!staff) {
      throw new NotFoundException(`Staff member with id ${id} not found.`);
    }
    await this.attachQualDocs(staff);
    return staff;
  }

  async findByEmail(email: string): Promise<StaffEntity | null> {
    const staff = await this.staffRepository.findOne({
      where: { email },
      relations: STAFF_RELATIONS,
    });
    if (staff) await this.attachQualDocs(staff);
    return staff;
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateStaffDto): Promise<StaffEntity> {
    const staff = await this.findById(id);

    // Uniqueness checks only for fields being changed
    if (dto.email && dto.email !== staff.email) {
      const dup = await this.staffRepository.findOne({
        where: { email: dto.email },
        withDeleted: true,
      });
      if (dup) throw new ConflictException(`Email "${dto.email}" is already in use.`);
    }
    if (dto.nicNumber && dto.nicNumber !== staff.nicNumber) {
      const dup = await this.staffRepository.findOne({
        where: { nicNumber: dto.nicNumber },
        withDeleted: true,
      });
      if (dup) throw new ConflictException(`NIC "${dto.nicNumber}" is already in use.`);
    }
    if (dto.photoId && dto.photoId !== staff.photoId) {
      const photo = await this.fileRepository.findOne({ where: { id: dto.photoId } });
      if (!photo) {
        throw new UnprocessableEntityException({
          status: 422,
          errors: { photoId: `File with id ${dto.photoId} does not exist.` },
        });
      }
    }
    if (dto.qualificationDocIds?.length) {
      await this.validateQualificationDocs(dto.qualificationDocIds);
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.save(
        StaffEntity,
        manager.create(StaffEntity, {
          id,
          ...(dto.firstName !== undefined && { firstName: dto.firstName }),
          ...(dto.lastName !== undefined && { lastName: dto.lastName }),
          ...(dto.designation !== undefined && { designation: dto.designation }),
          ...(dto.department !== undefined && { department: dto.department }),
          ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
          ...(dto.email !== undefined && { email: dto.email }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
          ...(dto.nicNumber !== undefined && { nicNumber: dto.nicNumber }),
          ...(dto.address !== undefined && { address: dto.address ?? null }),
          ...(dto.qualifications !== undefined && { qualifications: dto.qualifications }),
          ...(dto.qualificationDocIds !== undefined && { qualificationDocIds: dto.qualificationDocIds }),
          ...(dto.photoId !== undefined && { photoId: dto.photoId ?? null }),
        }),
      );

      if (dto.roles !== undefined) {
        await this.clearAndSaveRoles(manager, id, dto.roles);
      }

      return this.loadStaffViaManager(manager, id);
    });
  }

  async updateRoles(id: string, dto: UpdateStaffRolesDto): Promise<StaffEntity> {
    // Verify staff exists before entering transaction
    await this.findById(id);

    return this.dataSource.transaction(async (manager) => {
      await this.clearAndSaveRoles(manager, id, dto.roles);
      return this.loadStaffViaManager(manager, id);
    });
  }

  // ─── Deactivate ───────────────────────────────────────────────────────────

  async deactivate(id: string): Promise<void> {
    const staff = await this.findById(id);
    await this.staffRepository.save({ ...staff, status: StaffStatus.RESIGNED });
    await this.staffRepository.softDelete(id);
  }

  // ─── Password management ──────────────────────────────────────────────────

  async setPassword(id: string, newPassword: string): Promise<void> {
    const staff = await this.findById(id);
    const user = await this.usersService.findByEmail(staff.email);
    if (!user) {
      throw new NotFoundException(
        `No user account is linked to staff email "${staff.email}". Create the user account first.`,
      );
    }
    await this.usersService.update(user.id, { password: newPassword });
  }

  // ─── Portal role management ────────────────────────────────────────────────

  /** Promotes/demotes a staff member's portal login between teacher and section_head. */
  async changeSystemRole(id: string, roleId: RoleEnum): Promise<StaffEntity> {
    const staff = await this.findById(id);
    const user = await this.usersService.findByEmail(staff.email);
    if (!user) {
      throw new NotFoundException(
        `No user account is linked to staff email "${staff.email}". Create the user account first.`,
      );
    }
    await this.usersService.update(user.id, { role: { id: roleId } });
    return staff;
  }

  async getSystemRole(id: string): Promise<{ hasAccount: boolean; roleId: number | null }> {
    const staff = await this.findById(id);
    const user = await this.usersService.findByEmail(staff.email);
    return {
      hasAccount: !!user,
      roleId: user?.role?.id ? Number(user.role.id) : null,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async validateQualificationDocs(ids: string[]): Promise<void> {
    const files = await this.fileRepository.findByIds(ids);
    if (files.length !== ids.length) {
      const foundIds = new Set(files.map((f) => f.id));
      const missing = ids.filter((id) => !foundIds.has(id));
      throw new UnprocessableEntityException({
        status: 422,
        errors: {
          qualificationDocIds: `Qualification document(s) not found: ${missing.join(', ')}`,
        },
      });
    }
  }

  private async generateEmployeeNumber(repo: Repository<StaffEntity>): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `EMP/${year}/`;

    const last = await repo
      .createQueryBuilder('s')
      .where('s.employeeNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('s.employeeNumber', 'DESC')
      .withDeleted()
      .getOne();

    let sequence = 1;
    if (last) {
      const parts = last.employeeNumber.split('/');
      const seq = parseInt(parts[2] ?? '0', 10);
      sequence = isNaN(seq) ? 1 : seq + 1;
    }

    return `${prefix}${String(sequence).padStart(5, '0')}`;
  }

  private async clearAndSaveRoles(
    manager: EntityManager,
    staffId: string,
    roles: StaffFunctionalRole[],
  ): Promise<void> {
    await manager.delete(StaffRoleAssignmentEntity, { staffId });
    if (roles.length > 0) {
      await manager.save(
        StaffRoleAssignmentEntity,
        roles.map((role) =>
          manager.create(StaffRoleAssignmentEntity, { staffId, role }),
        ),
      );
    }
  }

  private async loadStaffViaManager(
    manager: EntityManager,
    staffId: string,
  ): Promise<StaffEntity> {
    const staff = await manager.findOne(StaffEntity, {
      where: { id: staffId },
      relations: STAFF_RELATIONS,
    });
    if (!staff) {
      throw new NotFoundException(`Staff ${staffId} not found after save.`);
    }
    await this.attachQualDocs(staff);
    return staff;
  }

  private async attachQualDocs(staff: StaffEntity): Promise<void> {
    if (!staff.qualificationDocIds?.length) {
      staff.qualificationDocs = [];
      return;
    }
    const files = await this.fileRepository.findByIds(staff.qualificationDocIds);
    staff.qualificationDocs = files.map((f) => ({ id: f.id, path: f.path }));
  }
}
