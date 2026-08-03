import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ExamHallEntity } from './entities/exam-hall.entity';
import { ExamSeatEntity } from './entities/exam-seat.entity';
import { CreateExamHallDto } from './dto/create-exam-hall.dto';

export interface ExamHallWithSeats {
  hall: ExamHallEntity;
  seats: ExamSeatEntity[];
}

function rowLetter(rowNumber: number): string {
  // 1 -> A, 2 -> B, ..., 26 -> Z, 27 -> AA — Excel-column-style, comfortably covers any real hall.
  let n = rowNumber;
  let label = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

/** P5-EH — FR-P5-EH-01/02/03. A hall is a shared physical resource, not owned by any one grade —
 * no grade-range scoping here (unlike ExamService/ExamSeatAllocationService). `capacity` is
 * always `rowCount * columnCount`, computed server-side rather than trusted from the client, so
 * it can never drift out of sync with the actual seat grid. */
@Injectable()
export class ExamHallService {
  constructor(
    @InjectRepository(ExamHallEntity)
    private readonly hallRepo: Repository<ExamHallEntity>,

    @InjectRepository(ExamSeatEntity)
    private readonly seatRepo: Repository<ExamSeatEntity>,

    private readonly dataSource: DataSource,
  ) {}

  async createHall(dto: CreateExamHallDto): Promise<ExamHallWithSeats> {
    return this.dataSource.transaction(async (manager) => {
      const capacity = dto.rowCount * dto.columnCount;
      const hall = manager.create(ExamHallEntity, {
        name: dto.name,
        building: dto.building ?? null,
        floor: dto.floor ?? null,
        capacity,
        rowCount: dto.rowCount,
        columnCount: dto.columnCount,
      });
      const savedHall = await manager.save(ExamHallEntity, hall);

      const seats: ExamSeatEntity[] = [];
      for (let row = 1; row <= dto.rowCount; row++) {
        for (let col = 1; col <= dto.columnCount; col++) {
          seats.push(
            manager.create(ExamSeatEntity, {
              examHallId: savedHall.id,
              seatLabel: `${rowLetter(row)}${col}`,
              rowNumber: row,
              columnNumber: col,
            }),
          );
        }
      }
      const savedSeats = await manager.save(ExamSeatEntity, seats);

      return { hall: savedHall, seats: savedSeats };
    });
  }

  async findAll(): Promise<ExamHallEntity[]> {
    return this.hallRepo.find({ order: { name: 'ASC' } });
  }

  async getById(id: string): Promise<ExamHallWithSeats> {
    const hall = await this.hallRepo.findOne({ where: { id } });
    if (!hall) {
      throw new NotFoundException(`Exam hall ${id} not found.`);
    }
    const seats = await this.seatRepo.find({
      where: { examHallId: id },
      order: { rowNumber: 'ASC', columnNumber: 'ASC' },
    });
    return { hall, seats };
  }
}
