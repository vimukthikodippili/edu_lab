import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { LibraryService } from './library.service';
import { LoanStatus } from './entities/book-loan.entity';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { IssueBookDto } from './dto/issue-book.dto';
import { CreateDigitalBookDto } from './dto/create-digital-book.dto';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';

@ApiTags('Library')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'library', version: '1' })
export class LibraryController {
  constructor(
    private readonly libraryService: LibraryService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,
  ) {}

  private async resolveStaffId(userId: unknown): Promise<string> {
    const user = await this.usersService.findById(userId as number);
    if (!user?.email) throw new NotFoundException('User not found.');
    const staff = await this.staffService.findByEmail(user.email);
    if (!staff)
      throw new UnprocessableEntityException('No staff record linked to your account.');
    return staff.id;
  }

  // ─── Book Catalog ──────────────────────────────────────────────────────────

  @Get('books')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Browse the book catalog (all authenticated roles)' })
  findBooks(
    @Query('search') search?: string,
    @Query('subject') subject?: string,
    @Query('gradeLevel') gradeLevel?: string,
  ) {
    return this.libraryService.findBooks(search, subject, gradeLevel);
  }

  @Post('books')
  @Roles(RoleEnum.admin, RoleEnum.librarian)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a book to the catalog' })
  createBook(@Body() dto: CreateBookDto) {
    return this.libraryService.createBook(dto);
  }

  @Patch('books/:id')
  @Roles(RoleEnum.admin, RoleEnum.librarian)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update book details or copy count' })
  updateBook(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookDto,
  ) {
    return this.libraryService.updateBook(id, dto);
  }

  @Delete('books/:id')
  @Roles(RoleEnum.admin, RoleEnum.librarian)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a book from the catalog (no active loans allowed)' })
  async deleteBook(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.libraryService.deleteBook(id);
  }

  @Get('books/barcode/:barcode')
  @Roles(RoleEnum.admin, RoleEnum.librarian)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Look up a book by barcode (for scanner integration)' })
  findBookByBarcode(@Param('barcode') barcode: string) {
    return this.libraryService.findBookByBarcode(barcode);
  }

  // ─── Issuance & Return ────────────────────────────────────────────────────

  @Post('issuance')
  @Roles(RoleEnum.admin, RoleEnum.librarian)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Issue a book to a student' })
  async issueBook(
    @Body() dto: IssueBookDto,
    @Request() req: { user: { id: unknown } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.libraryService.issueBook(dto, staffId);
  }

  @Post('loans/:id/return')
  @Roles(RoleEnum.admin, RoleEnum.librarian)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Return a book; computes overdue fine automatically' })
  async returnBook(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: { id: unknown } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.libraryService.returnBook(id, staffId);
  }

  @Get('loans')
  @Roles(RoleEnum.admin, RoleEnum.librarian)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List active / returned loans, optionally filtered by status' })
  findLoans(
    @Query('status') status?: LoanStatus,
    @Query('studentId') studentId?: string,
    @Query('staffId') staffId?: string,
  ) {
    return this.libraryService.findLoans(status, studentId, staffId);
  }

  @Get('loans/mine')
  @Roles(RoleEnum.student, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "The calling student's or teacher's own currently-issued and past library loans",
  })
  async findMyLoans(
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    if (req.user.role?.id === RoleEnum.teacher) {
      const staffId = await this.resolveStaffId(req.user.id);
      return this.libraryService.findMyStaffLoans(staffId);
    }
    return this.libraryService.findMyLoans(req.user.id as number);
  }

  // ─── Fines ────────────────────────────────────────────────────────────────

  @Get('fines')
  @Roles(RoleEnum.admin, RoleEnum.librarian, RoleEnum.accountant)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List book loan fines; ?paid=false for unpaid only' })
  findFines(@Query('paid') paid?: string) {
    const paidFilter = paid !== undefined ? paid === 'true' : undefined;
    return this.libraryService.findFines(paidFilter);
  }

  @Post('fines/:loanId/pay')
  @Roles(RoleEnum.admin, RoleEnum.librarian, RoleEnum.accountant)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a library fine as paid' })
  markFinePaid(@Param('loanId', ParseUUIDPipe) loanId: string) {
    return this.libraryService.markFinePaid(loanId);
  }

  // ─── Digital Library ──────────────────────────────────────────────────────

  @Get('digital-books')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Browse the online PDF library (all authenticated roles)' })
  findDigitalBooks(@Query('all') all?: string) {
    return this.libraryService.findDigitalBooks(all !== 'true');
  }

  @Post('digital-books')
  @Roles(
    RoleEnum.admin,
    RoleEnum.principal,
    RoleEnum.section_head,
    RoleEnum.teacher,
    RoleEnum.counselor,
    RoleEnum.security_officer,
    RoleEnum.librarian,
    RoleEnum.accountant,
    RoleEnum.school_psychologist,
  )
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload a PDF to the online library (any staff role, not students)' })
  async createDigitalBook(
    @Body() dto: CreateDigitalBookDto,
    @Request() req: { user: { id: unknown; role?: { id: number } } },
  ) {
    const userId = req.user.id as number;
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found.');
    const uploaderName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Unknown';
    const isLibrarianOrAdmin = [RoleEnum.admin, RoleEnum.librarian].includes(
      req.user?.role?.id as RoleEnum,
    );
    return this.libraryService.createDigitalBook(dto, userId, uploaderName, isLibrarianOrAdmin);
  }

  @Patch('digital-books/:id/approve')
  @Roles(RoleEnum.admin, RoleEnum.librarian)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a pending digital book upload' })
  approveDigitalBook(@Param('id', ParseUUIDPipe) id: string) {
    return this.libraryService.approveDigitalBook(id);
  }

  @Delete('digital-books/:id')
  @Roles(RoleEnum.admin, RoleEnum.librarian)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a digital book from the library' })
  async deleteDigitalBook(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.libraryService.deleteDigitalBook(id);
  }
}
