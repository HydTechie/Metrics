import { FormEvent, useEffect, useState } from 'react';

const API = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:3000/graphql';
const CLINIC_TIME_ZONE = import.meta.env.VITE_CLINIC_TIME_ZONE || 'Asia/Kolkata';
type Patient = { patientId: string; firstName: string; lastName: string; dateOfBirth: string; email: string; phone: string };
type Doctor = { doctorId: string; name: string; specialization: string };
type Appointment = { appointmentId: string; patientId: string; patientName: string; doctorId: string; doctorName: string; startsAt: string; status: string };
type Page = { items: Patient[]; total: number; page: number; limit: number };

function clinicWallTimeToIso(value: string) {
  const [datePart, timePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  let instant = desired;
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: CLINIC_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  for (let i = 0; i < 2; i++) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map(part => [part.type, part.value]));
    const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    instant += desired - represented;
  }
  return new Date(instant).toISOString();
}

export default function App() {
  const [token, setToken] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [devCode, setDevCode] = useState('');
  const [codeRequested, setCodeRequested] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [patients, setPatients] = useState<Page>({ items: [], total: 0, page: 1, limit: 10 });
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  function signOut() {
    setToken(''); setRole(''); setCodeRequested(false); setPhone(''); setCode(''); setDevCode(''); setMfaToken('');
    setPatients({ items: [], total: 0, page: 1, limit: 10 }); setDoctors([]); setAppointments([]);
  }
  async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ query, variables }) });
    const result = await response.json();
    if (result.errors?.length) {
      if (result.errors[0].extensions?.code === 'UNAUTHENTICATED') signOut();
      throw new Error(result.errors[0].message);
    }
    return result.data;
  }
  async function requestLoginCode(e: FormEvent) {
    e.preventDefault(); setAuthBusy(true); setError(''); setDevCode('');
    try {
      const result = await gql<{ requestLoginCode: { message: string; devCode?: string } }>(`mutation($phone:String!){requestLoginCode(phone:$phone){message devCode}}`, { phone });
      setCodeRequested(true); setDevCode(result.requestLoginCode.devCode || ''); setNotice(result.requestLoginCode.message);
    } catch (e) { setError((e as Error).message); }
    finally { setAuthBusy(false); }
  }
  async function verifyLoginCode(e: FormEvent) {
    e.preventDefault(); setAuthBusy(true); setError('');
    try {
      const result = await gql<{ verifyLoginCode: { accessToken?: string; role?: string; mfaRequired: boolean; mfaToken?: string } }>(`mutation($phone:String!,$code:String!){verifyLoginCode(phone:$phone,code:$code){accessToken role mfaRequired mfaToken}}`, { phone, code });
      if (result.verifyLoginCode.mfaRequired && result.verifyLoginCode.mfaToken) {
        setMfaToken(result.verifyLoginCode.mfaToken); setCode(''); setNotice('Enter the current code from your authenticator app.');
      } else if (result.verifyLoginCode.accessToken && result.verifyLoginCode.role) {
        setToken(result.verifyLoginCode.accessToken); setRole(result.verifyLoginCode.role); setCode(''); setDevCode(''); setNotice('Signed in successfully.');
      }
    } catch (e) { setError((e as Error).message); }
    finally { setAuthBusy(false); }
  }
  async function verifyAuthenticatorCode(e: FormEvent) {
    e.preventDefault(); setAuthBusy(true); setError('');
    try {
      const result = await gql<{ verifyAuthenticatorCode: { accessToken: string; role: string } }>(`mutation($mfaToken:String!,$code:String!){verifyAuthenticatorCode(mfaToken:$mfaToken,code:$code){accessToken role}}`, { mfaToken, code });
      setToken(result.verifyAuthenticatorCode.accessToken); setRole(result.verifyAuthenticatorCode.role); setMfaToken(''); setCode(''); setNotice('Signed in successfully.');
    } catch (e) { setError((e as Error).message); }
    finally { setAuthBusy(false); }
  }
  async function refresh() {
    if (!token) return;
    try {
      const data = await gql<{ patients: Page; doctors: Doctor[]; appointments: Appointment[] }>(`query($search:String,$page:Int,$limit:Int){patients(search:$search,page:$page,limit:$limit){items{patientId firstName lastName dateOfBirth email phone} total page limit} doctors{doctorId name specialization} appointments{appointmentId patientId patientName doctorId doctorName startsAt status}}`, { search, page, limit: 10 });
      setPatients(data.patients); setDoctors(data.doctors); setAppointments(data.appointments); setError('');
    } catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { void refresh(); }, [token, search, page]);
  useEffect(() => {
    if (!token) return;
    const timeout = window.setTimeout(signOut, 60 * 60 * 1000);
    return () => window.clearTimeout(timeout);
  }, [token]);
  async function register(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const formElement = e.currentTarget; const formData = new FormData(formElement);
    try { await gql(`mutation($input:CreatePatientInput!){createPatient(input:$input){patientId}}`, { input: Object.fromEntries(formData.entries()) }); formElement.reset(); setNotice('Patient registered successfully.'); setPage(1); await refresh(); }
    catch (e) { setError((e as Error).message); }
  }
  async function book(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const formElement = e.currentTarget; const formData = new FormData(formElement);
    try { await gql(`mutation($input:BookAppointmentInput!){bookAppointment(input:$input){appointmentId}}`, { input: { patientId: formData.get('patientId'), doctorId: formData.get('doctorId'), startsAt: clinicWallTimeToIso(String(formData.get('startsAt'))) } }); formElement.reset(); setNotice('Appointment booked. Notification event queued.'); await refresh(); }
    catch (e) { setError((e as Error).message); }
  }
  async function cancel(id: string) { try { await gql(`mutation($appointmentId:String!){cancelAppointment(appointmentId:$appointmentId){appointmentId}}`, { appointmentId: id }); setNotice('Appointment cancelled.'); await refresh(); } catch (e) { setError((e as Error).message); } }

  return <main className="shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">✳</span><span>clinic<span className="brand-light">desk</span></span></div><div className="top-meta"><span className="status-dot"/> Local clinic workspace <span className="avatar">CD</span></div></header>
    <section className="hero"><div><p className="eyebrow">CARE OPERATIONS · TODAY</p><h1>Good morning, <em>team.</em></h1><p className="subhead">A clearer view of your clinic’s day, all in one place.</p></div><div className="hero-date"><span>CLINIC TIME</span><strong>{new Intl.DateTimeFormat('en-IN', { dateStyle: 'full', timeZone: CLINIC_TIME_ZONE }).format(new Date())}</strong></div></section>
    {!token && <form className="auth-banner" onSubmit={mfaToken ? verifyAuthenticatorCode : codeRequested ? verifyLoginCode : requestLoginCode}><label>Staff phone number<input required type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 415 555 0123" readOnly={Boolean(mfaToken)}/></label>{codeRequested && <label>{mfaToken ? 'Authenticator app code' : 'SMS sign-in code'}<input required inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={code} onChange={e => setCode(e.target.value)} placeholder="6-digit code"/></label>}<button className="button dark" disabled={authBusy}>{authBusy ? 'Please wait…' : mfaToken ? 'Verify and sign in' : codeRequested ? 'Continue' : 'Send sign-in code'}</button>{devCode && <p className="helper mock-code">Mock SMS code: <strong>{devCode}</strong></p>}</form>}
    {token && <button className="signout" onClick={() => { signOut(); setNotice('Signed out.'); }}>Sign out · {role}</button>}
    {(notice || error) && <div role="status" className={error ? 'alert error' : 'alert success'}>{error || notice}<button onClick={() => { setError(''); setNotice(''); }}>×</button></div>}
    <section className="stats"><div className="stat-card"><span className="stat-icon mint">♧</span><div><span className="stat-label">REGISTERED PATIENTS</span><strong>{patients.total}</strong><small>In your clinic directory</small></div><span className="stat-decoration">01</span></div><div className="stat-card"><span className="stat-icon peach">◷</span><div><span className="stat-label">UPCOMING VISITS</span><strong>{appointments.filter(a => a.status === 'BOOKED' && new Date(a.startsAt) > new Date()).length}</strong><small>Scheduled appointments</small></div><span className="stat-decoration">02</span></div><div className="stat-card"><span className="stat-icon lavender">✳</span><div><span className="stat-label">CARE TEAM</span><strong>{doctors.length}</strong><small>Doctors available</small></div><span className="stat-decoration">03</span></div></section>
    <section className="workspace">
      <div className="panel directory"><div className="panel-head"><div><span className="section-kicker">YOUR CLINIC</span><h2>Patient directory</h2></div><span className="count-chip">{patients.total} RECORDS</span></div><div className="search-wrap"><span>⌕</span><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search patients by name"/><kbd>⌘ K</kbd></div><div className="table-scroll"><table><thead><tr><th>PATIENT</th><th>DATE OF BIRTH</th><th>CONTACT</th></tr></thead><tbody>{patients.items.map(p => <tr key={p.patientId}><td><div className="person"><span className="initials">{p.firstName[0]}{p.lastName[0]}</span><span><strong>{p.firstName} {p.lastName}</strong><small>{p.patientId}</small></span></div></td><td>{new Date(p.dateOfBirth).toLocaleDateString()}</td><td><span>{p.email}</span><small className="block">{p.phone}</small></td></tr>)}</tbody></table>{!patients.items.length && <div className="empty">Your patient list will appear here.</div>}</div><div className="pagination"><span>Showing {patients.items.length ? (page - 1) * 10 + 1 : 0}–{Math.min(page * 10, patients.total)} of {patients.total}</span><div><button disabled={page <= 1} onClick={() => setPage(page - 1)}>←</button><button disabled={page * 10 >= patients.total} onClick={() => setPage(page + 1)}>→</button></div></div></div>
      <aside className="side-column"><form className="panel form-panel" onSubmit={register}><div className="panel-head"><div><span className="section-kicker">NEW RECORD</span><h2>Register a patient</h2></div><span className="step-number">01</span></div><div className="form-grid"><label>First name<input name="firstName" required maxLength={80} placeholder="e.g. Asha"/></label><label>Last name<input name="lastName" required maxLength={80} placeholder="e.g. Mehta"/></label><label>Date of birth<input name="dateOfBirth" type="date" required/></label><label>Phone number<input name="phone" required maxLength={32} placeholder="+91 98765 43210"/></label><label className="wide">Email address<input name="email" type="email" required placeholder="asha@example.com"/></label></div><button className="button dark full">Create patient record <span>↗</span></button></form>
      <form className="panel form-panel booking" onSubmit={book}><div className="panel-head"><div><span className="section-kicker">SCHEDULING</span><h2>Book an appointment</h2></div><span className="step-number">02</span></div><label>Patient<select name="patientId" required defaultValue=""><option value="" disabled>Select a patient</option>{patients.items.map(p => <option key={p.patientId} value={p.patientId}>{p.firstName} {p.lastName} · {p.patientId}</option>)}</select></label><label>Doctor<select name="doctorId" required defaultValue=""><option value="" disabled>Select a doctor</option>{doctors.map(d => <option key={d.doctorId} value={d.doctorId}>{d.name} · {d.specialization}</option>)}</select></label><label>Date &amp; time<input name="startsAt" type="datetime-local" required step="1800"/></label><button className="button coral full">Confirm appointment <span>↗</span></button><p className="helper">Visits are scheduled in 30-minute blocks · Asia/Kolkata</p></form></aside>
    </section>
    <section className="panel schedule"><div className="panel-head"><div><span className="section-kicker">THE CLINIC CALENDAR</span><h2>Appointments</h2></div><span className="count-chip">{appointments.length} SCHEDULED</span></div><div className="table-scroll"><table><thead><tr><th>APPOINTMENT</th><th>PATIENT</th><th>DOCTOR</th><th>DATE &amp; TIME</th><th>STATUS</th><th></th></tr></thead><tbody>{appointments.map(a => <tr key={a.appointmentId}><td><strong>{a.appointmentId}</strong></td><td>{a.patientName} <small className="block">{a.patientId}</small></td><td>{a.doctorName} <small className="block">{a.doctorId}</small></td><td>{new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: CLINIC_TIME_ZONE }).format(new Date(a.startsAt))}</td><td><span className={`badge ${a.status.toLowerCase()}`}>{a.status}</span></td><td>{a.status === 'BOOKED' && <button className="text-button" onClick={() => cancel(a.appointmentId)}>Cancel</button>}</td></tr>)}</tbody></table>{!appointments.length && <div className="empty">No appointments yet. Your schedule will take shape here.</div>}</div></section>
    <footer><span>✳ CLINICDESK</span><span>Administrative scheduling · Patient information is fictional in this demo</span></footer>
  </main>;
}
