'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { changePassword, saveProfile } from '@/actions/auth';
import { FieldError } from './ui';
import type { ActionState } from '@/lib/validation';
import type { PublicUser } from '@/lib/types';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? 'Enregistrement…' : label}
    </button>
  );
}

function Feedback({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p
      className={`rounded-xl border px-4 py-3 text-sm ${
        state.success
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100'
          : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100'
      }`}
      role="status"
    >
      {state.message}
    </p>
  );
}

export function ProfileForm({ user }: { user: PublicUser }) {
  const [state, formAction] = useActionState<ActionState, FormData>(saveProfile, {});
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <Feedback state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="first_name">
            Prénom
          </label>
          <input id="first_name" className="field" name="first_name" defaultValue={user.first_name} required />
          <FieldError messages={errors.first_name} />
        </div>
        <div>
          <label className="label" htmlFor="last_name">
            Nom
          </label>
          <input id="last_name" className="field" name="last_name" defaultValue={user.last_name} required />
          <FieldError messages={errors.last_name} />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="email">
          Adresse e-mail
        </label>
        <input id="email" className="field" type="email" name="email" defaultValue={user.email} required />
        <FieldError messages={errors.email} />
      </div>

      <div>
        <label className="label" htmlFor="phone">
          Téléphone
        </label>
        <input id="phone" className="field" name="phone" defaultValue={user.phone ?? ''} />
        <FieldError messages={errors.phone} />
      </div>

      <Submit label="Enregistrer" />
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(changePassword, {});
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <Feedback state={state} />

      <div>
        <label className="label" htmlFor="current">
          Mot de passe actuel
        </label>
        <input
          id="current"
          className="field"
          type="password"
          name="current"
          autoComplete="current-password"
          required
        />
        <FieldError messages={errors.current} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="new-password">
            Nouveau mot de passe
          </label>
          <input
            id="new-password"
            className="field"
            type="password"
            name="password"
            autoComplete="new-password"
            required
          />
          <FieldError messages={errors.password} />
        </div>
        <div>
          <label className="label" htmlFor="confirm">
            Confirmation
          </label>
          <input
            id="confirm"
            className="field"
            type="password"
            name="confirm"
            autoComplete="new-password"
            required
          />
          <FieldError messages={errors.confirm} />
        </div>
      </div>

      <Submit label="Modifier le mot de passe" />
    </form>
  );
}
