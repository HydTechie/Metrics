# ADR 0001: Modular monolith

**Context** → The challenge requires patient, appointment, and notification boundaries, but the target is a small vertical slice built and run by one team.

**Decision** → Keep distinct NestJS modules and persistence models in one deployable API, with one composed GraphQL schema. Run the Kafka consumer with the app in the local proof of concept.

**Alternatives** → Independently deployed microservices with schema federation; one unstructured application module.

**Trade-offs** → Fewer deployment and local development dependencies and easy in-process domain calls; modules share a release and scale unit. Extract notification processing when independent throughput/availability needs justify the operational cost.
