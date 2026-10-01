import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Patient, PatientSchema } from './patient.schema';
import { PatientService } from './patient.service';
import { PatientResolver } from './patient.resolver';
@Module({ imports: [MongooseModule.forFeature([{ name: Patient.name, schema: PatientSchema }])], providers: [PatientService, PatientResolver], exports: [PatientService] })
export class PatientModule {}
