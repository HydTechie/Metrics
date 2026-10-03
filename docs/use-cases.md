# Clinic Desk Use Cases

This document describes the primary receptionist and administrator workflows supported by the current proof of concept. The UI integration suite in `frontend/tests/clinic-desk.spec.ts` exercises the browser-facing happy paths with deterministic GraphQL fixtures.

## Actors

| Actor | Responsibility |
|---|---|
| Receptionist | Registers patients, searches the directory, books visits, and cancels booked visits. |
| Administrator | Performs receptionist workflows and represents the elevated staff role in the demo. |
| Notification consumer | Processes appointment events asynchronously and records idempotent notifications. |

## UC-01: Staff sign-in

**Goal:** Allow an approved staff member to access clinic operations.

**Main flow:**

1. Staff enters an allowlisted phone number.
2. API creates a short-lived one-time challenge.
3. Development returns a mock SMS code; production sends an SMS and requires the configured authenticator code.
4. Staff verifies the code and receives a short-lived bearer token.
5. The UI loads the patient directory, doctors, and appointments.

**Failure cases:** Unknown phone numbers receive a generic response, expired or reused codes are rejected, and production MFA failures do not issue a token.

## UC-02: Search the patient directory

**Goal:** Find a patient quickly using information available at the front desk.

**Search fields:** First name, last name, email, phone/contact number, and date of birth in `YYYY-MM-DD` format.

**Main flow:**

1. Staff enters a search term.
2. The UI resets to page one and requests the filtered patient page.
3. The API searches the Redis recent-patient index for records within 90 days and MongoDB for older matches.
4. Results show the patient name/ID, date of birth, email, and phone.

## UC-03: Register a patient

**Goal:** Create a patient record before scheduling care.

**Main flow:**

1. Staff enters first name, last name, date of birth, phone, and email.
2. The API validates the fields and generates a patient ID.
3. MongoDB stores the record as the source of truth.
4. The new record is added to Redis when it falls inside the recent cache window.
5. The UI refreshes the directory and displays a success notice.

## UC-04: Book an appointment

**Goal:** Schedule a patient with an available doctor.

**Main flow:**

1. Staff selects a patient, doctor, and clinic-local date/time.
2. The API converts the clinic time to UTC and validates a 30-minute boundary and future start time.
3. MongoDB transactionally saves the appointment and an outbox event.
4. The outbox publisher sends `AppointmentBooked` to Kafka.
5. The notification consumer records the event using `eventId` idempotency.

## UC-05: Cancel an appointment

**Goal:** Release a booked slot when a visit is cancelled.

**Main flow:**

1. Staff selects Cancel on a booked appointment.
2. The API changes the status to `CANCELLED`.
3. The UI refreshes the calendar and shows a confirmation notice.
4. The MongoDB partial unique index no longer reserves the cancelled slot.

## UI integration coverage

The Playwright suite covers UC-01 and UC-02 in the search test, and UC-03 through UC-05 in the registration and scheduling test. GraphQL responses are mocked at the browser boundary so tests remain deterministic; backend behavior is covered separately by the NestJS unit/integration test suites.
