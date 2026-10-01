import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Appointment, AppointmentSchema } from './appointment.schema';
import { OutboxEvent, OutboxSchema } from './outbox.schema';
import { AppointmentService } from './appointment.service';
import { AppointmentResolver } from './appointment.resolver';
import { PatientModule } from '../patients/patient.module';
import { DoctorModule } from '../doctors/doctor.module';
import { NotificationModule } from '../notifications/notification.module';
@Module({ imports: [MongooseModule.forFeature([{ name: Appointment.name, schema: AppointmentSchema }, { name: OutboxEvent.name, schema: OutboxSchema }]), PatientModule, DoctorModule, NotificationModule], providers: [AppointmentService, AppointmentResolver] })
export class AppointmentModule {}
