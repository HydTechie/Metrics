import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
@Schema({ timestamps: true })
export class Doctor {
  @Prop({ required: true, unique: true, index: true }) doctorId: string;
  @Prop({ required: true }) name: string;
  @Prop({ required: true }) specialization: string;
}
export const DoctorSchema = SchemaFactory.createForClass(Doctor);
