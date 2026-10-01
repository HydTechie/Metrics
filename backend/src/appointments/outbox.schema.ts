import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';
@Schema({ timestamps: true })
export class OutboxEvent {
  @Prop({ required: true, unique: true }) eventId: string;
  @Prop({ required: true }) eventType: string;
  @Prop({ required: true, type: MongooseSchema.Types.Mixed }) payload: Record<string, unknown>;
  @Prop({ default: 'PENDING', index: true }) status: string;
  @Prop({ default: 0 }) attempts: number;
  @Prop() lastError?: string;
  @Prop() publishedAt?: Date;
}
export const OutboxSchema = SchemaFactory.createForClass(OutboxEvent);
