import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Notification, NotificationSchema } from './notification.schema';
import { NotificationService } from './notification.service';
import { NotificationResolver } from './notification.resolver';
import { EventTransport } from './event-transport.service';
import { OutboxEvent, OutboxSchema } from '../appointments/outbox.schema';
@Module({ imports: [MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }, { name: OutboxEvent.name, schema: OutboxSchema }])], providers: [NotificationService, NotificationResolver, EventTransport], exports: [EventTransport] })
export class NotificationModule {}
