import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import { Patient } from './patient.schema';
import { CreatePatientInput } from './patient.graphql';
import { RedisService } from '../cache/redis.service';

const RECENT_PATIENTS_KEY = 'patients:recent:v1';
const RECENT_PATIENTS_DAYS = 90;
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 91;

@Injectable()
export class PatientService implements OnModuleInit {
  private readonly logger = new Logger(PatientService.name);
  constructor(@InjectModel(Patient.name) private model: Model<Patient>, private redis: RedisService) {}

  async onModuleInit() {
    if (!this.redis.enabled) return;
    try {
      await this.warmRecentCache(this.cutoff());
      this.logger.log(`Warmed Redis patient search cache for the last ${RECENT_PATIENTS_DAYS} days`);
    } catch (error) {
      this.logger.warn(`Redis patient cache warm-up deferred: ${(error as Error).message}`);
    }
  }

  private cutoff() { return Date.now() - RECENT_PATIENTS_DAYS * 24 * 60 * 60 * 1000; }

  private async warmRecentCache(cutoff: number) {
    const recent = await this.model.find({ createdAt: { $gte: new Date(cutoff) } }).sort({ createdAt: 1 }).limit(50000).lean();
    await this.redis.replaceRecentPatients(RECENT_PATIENTS_KEY, recent.map(patient => ({
      score: new Date((patient as any).createdAt).getTime(),
      value: JSON.stringify({ ...patient, dateOfBirth: new Date(patient.dateOfBirth).toISOString() }),
    })), CACHE_TTL_SECONDS);
  }

  private async recentCachedPatients(cutoff: number) {
    if (!this.redis.enabled) return [];
    let values = await this.redis.recentPatients(RECENT_PATIENTS_KEY, cutoff);
    if (values === null || values.length === 0) {
      await this.warmRecentCache(cutoff);
      values = await this.redis.recentPatients(RECENT_PATIENTS_KEY, cutoff);
    }
    return (values ?? []).flatMap(value => { try { return [JSON.parse(value)]; } catch { return []; } });
  }
  async create(input: CreatePatientInput) {
    const patient = await this.model.create({ ...input, dateOfBirth: new Date(input.dateOfBirth), patientId: `P-${randomUUID().slice(0, 8).toUpperCase()}` });
    const result = { ...patient.toObject(), dateOfBirth: patient.dateOfBirth.toISOString() };
    await this.redis.addRecentPatient(RECENT_PATIENTS_KEY, (patient as any).createdAt.getTime(), JSON.stringify(result), this.cutoff(), CACHE_TTL_SECONDS);
    return result;
  }
  async list(search = '', page = 1, limit = 10) {
    const safePage = Math.max(1, page), safeLimit = Math.min(50, Math.max(1, limit));
    const term = search.trim();
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const filter = term ? { $or: [
      ...['firstName', 'lastName', 'email', 'phone'].map(field => ({ [field]: { $regex: escapedTerm, $options: 'i' } })),
      { $expr: { $regexMatch: { input: { $dateToString: { format: '%Y-%m-%d', date: '$dateOfBirth' } }, regex: escapedTerm, options: 'i' } } },
    ] } : {};
    if (term && this.redis.enabled) {
      const cutoff = this.cutoff();
      const recent = (await this.recentCachedPatients(cutoff)).filter((patient: any) => [patient.firstName, patient.lastName, patient.email, patient.phone, patient.dateOfBirth].some(value => String(value).toLowerCase().includes(term.toLowerCase())));
      const older = await this.model.find({ ...filter, createdAt: { $lt: new Date(cutoff) } }).sort({ lastName: 1, firstName: 1 }).lean();
      const items = [...recent, ...older.map(p => ({ ...p, dateOfBirth: new Date(p.dateOfBirth).toISOString() }))].sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`));
      return { items: items.slice((safePage - 1) * safeLimit, safePage * safeLimit), total: items.length, page: safePage, limit: safeLimit };
    }
    const [items, total] = await Promise.all([this.model.find(filter).sort({ lastName: 1, firstName: 1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).lean(), this.model.countDocuments(filter)]);
    return { items: items.map(p => ({ ...p, dateOfBirth: new Date(p.dateOfBirth).toISOString() })), total, page: safePage, limit: safeLimit };
  }
  findById(patientId: string) { return this.model.findOne({ patientId }).lean(); }
}
