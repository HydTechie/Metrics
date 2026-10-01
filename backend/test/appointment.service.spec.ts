import { AppointmentService } from '../src/appointments/appointment.service';
describe('AppointmentService booking validation', () => {
  const appointments: any = { db: { startSession: jest.fn() } };
  const outbox: any = {};
  const patients: any = {};
  const doctors: any = {};
  const service = new AppointmentService(appointments, outbox, patients, doctors);
  it('rejects a start time that is not aligned to a 30-minute boundary', async () => {
    await expect(service.book({ patientId: 'P-1', doctorId: 'D-1', startsAt: '2099-01-01T10:15:00.000Z' })).rejects.toThrow('30-minute boundary');
    expect(appointments.db.startSession).not.toHaveBeenCalled();
  });
  it('rejects a past appointment', async () => {
    await expect(service.book({ patientId: 'P-1', doctorId: 'D-1', startsAt: '2000-01-01T10:00:00.000Z' })).rejects.toThrow('future');
  });
});
