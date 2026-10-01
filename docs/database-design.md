# Database design

MongoDB runs as a replica set because appointment and event-outbox writes must commit atomically. Production must provide a replica set / sharded deployment with transactions enabled.

| Collection | Important fields | Indexes / constraints |
|---|---|---|
| `patients` | `patientId` (generated public ID), first/last name, date of birth, email, phone, timestamps | Unique `patientId`; `{lastName:1, firstName:1}` for ordered search. Email is not unique because family/shared email use can be valid. |
| `doctors` | `doctorId`, name, specialization, timestamps | Unique `doctorId`; seeded fictional practitioners. |
| `appointments` | `appointmentId`, patient/doctor IDs and denormalized names, `startsAt`, `endsAt`, status, timestamps | Unique `appointmentId`; unique partial `{doctorId:1, startsAt:1}` where status is `BOOKED`; `{startsAt:1,status:1}` for schedule reads. |
| `notifications` | `eventId`, appointment ID, confirmation message, status, timestamps | Unique `eventId` makes consumer upsert idempotent. |
| `outboxevents` | `eventId`, type, versioned payload, status, attempt count, last error, published timestamp | Unique `eventId`; status/creation ordering for retries. |

Appointments use fixed 30-minute boundaries and one configured clinic time zone. `startsAt` is stored as UTC; the UI displays Asia/Kolkata by default. Since intervals have fixed duration and starts align to a 30-minute boundary, the unique partial index on doctor and `startsAt` prevents concurrent double booking. Cancellation changes status, removing the record from the partial unique index so that slot can be booked again. The API translates duplicate-key errors into a conflict response. Arbitrary-duration overlap scheduling would require a different slot-allocation model or transaction/locking strategy.

Patient search is a case-insensitive escaped substring regex for the proof of concept. For large datasets, switch to Atlas Search or a normalized search field and bound query costs. Pagination uses offsets for simplicity; cursor pagination is preferable at scale.
