# ADR 0003: MongoDB and slot-based booking

**Context** → The requested persistence is MongoDB and appointments have fixed 30-minute duration in one clinic time zone. Concurrent requests must not double-book.

**Decision** → Store UTC start/end instants and require 30-minute aligned starts. Enforce a unique partial index on `(doctorId, startsAt)` for `BOOKED` records. Write appointment plus outbox row in one replica-set transaction.

**Alternatives** → SQL exclusion constraints; arbitrary interval overlap queries with distributed locks; application-only preflight checks.

**Trade-offs** → MongoDB is retained and its unique index closes the race between concurrent requests; appointment start times are constrained to fixed slots. Arbitrary durations or schedules with breaks need explicit slot documents or a transactional allocation model.
