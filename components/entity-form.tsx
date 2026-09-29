'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { FieldError } from './ui';
import type { ActionState } from '@/lib/validation';

export type FieldSpec =
  | {
      kind: 'text' | 'number' | 'email' | 'password' | 'date' | 'datetime-local';
      name: string;
      label: string;
      required?: boolean;
      placeholder?: string;
      hint?: string;
      min?: string | number;
      max?: string | number;
      step?: string | number;
      span?: 1 | 2 | 3;
    }
  | {
      kind: 'select';
      name: string;
      label: string;
      options: { value: string | number; label: string }[];
      required?: boolean;
      hint?: string;
      span?: 1 | 2 | 3;
    }
  | {
      kind: 'checkbox';
      name: string;
      label: string;
      hint?: string;
      span?: 1 | 2 | 3;
    }
  | {
      kind: 'textarea';
      name: string;
      label: string;
      hint?: string;
      placeholder?: string;
      span?: 1 | 2 | 3;
    };

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? 'Saving…' : label}
    </button>
  );
}

const SPAN_CLASS: Record<1 | 2 | 3, string> = {
  1: '',
  2: 'sm:col-span-2',
  3: 'sm:col-span-2 lg:col-span-3',
};

export function EntityForm({
  action,
  fields,
  defaults = {},
  id,
  submitLabel = 'Save',
  cancelHref,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  fields: FieldSpec[];
  defaults?: Record<string, string | number | boolean | null | undefined>;
  id?: number;
  submitLabel?: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      {id ? <input type="hidden" name="id" value={id} /> : null}

      {state.message ? (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
          role="alert"
        >
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => {
          const value = defaults[field.name];
          const span = SPAN_CLASS[field.span ?? 1];

          if (field.kind === 'checkbox') {
            return (
              <div key={field.name} className={`flex items-center gap-2 pt-6 ${span}`}>
                <input
                  id={field.name}
                  type="checkbox"
                  name={field.name}
                  defaultChecked={Boolean(value)}
                  className="h-4 w-4"
                />
                <label htmlFor={field.name} className="text-sm font-medium">
                  {field.label}
                </label>
                <FieldError messages={errors[field.name]} />
              </div>
            );
          }

          return (
            <div key={field.name} className={span}>
              <label className="label" htmlFor={field.name}>
                {field.label}
              </label>

              {field.kind === 'select' ? (
                <select
                  id={field.name}
                  name={field.name}
                  className="field"
                  defaultValue={value === null || value === undefined ? '' : String(value)}
                  required={field.required}
                >
                  {!field.required ? <option value="">—</option> : null}
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : field.kind === 'textarea' ? (
                <textarea
                  id={field.name}
                  name={field.name}
                  className="field"
                  rows={3}
                  placeholder={field.placeholder}
                  defaultValue={value === null || value === undefined ? '' : String(value)}
                />
              ) : (
                <input
                  id={field.name}
                  name={field.name}
                  type={field.kind}
                  className="field"
                  required={field.required}
                  placeholder={field.placeholder}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  defaultValue={value === null || value === undefined ? '' : String(value)}
                />
              )}

              {field.hint ? <p className="mt-1 text-xs text-ink-muted">{field.hint}</p> : null}
              <FieldError messages={errors[field.name]} />
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Submit label={submitLabel} />
        <Link href={cancelHref} className="btn btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}
