export interface Book {
  id: string
  title: string
  author: string
  isbn: string
  barcode: string
  category: string
  subject?: string
  gradeLevel?: number[]
  publisher?: string
  publishYear?: number
  totalCopies: number
  availableCopies: number
  location?: string
  status: 'available' | 'issued' | 'damaged' | 'lost'
}

export interface BookIssuance {
  id: string
  bookId: string
  bookTitle: string
  bookBarcode: string
  borrowerId: string
  borrowerName: string
  borrowerType: 'student' | 'teacher'
  issuedAt: string
  dueDate: string
  returnedAt?: string
  fineAmount?: number
  finePaid?: boolean
  status: 'issued' | 'returned' | 'overdue'
}

export interface LibraryFine {
  id: string
  issuanceId: string
  borrowerId: string
  borrowerName: string
  amount: number
  reason: string
  status: 'pending' | 'paid' | 'waived'
  paidAt?: string
}
