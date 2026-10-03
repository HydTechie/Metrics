import { expect, Page, test } from '@playwright/test';

type Patient = { patientId: string; firstName: string; lastName: string; dateOfBirth: string; email: string; phone: string };

const initialPatient: Patient = {
  patientId: 'P-1001', firstName: 'Asha', lastName: 'Mehta', dateOfBirth: '1990-04-12T00:00:00.000Z', email: 'asha@example.test', phone: '+15555550123',
};

async function stubGraphQL(page: Page) {
  let patients = [initialPatient];
  let appointments: Array<{ appointmentId: string; patientId: string; patientName: string; doctorId: string; doctorName: string; startsAt: string; status: string }> = [];

  await page.route('**/graphql', async route => {
    const request = route.request().postDataJSON() as { query: string; variables?: Record<string, any> };
    const query = request.query;
    let data: Record<string, any>;

    if (query.includes('requestLoginCode')) {
      data = { requestLoginCode: { message: 'If the number is registered, a sign-in code has been sent.', devCode: '123456' } };
    } else if (query.includes('verifyLoginCode')) {
      data = { verifyLoginCode: { accessToken: 'test-token', role: 'ADMIN', mfaRequired: false, mfaToken: null } };
    } else if (query.includes('createPatient')) {
      const input = request.variables?.input;
      const patient = { patientId: 'P-1002', ...input, dateOfBirth: `${input.dateOfBirth}T00:00:00.000Z` };
      patients = [...patients, patient];
      data = { createPatient: { patientId: patient.patientId } };
    } else if (query.includes('bookAppointment')) {
      const input = request.variables?.input;
      const patient = patients.find(item => item.patientId === input.patientId) || initialPatient;
      const appointment = { appointmentId: 'A-1001', patientId: patient.patientId, patientName: `${patient.firstName} ${patient.lastName}`, doctorId: input.doctorId, doctorName: 'Dr. Maya Shah', startsAt: input.startsAt, status: 'BOOKED' };
      appointments = [...appointments, appointment];
      data = { bookAppointment: { appointmentId: appointment.appointmentId } };
    } else if (query.includes('cancelAppointment')) {
      appointments = appointments.map(item => item.appointmentId === request.variables?.appointmentId ? { ...item, status: 'CANCELLED' } : item);
      data = { cancelAppointment: { appointmentId: request.variables?.appointmentId } };
    } else if (query.includes('patients(')) {
      const search = String(request.variables?.search || '').toLowerCase();
      const filtered = patients.filter(patient => [patient.firstName, patient.lastName, patient.email, patient.phone, patient.dateOfBirth].some(value => value.toLowerCase().includes(search)));
      data = {
        patients: { items: filtered, total: filtered.length, page: 1, limit: 10 },
        doctors: [{ doctorId: 'D-1001', name: 'Dr. Maya Shah', specialization: 'General Medicine' }],
        appointments,
      };
    } else {
      throw new Error(`Unhandled GraphQL operation: ${query}`);
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data }) });
  });
}

async function signIn(page: Page) {
  await page.getByLabel('Staff phone number').fill('+15555550100');
  await page.getByRole('button', { name: 'Send sign-in code' }).click();
  await expect(page.getByText('Mock SMS code:')).toBeVisible();
  await page.getByLabel('SMS sign-in code').fill('123456');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Patient directory' })).toBeVisible();
}

test.describe('Clinic Desk operator workflows', () => {
  test('signs in and searches the patient directory by email, date of birth, and phone', async ({ page }) => {
    await stubGraphQL(page);
    await page.goto('/');
    await signIn(page);

    const search = page.getByPlaceholder('Search name, email, DOB, or phone');
    for (const value of ['asha@example.test', '1990-04-12', '+15555550123']) {
      await search.fill(value);
      await expect(page.getByRole('strong').filter({ hasText: 'Asha Mehta' })).toBeVisible();
    }
  });

  test('registers a patient, books an appointment, and cancels it', async ({ page }) => {
    await stubGraphQL(page);
    await page.goto('/');
    await signIn(page);

    await page.getByLabel('First name').fill('Rohan');
    await page.getByLabel('Last name').fill('Rao');
    await page.getByLabel('Date of birth').fill('1988-08-20');
    await page.getByLabel('Phone number').fill('+15555550124');
    await page.getByLabel('Email address').fill('rohan@example.test');
    await page.getByRole('button', { name: /Create patient record/ }).click();
    await expect(page.getByText('Patient registered successfully.')).toBeVisible();

    await page.getByLabel('Patient').selectOption('P-1002');
    await page.getByLabel('Doctor').selectOption('D-1001');
    await page.getByLabel('Date & time').fill('2026-10-10T10:00');
    await page.getByRole('button', { name: /Confirm appointment/ }).click();
    await expect(page.getByText('Appointment booked. Notification event queued.')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Appointment cancelled.')).toBeVisible();
  });
});
