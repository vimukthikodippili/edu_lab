import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassRoomEntity } from './entities/class-room.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';
import { ClassRoomsService } from './class-rooms.service';
import { ClassRoomQrPdfService } from './services/class-room-qr-pdf.service';
import { ClassRoomsController } from './class-rooms.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ClassRoomEntity, FileEntity])],
  providers: [ClassRoomsService, ClassRoomQrPdfService],
  controllers: [ClassRoomsController],
  exports: [ClassRoomsService],
})
export class ClassRoomsModule {}
