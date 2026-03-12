import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AuditModule } from '../audit/audit.module';
import { AppointmentsWhatsappNotifierService } from './appointments-whatsapp-notifier.service';

@Module({
  imports: [AuditModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentsWhatsappNotifierService],
})
export class AppointmentsModule {}
