import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { MongooseModule } from '@nestjs/mongoose';
import { Request } from 'express';
import { AuthModule } from './auth/auth.module';
import { PatientModule } from './patients/patient.module';
import { DoctorModule } from './doctors/doctor.module';
import { AppointmentModule } from './appointments/appointment.module';
import { NotificationModule } from './notifications/notification.module';
import { CacheModule } from './cache/cache.module';

const mongodbUri = process.env.MONGODB_URI;
if (!mongodbUri) throw new Error('MONGODB_URI must be configured for the selected environment.');
const mongoUrl = new URL(mongodbUri);
if (!mongoUrl.username || !mongoUrl.password) throw new Error('MONGODB_URI must include an authenticated database user.');

@Module({
  imports: [
    MongooseModule.forRoot(mongodbUri),
    GraphQLModule.forRoot<ApolloDriverConfig>({ driver: ApolloDriver, autoSchemaFile: true, sortSchema: true, context: ({ req }: { req: Request }) => ({ req }) }),
    CacheModule, AuthModule, PatientModule, DoctorModule, AppointmentModule, NotificationModule,
  ],
})
export class AppModule {}
