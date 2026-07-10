import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { ClassRoomsService } from './class-rooms.service';
import { ClassRoomQrPdfService } from './services/class-room-qr-pdf.service';
import { CreateClassRoomDto } from './dto/create-class-room.dto';

@ApiTags('Class Rooms')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'class-rooms', version: '1' })
export class ClassRoomsController {
  constructor(
    private readonly classRoomsService: ClassRoomsService,
    private readonly qrPdfService: ClassRoomQrPdfService,
  ) {}

  @Post()
  @Roles(RoleEnum.admin)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateClassRoomDto) {
    return this.classRoomsService.create(dto.roomNumber);
  }

  @Get()
  @Roles(RoleEnum.admin)
  async findAll() {
    return this.classRoomsService.findAll();
  }

  @Get('qr-codes/pdf')
  @Roles(RoleEnum.admin)
  async getQrCodesPdf() {
    const rooms = await this.classRoomsService.findAll();
    const buffer = await this.qrPdfService.generatePdf(rooms);
    const file = await this.qrPdfService.persistAsFile(buffer);
    return { url: file.path };
  }
}
