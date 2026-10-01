# Event design and reliability

## AppointmentBooked v1

```json
{
  "eventId": "4d4aaf5d-6d72-4a0f-b2fb-03b433714554",
  "type": "AppointmentBooked",
  "version": 1,
  "occurredAt": "2026-09-30T10:00:00.000Z",
  "data": { "eventId": "4d4aaf5d-6d72-4a0f-b2fb-03b433714554", "appointmentId": "A-91E4D43A", "patientId": "P-31F08BA2", "patientName": "Asha Mehta", "doctorId": "D-1001", "doctorName": "Dr. Maya Shah", "startsAt": "2026-10-01T04:30:00.000Z" }
}
```

Events are immutable facts and carry an explicit version. Additive optional fields can remain v1; incompatible changes get a new version and consumers support both versions during migration. In production, validate envelopes with a schema registry and compatibility policy.

The outbox row and appointment are saved in one MongoDB transaction. A background publisher retries `PENDING` or `FAILED` rows and marks successful sends `PUBLISHED`. If Kafka is unavailable, appointments remain committed and event rows remain recoverable; production should alert on oldest pending age and retry count. A crash after Kafka accepts a message but before the outbox update can publish a duplicate, so delivery is at least once. The notification collection's unique `eventId` and upsert make processing idempotent. Consumer offsets advance only after the handler completes; handler failures are retried by KafkaJS. Production should add bounded exponential backoff, a dead-letter topic, poison-event alerting/replay tooling, and consumer lag monitoring.

The local outbox poller is intended for one API replica. Before horizontal scaling, replace its read loop with an atomic lease/claim (including lease expiry) or a dedicated outbox worker so replicas do not all publish the same pending row. Duplicate consumer effects remain safe.
