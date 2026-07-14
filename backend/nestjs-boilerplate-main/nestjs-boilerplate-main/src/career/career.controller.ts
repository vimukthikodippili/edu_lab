import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { CareerAssessmentService } from './career.service';
import { SubmitOceanDto } from './dto/submit-ocean.dto';
import { SubmitRiasecDto } from './dto/submit-riasec.dto';
import { buildTraitDescriptions } from './career-scoring';
import { CareerAssessmentEntity } from './entities/career-assessment.entity';

@ApiTags('Career Self-Discovery')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'career', version: '1' })
export class CareerController {
  constructor(private readonly careerService: CareerAssessmentService) {}

  private toResult(assessment: CareerAssessmentEntity) {
    return {
      id: assessment.id,
      academicYear: assessment.academicYear,
      oceanScores: assessment.oceanScores,
      oceanTraitDescriptions: assessment.oceanScores
        ? buildTraitDescriptions(assessment.oceanScores)
        : [],
      riasecScores: assessment.riasecScores,
      riasecSuggestions: assessment.riasecSuggestions,
      createdAt: assessment.createdAt,
    };
  }

  @Get('ocean')
  @Roles(RoleEnum.student)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Simplified Big Five (OCEAN) questionnaire items (FR-CE-01)' })
  getOceanQuestions() {
    return this.careerService.getOceanQuestions();
  }

  @Get('riasec')
  @Roles(RoleEnum.student)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'RIASEC interest inventory items (FR-CE-02)' })
  getRiasecQuestions() {
    return this.careerService.getRiasecQuestions();
  }

  @Post('ocean/submit')
  @Roles(RoleEnum.student)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit OCEAN answers — starts a new self-discovery attempt' })
  async submitOcean(@Body() dto: SubmitOceanDto, @Request() req: { user: { id: number } }) {
    const assessment = await this.careerService.submitOcean(req.user.id, dto.answers);
    return this.toResult(assessment);
  }

  @Post('riasec/submit')
  @Roles(RoleEnum.student)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit RIASEC answers — completes the attempt started by ocean/submit' })
  async submitRiasec(@Body() dto: SubmitRiasecDto, @Request() req: { user: { id: number } }) {
    const assessment = await this.careerService.submitRiasec(
      req.user.id,
      dto.assessmentId,
      dto.answers,
    );
    return this.toResult(assessment);
  }

  @Get('results/me')
  @Roles(RoleEnum.student)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'My own self-discovery attempt history, newest first (FR-CE-05)' })
  async findMyResults(@Request() req: { user: { id: number } }) {
    const results = await this.careerService.findMyResults(req.user.id);
    return results.map((r) => this.toResult(r));
  }

  @Get('results/by-user/:userId')
  @Roles(RoleEnum.counselor, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'A specific student\'s self-discovery attempt history, for the counselor discussion flow (FR-CE-04). ' +
      'The caller supplies the userId already resolved from a studentId lookup elsewhere — this module never ' +
      'resolves that itself, to preserve its zero-dependency-on-StudentEntity isolation guarantee.',
  })
  async findForUser(@Param('userId', ParseIntPipe) userId: number) {
    const results = await this.careerService.findForUser(userId);
    return results.map((r) => this.toResult(r));
  }
}
