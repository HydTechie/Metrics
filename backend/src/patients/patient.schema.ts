import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
@Schema({ timestamps: true })
export class Patient {
  @Prop({ required: true, unique: true, index: true }) patientId: string;
  @Prop({ required: true, trim: true }) firstName: string;
  @Prop({ required: true, trim: true }) lastName: string;
  @Prop({ required: true }) dateOfBirth: Date;
  @Prop({ required: true, lowercase: true, trim: true }) email: string;
  @Prop({ required: true, trim: true }) phone: string;
}
export type PatientDocument = HydratedDocument<Patient>;
export const PatientSchema = SchemaFactory.createForClass(Patient);
PatientSchema.index({ lastName: 1, firstName: 1 });
