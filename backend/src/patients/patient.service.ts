import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import { Patient } from './patient.schema';
import { CreatePatientInput } from './patient.graphql';

@Injectable()
export class PatientService {
  constructor(@InjectModel(Patient.name) private model: Model<Patient>) {}
  async create(input: CreatePatientInput) {
    const patient = await this.model.create({ ...input, dateOfBirth: new Date(input.dateOfBirth), patientId: `P-${randomUUID().slice(0, 8).toUpperCase()}` });
    return { ...patient.toObject(), dateOfBirth: patient.dateOfBirth.toISOString() };
  }
  async list(search = '', page = 1, limit = 10) {
    const safePage = Math.max(1, page), safeLimit = Math.min(50, Math.max(1, limit));
    const filter = search.trim() ? { $or: ['firstName', 'lastName'].map(k => ({ [k]: { $regex: search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } })) } : {};
    const [items, total] = await Promise.all([this.model.find(filter).sort({ lastName: 1, firstName: 1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).lean(), this.model.countDocuments(filter)]);
    return { items: items.map(p => ({ ...p, dateOfBirth: new Date(p.dateOfBirth).toISOString() })), total, page: safePage, limit: safeLimit };
  }
  findById(patientId: string) { return this.model.findOne({ patientId }).lean(); }
}
