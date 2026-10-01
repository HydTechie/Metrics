import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from '../auth/auth.guard';
import { AppointmentView, BookAppointmentInput } from './appointment.graphql';
import { AppointmentService } from './appointment.service';
@Resolver(() => AppointmentView)
@UseGuards(AuthGuard)
@Roles('RECEPTIONIST', 'ADMIN')
export class AppointmentResolver {
  constructor(private service: AppointmentService) {}
  @Query(() => [AppointmentView]) appointments() { return this.service.list(); }
  @Mutation(() => AppointmentView) bookAppointment(@Args('input') input: BookAppointmentInput) { return this.service.book(input); }
  @Mutation(() => AppointmentView) cancelAppointment(@Args('appointmentId') appointmentId: string) { return this.service.cancel(appointmentId); }
}
