import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class OtpChallenge {
  @Prop({ required: true, unique: true, index: true }) phone: string;
  @Prop({ required: true }) codeHash: string;
  @Prop({ required: true }) expiresAt: Date;
  @Prop({ required: true, default: 0 }) attempts: number;
  @Prop({ required: true, default: false }) consumed: boolean;
  @Prop() mfaTokenHash?: string;
  @Prop() mfaExpiresAt?: Date;
  @Prop({ default: 0 }) mfaAttempts: number;
  @Prop({ default: false }) mfaConsumed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export const OtpChallengeSchema = SchemaFactory.createForClass(OtpChallenge);
