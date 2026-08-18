import { GlobalSearchService } from './global-search.service';
import { RoleEnum } from '../roles/roles.enum';
import { StudentsService } from '../students/students.service';
import { StaffService } from '../staff/staff.service';
import { LibraryService } from '../library/library.service';

describe('GlobalSearchService', () => {
  let service: GlobalSearchService;
  let studentsService: jest.Mocked<Pick<StudentsService, 'findMany'>>;
  let staffService: jest.Mocked<Pick<StaffService, 'findMany'>>;
  let libraryService: jest.Mocked<Pick<LibraryService, 'findBooks'>>;

  beforeEach(() => {
    studentsService = { findMany: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 5 }) };
    staffService = { findMany: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 5 }) };
    libraryService = { findBooks: jest.fn().mockResolvedValue([]) };

    service = new GlobalSearchService(
      studentsService as unknown as StudentsService,
      staffService as unknown as StaffService,
      libraryService as unknown as LibraryService,
    );
  });

  it('always searches the book catalog, regardless of role', async () => {
    libraryService.findBooks.mockResolvedValue([
      { id: 'b1', title: 'Algebra Basics', author: 'J. Silva' } as never,
    ]);

    const results = await service.search('algebra', RoleEnum.student);

    expect(libraryService.findBooks).toHaveBeenCalledWith('algebra');
    expect(results).toEqual([
      expect.objectContaining({ type: 'book', id: 'b1', label: 'Algebra Basics' }),
    ]);
    expect(studentsService.findMany).not.toHaveBeenCalled();
    expect(staffService.findMany).not.toHaveBeenCalled();
  });

  it('includes student results only for roles allowed to search students directly', async () => {
    studentsService.findMany.mockResolvedValue({
      data: [
        {
          id: 's1',
          firstName: 'Kasun',
          lastName: 'Bandara',
          admissionNumber: 'SIMS/2020/001',
          grade: { name: 'Grade 6' },
          classSection: { name: 'A' },
        } as never,
      ],
      total: 1,
      page: 1,
      limit: 5,
    });

    const results = await service.search('kasun', RoleEnum.teacher);

    expect(results.some((r) => r.type === 'student' && r.id === 's1')).toBe(true);
  });

  it('excludes student and staff categories for a role that cannot search either directly (e.g. student caller)', async () => {
    const results = await service.search('x', RoleEnum.student);

    expect(studentsService.findMany).not.toHaveBeenCalled();
    expect(staffService.findMany).not.toHaveBeenCalled();
    expect(results.every((r) => r.type === 'book')).toBe(true);
  });

  it('includes staff results only for roles allowed to search staff directly', async () => {
    staffService.findMany.mockResolvedValue({
      data: [{ id: 'st1', firstName: 'Nimal', lastName: 'Perera', designation: 'Librarian' } as never],
      total: 1,
      page: 1,
      limit: 5,
    });

    const results = await service.search('nimal', RoleEnum.librarian);

    expect(results.some((r) => r.type === 'staff' && r.id === 'st1')).toBe(true);
  });
});
