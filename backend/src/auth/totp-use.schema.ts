import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class TotpUse {
  @Prop({ required: true, unique: true, index: true }) phone: string;
  @Prop({ required: true, default: -1 }) lastCounter: number;
}

export const TotpUseSchema = SchemaFactory.createForClass(TotpUse);
