import { Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from '../auth/auth.guard';
import { NotificationView } from './notification.graphql';
import { NotificationService } from './notification.service';
@Resolver(() => NotificationView)
@UseGuards(AuthGuard)
@Roles('ADMIN')
export class NotificationResolver {
  constructor(private service: NotificationService) {}
  @Query(() => [NotificationView]) notifications() { return this.service.list(); }
}
