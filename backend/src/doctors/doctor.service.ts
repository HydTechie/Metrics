import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Doctor } from './doctor.schema';
@Injectable()
export class DoctorService implements OnModuleInit {
  constructor(@InjectModel(Doctor.name) private model: Model<Doctor>) {}
  async onModuleInit() {
    if (await this.model.estimatedDocumentCount() === 0) await this.model.insertMany([
      { doctorId: 'D-1001', name: 'Dr. Maya Shah', specialization: 'Family Medicine' },
      { doctorId: 'D-1002', name: 'Dr. Arjun Rao', specialization: 'Pediatrics' },
      { doctorId: 'D-1003', name: 'Dr. Lina Thomas', specialization: 'Dermatology' },
    ]);
  }
  list() { return this.model.find().sort({ name: 1 }).lean(); }
  findById(doctorId: string) { return this.model.findOne({ doctorId }).lean(); }
}
