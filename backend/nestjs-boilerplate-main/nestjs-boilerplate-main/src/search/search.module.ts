import { Module } from '@nestjs/common';
import { GlobalSearchController } from './global-search.controller';
import { GlobalSearchService } from './global-search.service';
import { StudentsModule } from '../students/students.module';
import { StaffModule } from '../staff/staff.module';
import { LibraryModule } from '../library/library.module';

@Module({
  imports: [StudentsModule, StaffModule, LibraryModule],
  controllers: [GlobalSearchController],
  providers: [GlobalSearchService],
})
export class SearchModule {}
