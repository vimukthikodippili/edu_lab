import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LiveSessionsController } from './live-sessions.controller';
import { LiveSessionsService } from './live-sessions.service';
import { LiveKitService } from './livekit.service';
import { LiveAttendanceService } from './live-attendance.service';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import { StudentEntity } from '../students/entities/student.entity';
import { RoleEnum } from '../roles/roles.enum';

describe('LiveSessionsController — student self-resolution (class-scoping IDOR safety)', () => {
  let controller: LiveSessionsController;
  let studentRepo: { findOne: jest.Mock };
  let liveSessionsService: {
    findForClassSection: jest.Mock;
    findMine: jest.Mock;
    create: jest.Mock;
    findById: jest.Mock;
    assertCanHost: jest.Mock;
    assertCanJoinAsStudent: jest.Mock;
    endSession: jest.Mock;
    startRecordingFor: jest.Mock;
    stopRecordingFor: jest.Mock;
    attachWhiteboardSnapshot: jest.Mock;
    notifySessionStarted: jest.Mock;
  };
  let liveKitService: { mintToken: jest.Mock; endRoom: jest.Mock };
  let liveAttendanceService: { recordJoin: jest.Mock; recordLeave: jest.Mock; findForSession: jest.Mock };
  let usersService: { findById: jest.Mock };
  let staffService: { findByEmail: jest.Mock };
  let configService: { get: jest.Mock };

  const makeReq = (roleId: number, userId: number = 1) => ({
    user: { id: userId, role: { id: roleId } },
  });

  beforeEach(async () => {
    studentRepo = { findOne: jest.fn() };
    liveSessionsService = {
      findForClassSection: jest.fn(),
      findMine: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      assertCanHost: jest.fn(),
      assertCanJoinAsStudent: jest.fn(),
      endSession: jest.fn(),
      startRecordingFor: jest.fn().mockResolvedValue(undefined),
      stopRecordingFor: jest.fn().mockResolvedValue(undefined),
      attachWhiteboardSnapshot: jest.fn(),
      notifySessionStarted: jest.fn(),
    };
    liveKitService = { mintToken: jest.fn(), endRoom: jest.fn() };
    liveAttendanceService = { recordJoin: jest.fn(), recordLeave: jest.fn(), findForSession: jest.fn() };
    usersService = { findById: jest.fn() };
    staffService = { findByEmail: jest.fn() };
    configService = { get: jest.fn().mockReturnValue(10) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LiveSessionsController],
      providers: [
        { provide: LiveSessionsService, useValue: liveSessionsService },
        { provide: LiveKitService, useValue: liveKitService },
        { provide: LiveAttendanceService, useValue: liveAttendanceService },
        { provide: UsersService, useValue: usersService },
        { provide: StaffService, useValue: staffService },
        { provide: ConfigService, useValue: configService },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
      ],
    }).compile();

    controller = module.get<LiveSessionsController>(LiveSessionsController);
  });

  describe('GET /lms/live-classes/my-class', () => {
    it("resolves the caller's own classSectionId from their StudentEntity — there is no client-supplied id to pass", async () => {
      studentRepo.findOne.mockResolvedValue({ id: 'student-1', classSectionId: 7 });
      liveSessionsService.findForClassSection.mockResolvedValue([]);

      await controller.findForMyClass(makeReq(RoleEnum.student, 42));

      expect(studentRepo.findOne).toHaveBeenCalledWith({ where: { userId: 42 } });
      expect(liveSessionsService.findForClassSection).toHaveBeenCalledWith(7, 10);
    });

    it('throws NotFoundException when the caller has no linked student record', async () => {
      studentRepo.findOne.mockResolvedValue(null);

      await expect(controller.findForMyClass(makeReq(RoleEnum.student, 99))).rejects.toThrow(
        NotFoundException,
      );
      expect(liveSessionsService.findForClassSection).not.toHaveBeenCalled();
    });

    it('resolves a different classSectionId for a different caller — proving no cross-class leakage via a shared code path', async () => {
      studentRepo.findOne.mockResolvedValueOnce({ id: 'student-1', classSectionId: 1 });
      await controller.findForMyClass(makeReq(RoleEnum.student, 1));
      expect(liveSessionsService.findForClassSection).toHaveBeenLastCalledWith(1, 10);

      studentRepo.findOne.mockResolvedValueOnce({ id: 'student-2', classSectionId: 2 });
      await controller.findForMyClass(makeReq(RoleEnum.student, 2));
      expect(liveSessionsService.findForClassSection).toHaveBeenLastCalledWith(2, 10);
    });
  });

  describe('GET /lms/live-classes/mine', () => {
    it("resolves the caller's own staffId via resolveStaffId and passes it to the service", async () => {
      usersService.findById.mockResolvedValue({ email: 'teacher2@gmail.com' });
      staffService.findByEmail.mockResolvedValue({ id: 'staff-1' });
      liveSessionsService.findMine.mockResolvedValue([]);

      await controller.findMine(makeReq(RoleEnum.teacher, 10));

      expect(liveSessionsService.findMine).toHaveBeenCalledWith('staff-1', 10);
    });
  });

  describe('POST /lms/live-classes', () => {
    it('resolves staffId and privilege flag, passing both through to the service', async () => {
      usersService.findById.mockResolvedValue({ email: 'sectionhead@sims.edu.lk' });
      staffService.findByEmail.mockResolvedValue({ id: 'staff-2' });
      liveSessionsService.create.mockResolvedValue({ id: 'session-1' });

      const dto = {
        classSectionId: 1,
        subjectId: 'subj-1',
        scheduledAt: '2026-08-01T09:00:00.000Z',
        joinUrl: 'https://meet.google.com/abc-defg-hij',
      };
      await controller.create(dto as any, makeReq(RoleEnum.section_head, 20));

      expect(liveSessionsService.create).toHaveBeenCalledWith(dto, 'staff-2', true);
    });
  });

  describe('POST /lms/live-classes/:id/token', () => {
    it("mints a token for a student using their own self-resolved identity — never a client-supplied studentId", async () => {
      liveSessionsService.findById.mockResolvedValue({ id: 'session-1', classSectionId: 7 });
      studentRepo.findOne.mockResolvedValue({
        id: 'student-1',
        classSectionId: 7,
        firstName: 'A',
        lastName: 'One',
      });
      liveKitService.mintToken.mockResolvedValue({ token: 'jwt', url: 'wss://x' });

      const result = await controller.mintToken('session-1', makeReq(RoleEnum.student, 42));

      expect(studentRepo.findOne).toHaveBeenCalledWith({ where: { userId: 42 } });
      expect(liveSessionsService.assertCanJoinAsStudent).toHaveBeenCalledWith(
        { id: 'session-1', classSectionId: 7 },
        7,
        10,
      );
      expect(liveKitService.mintToken).toHaveBeenCalledWith(
        'session-1',
        'student-1',
        'A One',
        false,
      );
      expect(result).toEqual({ token: 'jwt', url: 'wss://x' });
    });

    it('throws NotFoundException for a student with no linked student record', async () => {
      liveSessionsService.findById.mockResolvedValue({ id: 'session-1', classSectionId: 7 });
      studentRepo.findOne.mockResolvedValue(null);

      await expect(
        controller.mintToken('session-1', makeReq(RoleEnum.student, 99)),
      ).rejects.toThrow(NotFoundException);
      expect(liveKitService.mintToken).not.toHaveBeenCalled();
    });

    it("mints a token for a teacher using their own resolved staff identity, and starts recording on this connect", async () => {
      const session = { id: 'session-1' };
      liveSessionsService.findById.mockResolvedValue(session);
      usersService.findById.mockResolvedValue({ email: 'teacher2@gmail.com' });
      staffService.findByEmail.mockResolvedValue({
        id: 'staff-1',
        firstName: 'T',
        lastName: 'Two',
      });
      liveKitService.mintToken.mockResolvedValue({ token: 'jwt', url: 'wss://x' });

      const result = await controller.mintToken('session-1', makeReq(RoleEnum.teacher, 10));

      expect(liveSessionsService.assertCanHost).toHaveBeenCalledWith(
        { id: 'session-1' },
        'staff-1',
        false,
      );
      expect(liveSessionsService.startRecordingFor).toHaveBeenCalledWith(session);
      expect(liveSessionsService.notifySessionStarted).toHaveBeenCalledWith(session);
      expect(liveKitService.mintToken).toHaveBeenCalledWith(
        'session-1',
        'staff-1',
        'T Two',
        true,
      );
      expect(result).toEqual({ token: 'jwt', url: 'wss://x' });
    });

    it('does not attempt to start recording on a student token mint', async () => {
      liveSessionsService.findById.mockResolvedValue({ id: 'session-1', classSectionId: 7 });
      studentRepo.findOne.mockResolvedValue({
        id: 'student-1',
        classSectionId: 7,
        firstName: 'A',
        lastName: 'One',
      });
      liveKitService.mintToken.mockResolvedValue({ token: 'jwt', url: 'wss://x' });

      await controller.mintToken('session-1', makeReq(RoleEnum.student, 42));

      expect(liveSessionsService.startRecordingFor).not.toHaveBeenCalled();
    });

    it('a recording-start failure (e.g. egress storage unconfigured) does not fail the token response', async () => {
      liveSessionsService.findById.mockResolvedValue({ id: 'session-1' });
      usersService.findById.mockResolvedValue({ email: 'teacher2@gmail.com' });
      staffService.findByEmail.mockResolvedValue({ id: 'staff-1', firstName: 'T', lastName: 'Two' });
      liveSessionsService.startRecordingFor.mockRejectedValue(new Error('not configured'));
      liveKitService.mintToken.mockResolvedValue({ token: 'jwt', url: 'wss://x' });

      const result = await controller.mintToken('session-1', makeReq(RoleEnum.teacher, 10));

      expect(result).toEqual({ token: 'jwt', url: 'wss://x' });
    });

    it('a notifySessionStarted failure (e.g. a broken listener) does not fail the token response', async () => {
      liveSessionsService.findById.mockResolvedValue({ id: 'session-1' });
      usersService.findById.mockResolvedValue({ email: 'teacher2@gmail.com' });
      staffService.findByEmail.mockResolvedValue({ id: 'staff-1', firstName: 'T', lastName: 'Two' });
      liveSessionsService.notifySessionStarted.mockImplementation(() => {
        throw new Error('emit failed');
      });
      liveKitService.mintToken.mockResolvedValue({ token: 'jwt', url: 'wss://x' });

      const result = await controller.mintToken('session-1', makeReq(RoleEnum.teacher, 10));

      expect(result).toEqual({ token: 'jwt', url: 'wss://x' });
    });
  });

  describe('POST /lms/live-classes/:id/end', () => {
    it('resolves the caller staffId, ends the session via the service, ends the LiveKit room, and stops recording', async () => {
      usersService.findById.mockResolvedValue({ email: 'teacher2@gmail.com' });
      staffService.findByEmail.mockResolvedValue({ id: 'staff-1' });
      const endedSession = { id: 'session-1', endedAt: new Date() };
      liveSessionsService.endSession.mockResolvedValue(endedSession);
      liveKitService.endRoom.mockResolvedValue(undefined);

      const result = await controller.end('session-1', makeReq(RoleEnum.teacher, 10));

      expect(liveSessionsService.endSession).toHaveBeenCalledWith('session-1', 'staff-1', false);
      expect(liveKitService.endRoom).toHaveBeenCalledWith('session-1');
      expect(liveSessionsService.stopRecordingFor).toHaveBeenCalledWith(endedSession);
      expect(result.id).toBe('session-1');
    });

    it('a recording-stop failure does not fail the end-session response', async () => {
      usersService.findById.mockResolvedValue({ email: 'teacher2@gmail.com' });
      staffService.findByEmail.mockResolvedValue({ id: 'staff-1' });
      liveSessionsService.endSession.mockResolvedValue({ id: 'session-1', endedAt: new Date() });
      liveKitService.endRoom.mockResolvedValue(undefined);
      liveSessionsService.stopRecordingFor.mockRejectedValue(new Error('egress unreachable'));

      const result = await controller.end('session-1', makeReq(RoleEnum.teacher, 10));

      expect(result.id).toBe('session-1');
    });
  });

  describe('POST /lms/live-classes/:id/whiteboard-snapshot', () => {
    it("resolves the caller's own staffId and passes both file ids through to the service", async () => {
      usersService.findById.mockResolvedValue({ email: 'teacher2@gmail.com' });
      staffService.findByEmail.mockResolvedValue({ id: 'staff-1' });
      const updatedSession = { id: 'session-1', whiteboardSnapshotFileId: 'file-png' };
      liveSessionsService.attachWhiteboardSnapshot.mockResolvedValue(updatedSession);

      const result = await controller.attachWhiteboardSnapshot(
        'session-1',
        { imageFileId: 'file-png', pdfFileId: 'file-pdf' },
        makeReq(RoleEnum.teacher, 10),
      );

      expect(liveSessionsService.attachWhiteboardSnapshot).toHaveBeenCalledWith(
        'session-1',
        { imageFileId: 'file-png', pdfFileId: 'file-pdf' },
        'staff-1',
        false,
      );
      expect(result).toEqual(updatedSession);
    });

    it('passes pdfFileId through as undefined when omitted', async () => {
      usersService.findById.mockResolvedValue({ email: 'teacher2@gmail.com' });
      staffService.findByEmail.mockResolvedValue({ id: 'staff-1' });
      liveSessionsService.attachWhiteboardSnapshot.mockResolvedValue({ id: 'session-1' });

      await controller.attachWhiteboardSnapshot(
        'session-1',
        { imageFileId: 'file-png' },
        makeReq(RoleEnum.teacher, 10),
      );

      expect(liveSessionsService.attachWhiteboardSnapshot).toHaveBeenCalledWith(
        'session-1',
        { imageFileId: 'file-png', pdfFileId: undefined },
        'staff-1',
        false,
      );
    });
  });

  describe('POST /lms/live-classes/:id/attendance/join', () => {
    it("resolves the caller's own studentId — there is no client-supplied studentId to forge — and gates on the join window before recording", async () => {
      liveSessionsService.findById.mockResolvedValue({ id: 'session-1', classSectionId: 7 });
      studentRepo.findOne.mockResolvedValue({ id: 'student-1', classSectionId: 7 });
      liveAttendanceService.recordJoin.mockResolvedValue({ id: 'attendance-1' });

      const result = await controller.recordJoin('session-1', makeReq(RoleEnum.student, 42));

      expect(studentRepo.findOne).toHaveBeenCalledWith({ where: { userId: 42 } });
      expect(liveSessionsService.assertCanJoinAsStudent).toHaveBeenCalledWith(
        { id: 'session-1', classSectionId: 7 },
        7,
        10,
      );
      expect(liveAttendanceService.recordJoin).toHaveBeenCalledWith('session-1', 'student-1');
      expect(result).toEqual({ id: 'attendance-1' });
    });

    it('throws NotFoundException when the caller has no linked student record', async () => {
      liveSessionsService.findById.mockResolvedValue({ id: 'session-1' });
      studentRepo.findOne.mockResolvedValue(null);

      await expect(
        controller.recordJoin('session-1', makeReq(RoleEnum.student, 99)),
      ).rejects.toThrow(NotFoundException);
      expect(liveAttendanceService.recordJoin).not.toHaveBeenCalled();
    });
  });

  describe('POST /lms/live-classes/:id/attendance/leave', () => {
    it("resolves the caller's own studentId and passes it to the service", async () => {
      studentRepo.findOne.mockResolvedValue({ id: 'student-1' });
      liveAttendanceService.recordLeave.mockResolvedValue({ id: 'attendance-1', leftAt: new Date() });

      await controller.recordLeave('session-1', makeReq(RoleEnum.student, 42));

      expect(liveAttendanceService.recordLeave).toHaveBeenCalledWith('session-1', 'student-1');
    });
  });

  describe('GET /lms/live-classes/:id/attendance', () => {
    it("resolves the caller's own staffId, authorizes via assertCanHost, then returns the roster", async () => {
      liveSessionsService.findById.mockResolvedValue({ id: 'session-1' });
      usersService.findById.mockResolvedValue({ email: 'teacher2@gmail.com' });
      staffService.findByEmail.mockResolvedValue({ id: 'staff-1' });
      liveAttendanceService.findForSession.mockResolvedValue([]);

      await controller.getAttendance('session-1', makeReq(RoleEnum.teacher, 10));

      expect(liveSessionsService.assertCanHost).toHaveBeenCalledWith(
        { id: 'session-1' },
        'staff-1',
        false,
      );
      expect(liveAttendanceService.findForSession).toHaveBeenCalledWith('session-1');
    });
  });
});
