import { Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Post, Request, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { StudentEntity } from '../students/entities/student.entity';
import { MoodCheckInService } from './mood-check-in.service';
import { SubmitMoodCheckInDto } from './dto/submit-mood-check-in.dto';

@ApiTags('Mood Check-In')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'mood-check-ins', version: '1' })
export class MoodCheckInController {
  constructor(
    private readonly moodCheckInService: MoodCheckInService,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,
  ) {}

  private async resolveStudentId(userId: number): Promise<string> {
    const student = await this.studentRepo.findOne({ where: { userId } });
    if (!student) {
      throw new NotFoundException(
        'Your account is not yet linked to a student record — contact your school administrator.',
      );
    }
    return student.id;
  }

  @Get('today')
  @Roles(RoleEnum.student)
  @HttpCode(HttpStatus.OK)
  async getTodayStatus(@Request() req: { user: { id: number } }) {
    const studentId = await this.resolveStudentId(req.user.id);
    return this.moodCheckInService.getTodayStatus(studentId);
  }

  @Post()
  @Roles(RoleEnum.student)
  @HttpCode(HttpStatus.CREATED)
  async submit(
    @Body() dto: SubmitMoodCheckInDto,
    @Request() req: { user: { id: number } },
  ) {
    const studentId = await this.resolveStudentId(req.user.id);
    return this.moodCheckInService.submit(studentId, dto.moodValue);
  }
}
