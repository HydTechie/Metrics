import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import { Appointment } from './appointment.schema';
import { OutboxEvent } from './outbox.schema';
import { PatientService } from '../patients/patient.service';
import { DoctorService } from '../doctors/doctor.service';
import { BookAppointmentInput } from './appointment.graphql';

@Injectable()
export class AppointmentService {
  constructor(@InjectModel(Appointment.name) private appointments: Model<Appointment>, @InjectModel(OutboxEvent.name) private outbox: Model<OutboxEvent>, private patients: PatientService, private doctors: DoctorService) {}
  async book(input: BookAppointmentInput) {
    const startsAt = new Date(input.startsAt);
    if (Number.isNaN(startsAt.getTime()) || startsAt.getSeconds() || startsAt.getMilliseconds() || startsAt.getMinutes() % 30 !== 0) throw new BadRequestException('Appointment must start on a 30-minute boundary');
    if (startsAt.getTime() <= Date.now()) throw new BadRequestException('Appointment must be in the future');
    const [patient, doctor] = await Promise.all([this.patients.findById(input.patientId), this.doctors.findById(input.doctorId)]);
    if (!patient) throw new NotFoundException('Patient not found');
    if (!doctor) throw new NotFoundException('Doctor not found');
    const appointmentId = `A-${randomUUID().slice(0, 8).toUpperCase()}`;
    const eventId = randomUUID();
    const patientName = `${patient.firstName} ${patient.lastName}`;
    try {
      const session = await this.appointments.db.startSession();
      let appointment: any;
      try {
        await session.withTransaction(async () => {
          [appointment] = await this.appointments.create([{ appointmentId, patientId: patient.patientId, patientName, doctorId: doctor.doctorId, doctorName: doctor.name, startsAt, endsAt: new Date(startsAt.getTime() + 30 * 60_000), status: 'BOOKED' }], { session });
          await this.outbox.create([{ eventId, eventType: 'AppointmentBooked', status: 'PENDING', payload: { eventId, appointmentId, patientId: patient.patientId, patientName, doctorId: doctor.doctorId, doctorName: doctor.name, startsAt: startsAt.toISOString() } }], { session });
        });
      } finally { await session.endSession(); }
      return { ...appointment.toObject(), startsAt: appointment.startsAt.toISOString(), endsAt: appointment.endsAt.toISOString() };
    } catch (error) {
      if ((error as any)?.code === 11000) throw new ConflictException('Doctor already has an appointment starting at this time');
      throw error;
    }
  }
  async list() {
    const items = await this.appointments.find().sort({ startsAt: 1 }).limit(100).lean();
    return items.map(a => ({ ...a, startsAt: new Date(a.startsAt).toISOString(), endsAt: new Date(a.endsAt).toISOString() }));
  }
  async cancel(appointmentId: string) {
    const result = await this.appointments.findOneAndUpdate({ appointmentId, status: 'BOOKED' }, { $set: { status: 'CANCELLED' } }, { new: true }).lean();
    if (!result) throw new NotFoundException('Booked appointment not found');
    return { ...result, startsAt: new Date(result.startsAt).toISOString(), endsAt: new Date(result.endsAt).toISOString() };
  }
}
