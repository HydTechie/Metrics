import { Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from '../auth/auth.guard';
import { DoctorView } from './doctor.graphql';
import { DoctorService } from './doctor.service';
@Resolver(() => DoctorView)
@UseGuards(AuthGuard)
@Roles('RECEPTIONIST', 'ADMIN')
export class DoctorResolver {
  constructor(private service: DoctorService) {}
  @Query(() => [DoctorView]) doctors() { return this.service.list(); }
}
