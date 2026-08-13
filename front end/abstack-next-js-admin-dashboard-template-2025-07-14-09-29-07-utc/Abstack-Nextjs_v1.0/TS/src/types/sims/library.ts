export interface Book {
  id: string
  title: string
  author: string
  isbn: string
  barcode: string
  category: string
  subject?: string
  gradeLevel?: string
  publisher?: string
  publishYear?: number
  totalCopies: number
  availableCopies: number
  location?: string
  status: 'available' | 'damaged' | 'lost'
}

export interface BookIssuance {
  id: string
  bookId: string
  bookTitle: string
  bookBarcode: string
  borrowerType: 'student' | 'staff'
  borrowerId: string
  borrowerName: string
  admissionNumber: string
  issuedAt: string
  dueAt: string
  returnedAt?: string
  fineAmount?: number | null
  finePaid: boolean
  status: 'active' | 'returned' | 'overdue'
  daysOverdue: number
}

export interface MyLibraryLoan {
  id: string
  bookId: string
  bookTitle: string
  bookBarcode: string
  studentId: string
  studentName: string
  admissionNumber: string
  issuedAt: string
  dueAt: string
  returnedAt: string | null
  fineAmount: number | null
  finePaid: boolean
  status: 'active' | 'returned' | 'overdue'
  daysOverdue: number
}

export interface LibraryFine {
  loanId: string
  bookTitle: string
  studentName: string
  admissionNumber: string
  issuedAt: string
  returnedAt: string | null
  fineAmount: number
  finePaid: boolean
  status: 'active' | 'returned' | 'overdue'
}

export interface DigitalBook {
  id: string
  title: string
  author: string
  subject?: string
  description?: string
  fileId: string
  filePath: string
  uploaderName: string
  isApproved: boolean
  createdAt: string
}
