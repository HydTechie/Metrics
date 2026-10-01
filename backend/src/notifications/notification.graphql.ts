import { Field, ID, ObjectType } from '@nestjs/graphql';
@ObjectType()
export class NotificationView {
  @Field(() => ID) eventId: string;
  @Field() appointmentId: string;
  @Field() message: string;
  @Field() status: string;
}
