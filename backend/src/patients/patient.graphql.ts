import { Field, ID, Int, ObjectType, InputType } from '@nestjs/graphql';
import { IsDateString, IsEmail, IsNotEmpty, MaxLength } from 'class-validator';
@ObjectType()
export class PatientView {
  @Field(() => ID) patientId: string;
  @Field() firstName: string;
  @Field() lastName: string;
  @Field() dateOfBirth: string;
  @Field() email: string;
  @Field() phone: string;
}
@ObjectType()
export class PatientPage {
  @Field(() => [PatientView]) items: PatientView[];
  @Field(() => Int) total: number;
  @Field(() => Int) page: number;
  @Field(() => Int) limit: number;
}
@InputType()
export class CreatePatientInput {
  @Field() @IsNotEmpty() @MaxLength(80) firstName: string;
  @Field() @IsNotEmpty() @MaxLength(80) lastName: string;
  @Field() @IsDateString() dateOfBirth: string;
  @Field() @IsEmail() email: string;
  @Field() @IsNotEmpty() @MaxLength(32) phone: string;
}
