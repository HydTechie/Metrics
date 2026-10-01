import { Field, ID, InputType, ObjectType } from '@nestjs/graphql';
import { IsDateString, IsNotEmpty } from 'class-validator';
@ObjectType()
export class AppointmentView {
  @Field(() => ID) appointmentId: string;
  @Field() patientId: string;
  @Field() patientName: string;
  @Field() doctorId: string;
  @Field() doctorName: string;
  @Field() startsAt: string;
  @Field() endsAt: string;
  @Field() status: string;
}
@InputType()
export class BookAppointmentInput {
  @Field() @IsNotEmpty() patientId: string;
  @Field() @IsNotEmpty() doctorId: string;
  @Field() @IsDateString() startsAt: string;
}
