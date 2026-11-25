# Admin Authentication Requirements

**Project:** order-tokopedia  
**Module:** /admin  
**Status:** Approved baseline  
**Scope:** Phone-first registration, PIN login, and PIN recovery

## Functional requirements

### FR-001 — Phone identification
- The first screen asks for a phone number.
- The backend normalizes and checks the number.
- A registered number proceeds to PIN login.
- An unregistered number proceeds to registration.

### FR-002 — Registration
- Registration collects phone number, name, and password.
- The backend hashes the password.
- New accounts receive the role `users` from the backend.
- The client cannot choose or override a role.
- Registration does not collect the PIN in the same form.

### FR-003 — PIN creation
- After registration, the user chooses a six-digit numeric PIN.
- The user confirms the PIN before saving.
- The backend stores only the PIN hash.
- After saving, the user returns to the PIN login step.

### FR-004 — Daily login
- Login uses the previously identified phone number and six-digit PIN.
- The backend verifies the PIN hash and issues the existing admin session.
- An invalid PIN displays an error and keeps the user on the login step.

### FR-005 — PIN recovery
- The user can choose “Lupa PIN?” from the login step.
- Recovery uses the identified phone number and account password.
- The backend verifies the password and stores the new PIN hash.
- After successful recovery, the user returns to PIN login.

### FR-006 — Session restoration
- The frontend may retain the issued session token and non-secret phone/profile information.
- The frontend must not store the PIN in localStorage or use it for automatic login.
- On page load, the frontend validates the saved session with the backend.
- Invalid or expired sessions return the user to the phone step.

### FR-007 — Role management
- New registrations always receive role `users`.
- Existing roles and accounts are preserved.
- Role changes are performed only through the Supabase Dashboard.
- The /admin UI does not provide role management.
- Backend authorization reads the current role from the database.

## Data requirements

- Add nullable `name` column to `public.admin_tokopedia` to preserve existing accounts.
- New registrations must supply a non-empty name.
- Existing `phone`, `password`, `pin`, and `role` values must not be reset.
- Phone remains the unique account identifier.

## Explicit exclusions

- No SMS or WhatsApp OTP.
- No automatic account lockout or new retry-lock system.
- No additional security workflow beyond the agreed authentication flow.
- No role selection during registration.
- No role management in the /admin dashboard.
- Password is not used for routine login.

## Acceptance criteria

- [ ] Unknown phone number routes to registration.
- [ ] Registered phone number routes to PIN login.
- [ ] Registration requires phone, name, and password.
- [ ] New accounts receive role `users`.
- [ ] User can set and confirm a six-digit PIN after registration.
- [ ] Correct phone/PIN pair opens the dashboard.
- [ ] Incorrect PIN remains on login and shows an error.
- [ ] PIN recovery verifies phone/password and accepts a new PIN.
- [ ] PIN is never persisted in browser localStorage.
- [ ] Existing admin/users accounts and product dashboard permissions remain intact.
- [ ] Role can only be changed through Supabase Dashboard.
