import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookEntity } from './entities/book.entity';
import { BookLoanEntity } from './entities/book-loan.entity';
import { DigitalBookEntity } from './entities/digital-book.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';
import { LibraryService } from './library.service';
import { LibraryController } from './library.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookEntity,
      BookLoanEntity,
      DigitalBookEntity,
      FileEntity,
      StudentEntity,
      StaffEntity,
    ]),
    UsersModule,
    StaffModule,
  ],
  providers: [LibraryService],
  controllers: [LibraryController],
  exports: [LibraryService],
})
export class LibraryModule {}
