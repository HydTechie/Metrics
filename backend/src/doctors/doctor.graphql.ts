import { Field, ID, ObjectType } from '@nestjs/graphql';
@ObjectType()
export class DoctorView {
  @Field(() => ID) doctorId: string;
  @Field() name: string;
  @Field() specialization: string;
}
