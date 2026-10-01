import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class LoginCodeResult {
  @Field() message: string;
  @Field({ nullable: true }) devCode?: string;
}

@ObjectType()
export class LoginResult {
  @Field({ nullable: true }) accessToken?: string;
  @Field({ nullable: true }) role?: string;
  @Field() mfaRequired: boolean;
  @Field({ nullable: true }) mfaToken?: string;
}
