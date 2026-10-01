import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
@Schema({ timestamps: true })
export class Appointment {
  @Prop({ required: true, unique: true, index: true }) appointmentId: string;
  @Prop({ required: true, index: true }) patientId: string;
  @Prop({ required: true }) patientName: string;
  @Prop({ required: true, index: true }) doctorId: string;
  @Prop({ required: true }) doctorName: string;
  @Prop({ required: true }) startsAt: Date;
  @Prop({ required: true }) endsAt: Date;
  @Prop({ required: true, enum: ['BOOKED', 'CANCELLED'], default: 'BOOKED' }) status: string;
}
export type AppointmentDocument = HydratedDocument<Appointment>;
export const AppointmentSchema = SchemaFactory.createForClass(Appointment);
AppointmentSchema.index({ doctorId: 1, startsAt: 1 }, { unique: true, partialFilterExpression: { status: 'BOOKED' }, name: 'one_booked_appointment_per_doctor_start' });
AppointmentSchema.index({ startsAt: 1, status: 1 });
