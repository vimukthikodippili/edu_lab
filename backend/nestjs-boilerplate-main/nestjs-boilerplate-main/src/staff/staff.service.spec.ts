import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { StaffService } from './staff.service';
import { StaffEntity, StaffStatus } from './entities/staff.entity';
import { StaffFunctionalRole, StaffRoleAssignmentEntity } from './entities/staff-role-assignment.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';
import { CreateStaffDto } from './dto/create-staff.dto';
import { QueryStaffDto } from './dto/query-staff.dto';
import { UsersService } from '../users/users.service';

// ─── Test helpers ─────────────────────────────────────────────────────────────

const STAFF_ID = 'staff-uuid-001';
const YEAR = new Date().getFullYear();

const baseCreateDto: CreateStaffDto = {
  firstName: 'Nimal',
  lastName: 'Perera',
  designation: 'Senior Teacher',
  department: 'Mathematics',
  startDate: '2020-01-15',
  email: 'nimal.perera@school.edu.lk',
  phone: '0771234567',
  nicNumber: '987654321V',
  qualifications: ['BSc Education'],
  roles: [StaffFunctionalRole.SUBJECT_TEACHER],
};

const makeStaff = (overrides: Partial<StaffEntity> = {}): StaffEntity =>
  ({
    id: STAFF_ID,
    employeeNumber: `EMP/${YEAR}/00001`,
    firstName: 'Nimal',
    lastName: 'Perera',
    designation: 'Senior Teacher',
    department: 'Mathematics',
    startDate: new Date('2020-01-15'),
    email: 'nimal.perera@school.edu.lk',
    phone: '0771234567',
    nicNumber: '987654321V',
    address: null,
    qualifications: ['BSc Education'],
    status: StaffStatus.ACTIVE,
    photoId: null,
    photo: null,
    roleAssignments: [
      { staffId: STAFF_ID, role: StaffFunctionalRole.SUBJECT_TEACHER } as StaffRoleAssignmentEntity,
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null as any,
    ...overrides,
  } as unknown as StaffEntity);

// ─── Repository factory ────────────────────────────────────────────────────────

const repoMock = <T>() => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn().mockImplementation((data: any) => data),
  createQueryBuilder: jest.fn(),
  softDelete: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  withDeleted: jest.fn().mockReturnThis(),
});

// ─── DataSource / transaction mock ────────────────────────────────────────────

const makeMockDataSource = (transactionImpl: (manager: any) => Promise<any>) => ({
  transaction: jest.fn().mockImplementation(transactionImpl),
});

// ─── UsersService mock (staff registration auto-provisions a login) ──────────

const usersServiceMock = {
  findByEmail: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('StaffService', () => {
  let service: StaffService;
  let staffRepo: jest.Mocked<Repository<StaffEntity>>;
  let roleRepo: jest.Mocked<Repository<StaffRoleAssignmentEntity>>;
  let fileRepo: jest.Mocked<Repository<FileEntity>>;

  const buildModule = async (transactionImpl: (manager: any) => Promise<any> = async (cb) => cb(mockManager)) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffService,
        { provide: getRepositoryToken(StaffEntity), useValue: repoMock<StaffEntity>() },
        { provide: getRepositoryToken(StaffRoleAssignmentEntity), useValue: repoMock<StaffRoleAssignmentEntity>() },
        { provide: getRepositoryToken(FileEntity), useValue: repoMock<FileEntity>() },
        { provide: DataSource, useValue: makeMockDataSource(transactionImpl) },
        { provide: UsersService, useValue: usersServiceMock },
      ],
    }).compile();

    service = module.get<StaffService>(StaffService);
    staffRepo = module.get(getRepositoryToken(StaffEntity));
    roleRepo = module.get(getRepositoryToken(StaffRoleAssignmentEntity));
    fileRepo = module.get(getRepositoryToken(FileEntity));
  };

  // Shared transactional manager mock
  const mockManager = {
    getRepository: jest.fn(),
    create: jest.fn().mockImplementation((_entity: any, data: any) => data),
    save: jest.fn(),
    delete: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset findOne to return null by default
    mockManager.findOne.mockResolvedValue(makeStaff());
    // No pre-existing login by default — create() will auto-provision one
    usersServiceMock.findByEmail.mockResolvedValue(null);
    usersServiceMock.create.mockResolvedValue({ id: 'user-uuid-001' });
  });

  // ─── Employee number generation ─────────────────────────────────────────────

  describe('create — employee number generation', () => {
    it('generates EMP/YYYY/00001 for the first staff of the year', async () => {
      await buildModule(async (cb) => {
        const qb = {
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          withDeleted: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null), // no existing staff
        };
        const txRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
        mockManager.getRepository.mockReturnValue(txRepo);
        mockManager.save.mockResolvedValue({ id: STAFF_ID });
        mockManager.findOne.mockResolvedValue(makeStaff());
        return cb(mockManager);
      });

      staffRepo.findOne
        .mockResolvedValueOnce(null)  // email check
        .mockResolvedValueOnce(null); // nic check

      const result = await service.create(baseCreateDto);
      expect(result.employeeNumber).toBe(`EMP/${YEAR}/00001`);
    });

    it('increments sequence from last existing employee number', async () => {
      await buildModule(async (cb) => {
        const lastStaff = { employeeNumber: `EMP/${YEAR}/00005` } as StaffEntity;
        const qb = {
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          withDeleted: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(lastStaff),
        };
        const txRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
        mockManager.getRepository.mockReturnValue(txRepo);
        mockManager.save.mockResolvedValue({ id: STAFF_ID });
        mockManager.findOne.mockResolvedValue(makeStaff({ employeeNumber: `EMP/${YEAR}/00006` }));
        return cb(mockManager);
      });

      staffRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await service.create(baseCreateDto);
      expect(result.employeeNumber).toBe(`EMP/${YEAR}/00006`);
    });
  });

  // ─── Create — validation ────────────────────────────────────────────────────

  describe('create — validation', () => {
    beforeEach(async () => {
      await buildModule();
    });

    it('throws 409 ConflictException when email already exists', async () => {
      staffRepo.findOne
        .mockResolvedValueOnce(makeStaff()) // email match found
        .mockResolvedValueOnce(null);

      await expect(service.create(baseCreateDto)).rejects.toThrow(ConflictException);
    });

    it('throws 409 ConflictException when NIC already exists', async () => {
      staffRepo.findOne
        .mockResolvedValueOnce(null)        // email ok
        .mockResolvedValueOnce(makeStaff()); // NIC match found

      await expect(service.create(baseCreateDto)).rejects.toThrow(ConflictException);
    });

    it('throws 422 when photoId file does not exist', async () => {
      staffRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      fileRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create({ ...baseCreateDto, photoId: 'nonexistent-uuid' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('saves all role assignments inside the transaction', async () => {
      await buildModule(async (cb) => {
        const qb = {
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          withDeleted: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        };
        const txRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
        mockManager.getRepository.mockReturnValue(txRepo);
        mockManager.save.mockResolvedValue({ id: STAFF_ID });
        const twoRoleStaff = makeStaff({
          roleAssignments: [
            { staffId: STAFF_ID, role: StaffFunctionalRole.SUBJECT_TEACHER } as StaffRoleAssignmentEntity,
            { staffId: STAFF_ID, role: StaffFunctionalRole.SPORTS_COACH } as StaffRoleAssignmentEntity,
          ],
        });
        mockManager.findOne.mockResolvedValue(twoRoleStaff);
        return cb(mockManager);
      });

      staffRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await service.create({
        ...baseCreateDto,
        roles: [StaffFunctionalRole.SUBJECT_TEACHER, StaffFunctionalRole.SPORTS_COACH],
      });
      expect(result.roleAssignments).toHaveLength(2);
      // delete old roles + save new batch
      expect(mockManager.delete).toHaveBeenCalledWith(StaffRoleAssignmentEntity, { staffId: STAFF_ID });
      expect(mockManager.save).toHaveBeenCalledTimes(2); // 1 for staff, 1 for roles
    });
  });

  // ─── create — portal account provisioning ──────────────────────────────────

  describe('create — portal account provisioning', () => {
    beforeEach(async () => {
      await buildModule();
      staffRepo.findOne
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce(null); // nic check
    });

    it('provisions a teacher login by default with the NIC as password', async () => {
      await service.create(baseCreateDto);

      expect(usersServiceMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: baseCreateDto.email,
          password: baseCreateDto.nicNumber,
          role: { id: 5 }, // RoleEnum.teacher
        }),
      );
    });

    it('provisions a section_head login when systemRoleId is given', async () => {
      await service.create({ ...baseCreateDto, systemRoleId: 4 });

      expect(usersServiceMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: { id: 4 } }), // RoleEnum.section_head
      );
    });

    it('uses the provided initialPassword instead of the NIC', async () => {
      await service.create({ ...baseCreateDto, initialPassword: 'Welcome@123' });

      expect(usersServiceMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'Welcome@123' }),
      );
    });

    it('does not create a duplicate login when one already exists for the email', async () => {
      usersServiceMock.findByEmail.mockResolvedValue({ id: 'existing-user' });

      await service.create(baseCreateDto);

      expect(usersServiceMock.create).not.toHaveBeenCalled();
    });
  });

  // ─── changeSystemRole — promote/demote portal access ───────────────────────

  describe('changeSystemRole', () => {
    beforeEach(async () => {
      await buildModule();
    });

    it('throws 404 when no user account is linked to the staff email', async () => {
      staffRepo.findOne.mockResolvedValue(makeStaff());
      usersServiceMock.findByEmail.mockResolvedValue(null);

      await expect(service.changeSystemRole(STAFF_ID, 4)).rejects.toThrow(NotFoundException);
      expect(usersServiceMock.update).not.toHaveBeenCalled();
    });

    it('updates the linked user account to the new role', async () => {
      staffRepo.findOne.mockResolvedValue(makeStaff());
      usersServiceMock.findByEmail.mockResolvedValue({ id: 'user-uuid-001' });

      await service.changeSystemRole(STAFF_ID, 4); // promote to section_head

      expect(usersServiceMock.update).toHaveBeenCalledWith('user-uuid-001', { role: { id: 4 } });
    });
  });

  // ─── findMany — search and filter ──────────────────────────────────────────

  describe('findMany — search and filter', () => {
    beforeEach(async () => {
      await buildModule();
    });

    const buildQb = (results: StaffEntity[]) => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([results, results.length]),
    });

    it('returns paginated results with no filters', async () => {
      const staff = [makeStaff(), makeStaff({ id: 'staff-2', employeeNumber: `EMP/${YEAR}/00002` })];
      staffRepo.createQueryBuilder.mockReturnValue(buildQb(staff) as any);

      const result = await service.findMany(new QueryStaffDto());
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('applies ILIKE search across name, designation, department', async () => {
      const qb = buildQb([makeStaff()]);
      staffRepo.createQueryBuilder.mockReturnValue(qb as any);

      await service.findMany({ search: 'perera' } as QueryStaffDto);
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.objectContaining({ q: '%perera%' }),
      );
    });

    it('filters by department (partial ILIKE match)', async () => {
      const qb = buildQb([makeStaff()]);
      staffRepo.createQueryBuilder.mockReturnValue(qb as any);

      await service.findMany({ department: 'Mathematics' } as QueryStaffDto);
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('department'),
        expect.objectContaining({ dept: '%Mathematics%' }),
      );
    });

    it('filters by functionalRole using EXISTS sub-select', async () => {
      const qb = buildQb([makeStaff()]);
      staffRepo.createQueryBuilder.mockReturnValue(qb as any);

      await service.findMany({ functionalRole: StaffFunctionalRole.SPORTS_COACH } as QueryStaffDto);
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('EXISTS'),
        expect.objectContaining({ role: StaffFunctionalRole.SPORTS_COACH }),
      );
    });

    it('filters by status', async () => {
      const qb = buildQb([makeStaff()]);
      staffRepo.createQueryBuilder.mockReturnValue(qb as any);

      await service.findMany({ status: StaffStatus.ACTIVE } as QueryStaffDto);
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('status'),
        expect.objectContaining({ status: StaffStatus.ACTIVE }),
      );
    });
  });

  // ─── Multi-role assignment ──────────────────────────────────────────────────

  describe('multi-role assignment', () => {
    beforeEach(async () => {
      await buildModule();
    });

    it('a staff member can hold subject_teacher + sports_coach simultaneously', async () => {
      const twoRoleStaff = makeStaff({
        roleAssignments: [
          { staffId: STAFF_ID, role: StaffFunctionalRole.SUBJECT_TEACHER } as StaffRoleAssignmentEntity,
          { staffId: STAFF_ID, role: StaffFunctionalRole.SPORTS_COACH } as StaffRoleAssignmentEntity,
        ],
      });
      staffRepo.findOne.mockResolvedValue(twoRoleStaff);

      const result = await service.findById(STAFF_ID);
      expect(result.roleAssignments.map((r) => r.role)).toContain(StaffFunctionalRole.SUBJECT_TEACHER);
      expect(result.roleAssignments.map((r) => r.role)).toContain(StaffFunctionalRole.SPORTS_COACH);
    });

    it('updateRoles atomically clears old roles and inserts new set', async () => {
      await buildModule(async (cb) => {
        mockManager.findOne.mockResolvedValue(makeStaff({
          roleAssignments: [
            { staffId: STAFF_ID, role: StaffFunctionalRole.CLASS_TEACHER } as StaffRoleAssignmentEntity,
          ],
        }));
        return cb(mockManager);
      });

      staffRepo.findOne.mockResolvedValue(makeStaff());

      await service.updateRoles(STAFF_ID, { roles: [StaffFunctionalRole.CLASS_TEACHER] });

      expect(mockManager.delete).toHaveBeenCalledWith(StaffRoleAssignmentEntity, { staffId: STAFF_ID });
      expect(mockManager.save).toHaveBeenCalledWith(
        StaffRoleAssignmentEntity,
        expect.arrayContaining([
          expect.objectContaining({ role: StaffFunctionalRole.CLASS_TEACHER }),
        ]),
      );
    });

    it('updateRoles throws 404 when staff does not exist', async () => {
      await buildModule();
      staffRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateRoles('nonexistent-uuid', { roles: [StaffFunctionalRole.COUNSELOR] }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findById / update / deactivate ────────────────────────────────────────

  describe('findById / update / deactivate', () => {
    beforeEach(async () => {
      await buildModule();
    });

    it('throws 404 NotFoundException when staff not found', async () => {
      staffRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('unknown-id')).rejects.toThrow(NotFoundException);
    });

    it('returns staff entity when found', async () => {
      const staff = makeStaff();
      staffRepo.findOne.mockResolvedValue(staff);

      const result = await service.findById(STAFF_ID);
      expect(result.id).toBe(STAFF_ID);
      expect(result.employeeNumber).toBe(`EMP/${YEAR}/00001`);
    });

    it('deactivate sets status to resigned and soft deletes', async () => {
      const staff = makeStaff();
      staffRepo.findOne.mockResolvedValue(staff);
      staffRepo.save.mockResolvedValue({ ...staff, status: StaffStatus.RESIGNED } as any);
      staffRepo.softDelete.mockResolvedValue({ affected: 1 } as any);

      await service.deactivate(STAFF_ID);

      expect(staffRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: StaffStatus.RESIGNED }),
      );
      expect(staffRepo.softDelete).toHaveBeenCalledWith(STAFF_ID);
    });

    it('deactivate throws 404 when staff does not exist', async () => {
      staffRepo.findOne.mockResolvedValue(null);

      await expect(service.deactivate('unknown-id')).rejects.toThrow(NotFoundException);
    });
  });
});
