import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Kafka, Producer, Consumer } from 'kafkajs';
import { OutboxEvent } from '../appointments/outbox.schema';
import { NotificationService } from './notification.service';

@Injectable()
export class EventTransport implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventTransport.name);
  private readonly kafka = new Kafka({ clientId: 'clinic-api', brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',') });
  private producer: Producer;
  private consumer: Consumer;
  private timer: NodeJS.Timeout;
  private connecting = false;
  private publishing = false;
  constructor(@InjectModel(OutboxEvent.name) private outbox: Model<OutboxEvent>, private notifications: NotificationService) {}
  async onModuleInit() {
    this.timer = setInterval(() => void this.publishPending().catch(() => this.logger.warn('Outbox polling failed; retrying on the next interval')), 3000);
    await this.connectKafka();
  }
  private async connectKafka() {
    if (this.connecting || this.producer) return;
    this.connecting = true;
    const producer = this.kafka.producer({ idempotent: true });
    const consumer = this.kafka.consumer({ groupId: 'clinic-notifications-v1' });
    try {
      await producer.connect();
      await consumer.connect();
      await consumer.subscribe({ topic: 'appointment-events', fromBeginning: true });
      await consumer.run({ eachMessage: async ({ message }) => {
        if (!message.value) return;
        const event = JSON.parse(message.value.toString());
        if (event.type === 'AppointmentBooked') await this.notifications.record(event.data);
      }});
      this.producer = producer;
      this.consumer = consumer;
    } catch (error) {
      this.logger.warn('Kafka unavailable; the outbox and consumer startup will retry');
      await consumer.disconnect().catch(() => undefined);
      await producer.disconnect().catch(() => undefined);
    } finally { this.connecting = false; }
  }
  private async publishPending() {
    if (!this.producer) { await this.connectKafka(); return; }
    if (this.publishing) return;
    this.publishing = true;
    try {
    const pending = await this.outbox.find({ status: { $in: ['PENDING', 'FAILED'] } }).sort({ createdAt: 1 }).limit(25).lean();
    for (const item of pending) {
      try {
        await this.producer.send({ topic: 'appointment-events', messages: [{ key: item.eventId, value: JSON.stringify({ eventId: item.eventId, type: item.eventType, version: 1, occurredAt: new Date().toISOString(), data: item.payload }) }] });
        await this.outbox.updateOne({ eventId: item.eventId, status: item.status }, { $set: { status: 'PUBLISHED', publishedAt: new Date() }, $inc: { attempts: 1 } });
      } catch (error) {
        await this.outbox.updateOne({ eventId: item.eventId }, { $set: { status: 'FAILED', lastError: String(error).slice(0, 500) }, $inc: { attempts: 1 } });
        this.logger.warn(`Event ${item.eventId} publish failed; retrying`);
        break;
      }
    }
    } finally { this.publishing = false; }
  }
  async onModuleDestroy() { clearInterval(this.timer); await this.consumer?.disconnect(); await this.producer?.disconnect(); }
}
