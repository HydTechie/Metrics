import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { LoginCodeResult, LoginResult } from './auth.graphql';

@Resolver()
export class AuthResolver {
  constructor(private readonly auth: AuthService) {}

  @Mutation(() => LoginCodeResult)
  requestLoginCode(@Args('phone') phone: string) {
    return this.auth.requestCode(phone);
  }

  @Mutation(() => LoginResult)
  verifyLoginCode(@Args('phone') phone: string, @Args('code') code: string) {
    return this.auth.verifyCode(phone, code);
  }

  @Mutation(() => LoginResult)
  verifyAuthenticatorCode(@Args('mfaToken') mfaToken: string, @Args('code') code: string) {
    return this.auth.verifyAuthenticatorCode(mfaToken, code);
  }
}
