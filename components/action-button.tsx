'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { ActionState } from '@/lib/validation';

function Submit({
  label,
  pendingLabel,
  className,
}: {
  label: string;
  pendingLabel: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

/**
 * A single-button form bound to a Server Action, with an optional confirmation
 * dialog and inline feedback. Used for cancellations and admin deletions.
 */
export function ActionButton({
  action,
  fields,
  label,
  pendingLabel = 'En cours…',
  confirmText,
  variant = 'ghost',
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  fields: Record<string, string | number>;
  label: string;
  pendingLabel?: string;
  confirmText?: string;
  variant?: 'ghost' | 'danger' | 'primary';
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (confirmText && !window.confirm(confirmText)) event.preventDefault();
      }}
      className="inline-flex flex-col items-start gap-1"
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Submit label={label} pendingLabel={pendingLabel} className={`btn btn-${variant}`} />
      {state.message ? (
        <span
          className={`text-xs ${state.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
          role="status"
        >
          {state.message}
        </span>
      ) : null}
    </form>
  );
}

/** A `<select>` that submits the chosen value to a Server Action on change. */
export function StatusSelect({
  action,
  fields,
  name,
  value,
  options,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  fields: Record<string, string | number>;
  name: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-1">
      {Object.entries(fields).map(([field, fieldValue]) => (
        <input key={field} type="hidden" name={field} value={fieldValue} />
      ))}
      <select
        name={name}
        defaultValue={value}
        className="field py-1 text-xs"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        aria-label="Changer le statut"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {state.message && !state.success ? (
        <span className="max-w-60 text-xs text-red-600 dark:text-red-400" role="status">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
