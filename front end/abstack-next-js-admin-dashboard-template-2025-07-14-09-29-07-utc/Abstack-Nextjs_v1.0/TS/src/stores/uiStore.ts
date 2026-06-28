import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  activeModal: string | null
  selectedGrade: number | null
  selectedClassId: string | null
  selectedAcademicYear: string
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  openModal: (id: string) => void
  closeModal: () => void
  setSelectedGrade: (grade: number | null) => void
  setSelectedClass: (classId: string | null) => void
  setAcademicYear: (year: string) => void
}

const currentYear = new Date().getFullYear()
const defaultAcademicYear = `${currentYear}/${currentYear + 1}`

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activeModal: null,
  selectedGrade: null,
  selectedClassId: null,
  selectedAcademicYear: defaultAcademicYear,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
  setSelectedGrade: (grade) => set({ selectedGrade: grade }),
  setSelectedClass: (classId) => set({ selectedClassId: classId }),
  setAcademicYear: (year) => set({ selectedAcademicYear: year }),
}))
