import { ExamHallPdfService } from './exam-hall-pdf.service';
import { ExamHallEntity } from './entities/exam-hall.entity';
import { ExamSeatEntity } from './entities/exam-seat.entity';
import { ExamSeatAllocationEntity } from './entities/exam-seat-allocation.entity';
import { StudentEntity } from '../students/entities/student.entity';

function buildHall(overrides: Partial<ExamHallEntity> = {}): ExamHallEntity {
  return { id: 'hall-1', name: 'Main Hall', capacity: 6, rowCount: 2, columnCount: 3, building: null, floor: null, ...overrides } as ExamHallEntity;
}

function buildSeat(overrides: Partial<ExamSeatEntity> = {}): ExamSeatEntity {
  return { id: 'seat-1', examHallId: 'hall-1', seatLabel: 'A1', rowNumber: 1, columnNumber: 1, ...overrides } as ExamSeatEntity;
}

function buildAllocation(overrides: Partial<ExamSeatAllocationEntity> = {}): ExamSeatAllocationEntity {
  return { id: 'alloc-1', examId: 'exam-1', examHallId: 'hall-1', examSeatId: 'seat-1', studentId: 'student-1', specialNeeds: false, allocatedAt: new Date(), ...overrides } as ExamSeatAllocationEntity;
}

function buildStudent(overrides: Partial<StudentEntity> = {}): StudentEntity {
  return { id: 'student-1', firstName: 'Nimal', lastName: 'Perera', admissionNumber: 'SIMS/2026/00001', ...overrides } as StudentEntity;
}

describe('ExamHallPdfService — buildSeatingGrid (AI-prompt test)', () => {
  // Pure/synchronous method — no repos are touched, so constructor args can be undefined.
  const service = new ExamHallPdfService(undefined as never, undefined as never, undefined as never, undefined as never, undefined as never);

  it('places the correct student at the correct [row][column] coordinate', () => {
    const hall = buildHall({ rowCount: 2, columnCount: 3 });
    const seats = [
      buildSeat({ id: 's-a1', seatLabel: 'A1', rowNumber: 1, columnNumber: 1 }),
      buildSeat({ id: 's-a2', seatLabel: 'A2', rowNumber: 1, columnNumber: 2 }),
      buildSeat({ id: 's-a3', seatLabel: 'A3', rowNumber: 1, columnNumber: 3 }),
      buildSeat({ id: 's-b1', seatLabel: 'B1', rowNumber: 2, columnNumber: 1 }),
      buildSeat({ id: 's-b2', seatLabel: 'B2', rowNumber: 2, columnNumber: 2 }),
      buildSeat({ id: 's-b3', seatLabel: 'B3', rowNumber: 2, columnNumber: 3 }),
    ];
    // Only A2 and B3 are occupied — the rest should render as empty (null student).
    const allocations = [
      buildAllocation({ examSeatId: 's-a2', studentId: 'student-a2' }),
      buildAllocation({ examSeatId: 's-b3', studentId: 'student-b3' }),
    ];
    const students = [
      buildStudent({ id: 'student-a2', firstName: 'Kamal', lastName: 'Silva', admissionNumber: 'SIMS/2026/00010' }),
      buildStudent({ id: 'student-b3', firstName: 'Nadeesha', lastName: 'Fernando', admissionNumber: 'SIMS/2026/00020' }),
    ];

    const grid = service.buildSeatingGrid(hall, seats, allocations, students);

    expect(grid).toHaveLength(2); // rowCount
    expect(grid[0]).toHaveLength(3); // columnCount

    // A2 -> grid[0][1]
    expect(grid[0][1]).toEqual({ seatLabel: 'A2', studentName: 'Kamal Silva', admissionNumber: 'SIMS/2026/00010' });
    // B3 -> grid[1][2]
    expect(grid[1][2]).toEqual({ seatLabel: 'B3', studentName: 'Nadeesha Fernando', admissionNumber: 'SIMS/2026/00020' });

    // Unoccupied seats still show their seat label but null student info
    expect(grid[0][0]).toEqual({ seatLabel: 'A1', studentName: null, admissionNumber: null });
    expect(grid[0][2]).toEqual({ seatLabel: 'A3', studentName: null, admissionNumber: null });
    expect(grid[1][0]).toEqual({ seatLabel: 'B1', studentName: null, admissionNumber: null });
    expect(grid[1][1]).toEqual({ seatLabel: 'B2', studentName: null, admissionNumber: null });
  });

  it('never mixes up two students seated in the same hall', () => {
    const hall = buildHall({ rowCount: 1, columnCount: 2 });
    const seats = [
      buildSeat({ id: 's-a1', seatLabel: 'A1', rowNumber: 1, columnNumber: 1 }),
      buildSeat({ id: 's-a2', seatLabel: 'A2', rowNumber: 1, columnNumber: 2 }),
    ];
    const allocations = [
      buildAllocation({ examSeatId: 's-a1', studentId: 'student-left' }),
      buildAllocation({ examSeatId: 's-a2', studentId: 'student-right' }),
    ];
    const students = [
      buildStudent({ id: 'student-left', firstName: 'Left', lastName: 'Student' }),
      buildStudent({ id: 'student-right', firstName: 'Right', lastName: 'Student' }),
    ];

    const grid = service.buildSeatingGrid(hall, seats, allocations, students);

    expect(grid[0][0].studentName).toBe('Left Student');
    expect(grid[0][1].studentName).toBe('Right Student');
  });

  it('ignores a seat whose row/column falls outside the hall dimensions (defensive)', () => {
    const hall = buildHall({ rowCount: 1, columnCount: 1 });
    const seats = [buildSeat({ id: 's-out', seatLabel: 'Z9', rowNumber: 5, columnNumber: 5 })];

    const grid = service.buildSeatingGrid(hall, seats, [], []);

    expect(grid).toHaveLength(1);
    expect(grid[0]).toHaveLength(1);
    expect(grid[0][0]).toEqual({ seatLabel: '', studentName: null, admissionNumber: null });
  });
});
