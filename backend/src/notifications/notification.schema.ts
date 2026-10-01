import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true, unique: true, index: true }) eventId: string;
  @Prop({ required: true }) appointmentId: string;
  @Prop({ required: true }) message: string;
  @Prop({ default: 'CREATED' }) status: string;
}
export const NotificationSchema = SchemaFactory.createForClass(Notification);
