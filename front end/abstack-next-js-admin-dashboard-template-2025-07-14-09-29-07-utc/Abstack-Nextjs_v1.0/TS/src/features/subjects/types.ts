export interface SubjectCategory {
  id: number;
  name: string;
  description?: string | null;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  categoryId: number;
  category: SubjectCategory;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectFilter {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: number;
  includeInactive?: boolean;
}

export interface PaginatedSubjects {
  data: Subject[];
  total: number;
  page: number;
  limit: number;
}

export interface CategoryFormValues {
  name: string;
  description?: string;
  color: string;
}

export interface SubjectFormValues {
  code: string;
  name: string;
  description?: string;
  categoryId: number;
}
