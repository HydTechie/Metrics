import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from '../auth/auth.guard';
import { CreatePatientInput, PatientPage, PatientView } from './patient.graphql';
import { PatientService } from './patient.service';
@Resolver(() => PatientView)
@UseGuards(AuthGuard)
@Roles('RECEPTIONIST', 'ADMIN')
export class PatientResolver {
  constructor(private service: PatientService) {}
  @Query(() => PatientPage) patients(@Args('search', { type: () => String, nullable: true }) search = '', @Args('page', { type: () => Int, nullable: true }) page = 1, @Args('limit', { type: () => Int, nullable: true }) limit = 10) { return this.service.list(search, page, limit); }
  @Mutation(() => PatientView) createPatient(@Args('input') input: CreatePatientInput) { return this.service.create(input); }
}
