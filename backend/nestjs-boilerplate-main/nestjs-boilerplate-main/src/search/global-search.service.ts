import { Injectable } from '@nestjs/common';
import { StudentsService } from '../students/students.service';
import { StaffService } from '../staff/staff.service';
import { LibraryService } from '../library/library.service';
import { RoleEnum } from '../roles/roles.enum';

export type GlobalSearchResultType = 'student' | 'staff' | 'book';

export interface GlobalSearchResult {
  type: GlobalSearchResultType;
  id: string;
  label: string;
  sublabel: string;
  url: string;
}

const RESULTS_PER_CATEGORY = 5;

// Mirrors the @Roles() gates already enforced on the underlying list endpoints
// (students.controller.ts findMany, staff.controller.ts findMany) — a category is only
// searched here if the caller could have queried that endpoint directly anyway.
const CAN_SEARCH_STUDENTS = [
  RoleEnum.admin,
  RoleEnum.principal,
  RoleEnum.section_head,
  RoleEnum.teacher,
  RoleEnum.counselor,
  RoleEnum.school_psychologist,
];
const CAN_SEARCH_STAFF = [
  RoleEnum.admin,
  RoleEnum.principal,
  RoleEnum.section_head,
  RoleEnum.security_officer,
  RoleEnum.librarian,
];

@Injectable()
export class GlobalSearchService {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly staffService: StaffService,
    private readonly libraryService: LibraryService,
  ) {}

  async search(q: string, callerRoleId: number): Promise<GlobalSearchResult[]> {
    const tasks: Promise<GlobalSearchResult[]>[] = [this.searchBooks(q)];

    if (CAN_SEARCH_STUDENTS.includes(callerRoleId)) {
      tasks.push(this.searchStudents(q));
    }
    if (CAN_SEARCH_STAFF.includes(callerRoleId)) {
      tasks.push(this.searchStaff(q));
    }

    const results = await Promise.all(tasks);
    return results.flat();
  }

  private async searchStudents(q: string): Promise<GlobalSearchResult[]> {
    const { data } = await this.studentsService.findMany({
      search: q,
      page: 1,
      limit: RESULTS_PER_CATEGORY,
    });
    return data.map((s) => ({
      type: 'student' as const,
      id: s.id,
      label: `${s.firstName} ${s.lastName}`,
      sublabel: `${s.admissionNumber} · ${s.grade?.name ?? ''} ${s.classSection?.name ?? ''}`.trim(),
      url: `/admin/students/${s.id}`,
    }));
  }

  private async searchStaff(q: string): Promise<GlobalSearchResult[]> {
    const { data } = await this.staffService.findMany({
      search: q,
      page: 1,
      limit: RESULTS_PER_CATEGORY,
    });
    return data.map((s) => ({
      type: 'staff' as const,
      id: s.id,
      label: `${s.firstName} ${s.lastName}`,
      sublabel: s.designation,
      url: `/admin/staff/${s.id}`,
    }));
  }

  private async searchBooks(q: string): Promise<GlobalSearchResult[]> {
    const books = await this.libraryService.findBooks(q);
    return books.slice(0, RESULTS_PER_CATEGORY).map((b) => ({
      type: 'book' as const,
      id: b.id,
      label: b.title,
      sublabel: b.author,
      url: `/library/catalog?search=${encodeURIComponent(b.title)}`,
    }));
  }
}
