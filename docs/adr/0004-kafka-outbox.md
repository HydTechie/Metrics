# ADR 0004: Kafka event delivery

**Context** → A successful appointment must eventually create a notification, including through temporary Kafka outages.

**Decision** → Persist an outbox event in the same Mongo transaction as the appointment, publish asynchronously, and make notification writes idempotent by event ID.

**Alternatives** → Publish directly during the GraphQL mutation; change-stream-based outbox; synchronous notification creation.

**Trade-offs** → No committed appointment can silently lose its event, and retries can duplicate delivery safely. Delivery is at least once; publisher claiming, exponential retry, dead-letter handling, and lag alerts are production hardening items.
