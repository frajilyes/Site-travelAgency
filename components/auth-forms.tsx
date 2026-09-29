'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { login, register } from '@/actions/auth';
import { FieldError } from './ui';
import type { ActionState } from '@/lib/validation';

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary w-full" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
      role="alert"
    >
      {message}
    </p>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-[18px] w-[18px]">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18A13.2 13.2 0 0 1 11 24c0-1.45.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

export function GoogleButton({ next, label }: { next?: string; label: string }) {
  return (
    <>
      <a
        className="btn btn-ghost w-full"
        href={next ? `/api/auth/google?next=${encodeURIComponent(next)}` : '/api/auth/google'}
      >
        <GoogleMark />
        {label}
      </a>

      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-ink-muted">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>
    </>
  );
}

export function LoginForm({ next, google }: { next?: string; google?: boolean }) {
  const [state, formAction] = useActionState<ActionState, FormData>(login, {});
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {google ? <GoogleButton next={next} label="Continue with Google" /> : null}
      <FormError message={state.message} />

      <div>
        <label className="label" htmlFor="email">
          Email address
        </label>
        <input id="email" className="field" name="email" type="email" autoComplete="email" required />
        <FieldError messages={errors.email} />
      </div>

      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          className="field"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        <FieldError messages={errors.password} />
      </div>

      <Submit label="Sign in" pendingLabel="Signing in…" />
    </form>
  );
}

export function RegisterForm({ next, google }: { next?: string; google?: boolean }) {
  const [state, formAction] = useActionState<ActionState, FormData>(register, {});
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {google ? <GoogleButton next={next} label="Sign up with Google" /> : null}
      <FormError message={state.message} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="first_name">
            First name
          </label>
          <input id="first_name" className="field" name="first_name" autoComplete="given-name" required />
          <FieldError messages={errors.first_name} />
        </div>
        <div>
          <label className="label" htmlFor="last_name">
            Last name
          </label>
          <input id="last_name" className="field" name="last_name" autoComplete="family-name" required />
          <FieldError messages={errors.last_name} />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="email">
          Email address
        </label>
        <input id="email" className="field" name="email" type="email" autoComplete="email" required />
        <FieldError messages={errors.email} />
      </div>

      <div>
        <label className="label" htmlFor="phone">
          Phone (optional)
        </label>
        <input id="phone" className="field" name="phone" autoComplete="tel" placeholder="+33 6 12 34 56 78" />
        <FieldError messages={errors.phone} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="field"
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
          <FieldError messages={errors.password} />
        </div>
        <div>
          <label className="label" htmlFor="confirm">
            Confirm password
          </label>
          <input
            id="confirm"
            className="field"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
          />
          <FieldError messages={errors.confirm} />
        </div>
      </div>

      <p className="text-xs text-ink-muted">
        At least 12 characters, including a lowercase letter, an uppercase letter and a digit.
      </p>

      <Submit label="Create my account" pendingLabel="Creating…" />
    </form>
  );
}
