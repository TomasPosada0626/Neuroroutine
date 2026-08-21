# NeuroRoutine Privacy Policy

*[Español](PRIVACY.md) — this English version is a courtesy translation; the Spanish version is
authoritative in case of any conflict.*

**Last updated:** 2026-08-20

This policy describes what data NeuroRoutine collects, what it's used for, who it's shared with,
and what rights you have over it. It's written to reflect what the application actually does
today, not a generic template.

## 1. Data controller

NeuroRoutine is a project developed and operated by **Tomas Posada**, as an individual (there is
no registered legal entity behind the project as of this policy's date).

Contact for any privacy matter: **agendatomas2025@gmail.com**

## 2. What data we collect

### 2.1 Account data

When you register, Supabase Auth (our authentication provider) securely manages your password; we
never see or store it in plain text. We also store in our database:

- Email address
- Username
- First and last name (optional)

### 2.2 Content you create

- Your routines and tasks: titles, descriptions, dates, times, and whether they're recurring
  (habits).
- Your reminder preferences: whether you want email reminders, at what hour, and in what timezone.

### 2.3 Usage data (minimal analytics, no PII by design)

We log events like "routine created," "task completed," "session started," etc., to calculate
your consistency streaks and improve the product. This log is built to **actively exclude**
identifiable information: the code explicitly blocks any field named `title`, `description`,
`email`, `username`, `first_name`, `last_name`, or `password` before saving the event (see
`frontend/src/shared/observability/eventLog.ts`). What is stored is the event type and, when
applicable, short non-identifiable values (numbers, booleans, generic text up to 80 characters).

Separately, we keep a history of completed/uncompleted task events (`routine_task_events`) to
calculate streaks — this history is **immutable**: not even you can edit it after creation, so the
consistency calculation can't be manipulated.

### 2.4 IP address

When you try to sign in with a username (instead of email), your IP is used transiently to limit
how many attempts you can make per minute (protection against brute force and user enumeration).
We don't keep a history of your IPs, only a counter that resets every minute.

### 2.5 Technical and error data

We use **Sentry** to detect errors and measure application performance. It's explicitly configured
to **not send personal information by default** (`sendDefaultPii: false` in
`frontend/src/shared/observability/initSentry.ts`). Still, as with any provider that receives HTTP
requests, Sentry may process standard basic connection metadata (e.g., the originating IP) as part
of its infrastructure, even without our application explicitly requesting it.

### 2.6 Cookies and local storage

NeuroRoutine does not use third-party tracking or advertising cookies. We use your browser's
`localStorage` to: keep you signed in, remember your theme preference (light/dark), save your
dashboard preferences, avoid duplicate notifications on the same day, and queue changes made
offline until they can be synced.

## 3. What we use your data for

- Giving you access to your account and your routines/tasks.
- Calculating your streaks and consistency stats.
- Sending you reminders for pending tasks by email (if enabled) or browser notification.
- Detecting and fixing technical errors.
- Preventing abuse (e.g., brute-force attacks or user enumeration).

We do not use your data for advertising, nor do we sell it to third parties.

## 4. Who we share your data with

We don't sell your data. We share it only with the providers that help us operate the service, and
only with what each one needs to do its job:

| Provider | What we use it for | What data it receives |
|---|---|---|
| **Supabase** | Authentication, database, scheduled functions | All account, content, and usage data described above |
| **Resend** | Sending reminder emails | Your email, your name (if provided), and the titles of tasks/routines due that day (needed to write the email) |
| **Sentry** | Error and performance monitoring | Technical error/session data, no PII by default (see 2.5) |
| **Vercel** / **Render** | Application hosting | Standard data from any HTTP request to the app |

These providers may process data on servers located outside your country. Each has its own privacy
policy as a data processor.

## 5. How long we keep your data

We keep your account data as long as the account exists. You can delete your account and all your
data at any time from within the app itself (see section 6) or by asking us via email. NeuroRoutine
does not yet automatically purge your event history while you keep your account active; this is a
known limitation of the product at its current stage, not a deliberate indefinite-retention
decision.

## 6. Your rights

You can exercise the following rights over your data, recognized by Colombia's Ley 1581 de 2012
(Personal Data Protection Law) and equivalent rules in other jurisdictions:

- **Access**: know what data we hold about you.
- **Correction**: correct inaccurate data (some, like your name, you can also edit yourself from
  the app).
- **Deletion**: delete your account and your data. You can do this yourself at any time from
  **Customize dashboard -> Danger zone -> Delete my account**, with no need to email us: the action
  deletes your account and cascades to your routines, tasks, history, and preferences,
  immediately and irreversibly.
- **Portability**: request a copy of your data in an exportable format.

For correction or portability, or if you'd rather we handle it instead of using the in-app button,
email us at **agendatomas2025@gmail.com** and we'll make our best effort to resolve your request
within a reasonable timeframe (15 business days maximum).

## 7. Security

- Your data is isolated at the database level: each user can only read or modify their own
  routines, tasks, and preferences, enforced by Row-Level Security in Postgres (not only by the
  interface).
- All communication with the application is encrypted (HTTPS).
- System administrator credentials are never exposed in code that runs in your browser.
- We apply attempt limits on sensitive operations to make automated attacks harder.

No application is 100% invulnerable; if you find a security issue, please report it following
[SECURITY.md](SECURITY.md).

## 8. Minors

NeuroRoutine is not directed at children under 14, and we do not deliberately collect data from
anyone under that age. If you believe a minor provided us data, contact us so we can delete it.

## 9. Changes to this policy

We may update this policy when the product or the providers we use change. If the change is
significant, we'll indicate it in the application or by email.

## 10. Contact

**agendatomas2025@gmail.com**
