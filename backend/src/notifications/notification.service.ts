import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from './notification.schema';
type BookedPayload = { eventId: string; appointmentId: string; patientId: string; patientName: string; doctorId: string; doctorName: string; startsAt: string };
@Injectable()
export class NotificationService {
  constructor(@InjectModel(Notification.name) private model: Model<Notification>) {}
  async record(event: BookedPayload) {
    await this.model.updateOne({ eventId: event.eventId }, { $setOnInsert: { eventId: event.eventId, appointmentId: event.appointmentId, message: `Appointment booked successfully for Patient ${event.patientId} with Doctor ${event.doctorId}.`, status: 'CREATED' } }, { upsert: true });
  }
  list() { return this.model.find().sort({ createdAt: -1 }).limit(50).lean(); }
}
