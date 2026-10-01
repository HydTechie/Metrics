# ADR 0002: GraphQL API

**Context** → The React client needs related patient, doctor, appointment, and notification data. The challenge explicitly requires GraphQL.

**Decision** → Expose a single NestJS code-first GraphQL schema with module-owned resolvers and backend guards.

**Alternatives** → REST resources; multiple GraphQL services behind a federation gateway.

**Trade-offs** → One request can fetch exactly the data needed and the schema is discoverable; resolvers need query complexity/depth limits, pagination, and careful authorization. A gateway would add operations without a current independent schema owner.
