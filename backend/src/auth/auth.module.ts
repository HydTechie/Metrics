import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { OtpChallenge, OtpChallengeSchema } from './otp-challenge.schema';
import { TotpUse, TotpUseSchema } from './totp-use.schema';

@Module({
  imports: [MongooseModule.forFeature([
    { name: OtpChallenge.name, schema: OtpChallengeSchema },
    { name: TotpUse.name, schema: TotpUseSchema },
  ])],
  providers: [AuthGuard, AuthService, AuthResolver],
  exports: [AuthGuard],
})
export class AuthModule {}
