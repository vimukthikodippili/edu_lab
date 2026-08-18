import { Controller, Get, HttpCode, HttpStatus, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../roles/roles.guard';
import { GlobalSearchService } from './global-search.service';
import { GlobalSearchQueryDto } from './dto/global-search-query.dto';

@ApiTags('Search')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'search', version: '1' })
export class GlobalSearchController {
  constructor(private readonly searchService: GlobalSearchService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Search across students, staff, and library books in one call, scoped to what the caller is allowed to see',
  })
  async search(
    @Query() query: GlobalSearchQueryDto,
    @Request() req: { user: { role?: { id: number } } },
  ) {
    const roleId = req.user.role?.id ?? -1;
    return this.searchService.search(query.q, roleId);
  }
}
