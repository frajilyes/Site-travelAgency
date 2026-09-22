'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { hashPassword, verifyPassword } from '@/lib/password';
import { createSession, deleteSession } from '@/lib/session';
import { getCurrentUser, requireUser } from '@/lib/dal';
import {
  createUser,
  findUserByEmail,
  logAction,
  updatePassword,
  updateProfile,
} from '@/lib/queries/users';
import {
  LoginSchema,
  PasswordChangeSchema,
  ProfileSchema,
  RegisterSchema,
  fieldErrors,
  type ActionState,
} from '@/lib/validation';

/** Only allow same-origin relative paths as post-login redirect targets. */
function safeNext(value: FormDataEntryValue | null): string | null {
  const next = typeof value === 'string' ? value : null;
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

export async function register(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = RegisterSchema.safeParse({
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    email: formData.get('email'),
    phone: formData.get('phone') ?? '',
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  });

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  const { email, first_name, last_name, phone, password } = parsed.data;
  if (await findUserByEmail(email)) {
    return { errors: { email: ['Un compte existe déjà avec cette adresse e-mail.'] } };
  }

  const userId = await createUser({
    email,
    password_hash: await hashPassword(password),
    first_name,
    last_name,
    phone: phone ? phone : null,
  });
  await logAction(userId, 'user.register', 'user', userId, `Création du compte ${email}`);

  await createSession(userId, 'user');
  redirect(safeNext(formData.get('next')) ?? '/compte');
}

export async function login(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  const user = await findUserByEmail(parsed.data.email);
  // Always run a verification so a missing account and a wrong password take
  // the same amount of time.
  const placeholder = '0'.repeat(32) + ':' + '0'.repeat(128);
  const valid = await verifyPassword(parsed.data.password, user?.password_hash ?? placeholder);

  if (!user || !valid) {
    return { message: 'Adresse e-mail ou mot de passe incorrect.' };
  }
  if (user.status === 'suspended') {
    return { message: 'Ce compte est suspendu. Contactez le service client.' };
  }

  await logAction(user.id, 'user.login', 'user', user.id, `Connexion de ${user.email}`);
  await createSession(user.id, user.role);

  const next = safeNext(formData.get('next'));
  redirect(next ?? (user.role === 'admin' ? '/admin' : '/compte'));
}

export async function logout(): Promise<void> {
  const user = await getCurrentUser();
  if (user) await logAction(user.id, 'user.logout', 'user', user.id, `Déconnexion de ${user.email}`);
  await deleteSession();
  redirect('/');
}

export async function saveProfile(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = ProfileSchema.safeParse({
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    email: formData.get('email'),
    phone: formData.get('phone') ?? '',
  });

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  const existing = await findUserByEmail(parsed.data.email);
  if (existing && existing.id !== user.id) {
    return { errors: { email: ['Cette adresse e-mail est déjà utilisée.'] } };
  }

  await updateProfile(user.id, {
    first_name: parsed.data.first_name,
    last_name: parsed.data.last_name,
    email: parsed.data.email,
    phone: parsed.data.phone ? parsed.data.phone : null,
  });
  await logAction(user.id, 'user.profile', 'user', user.id, 'Mise à jour du profil');

  revalidatePath('/compte');
  return { success: true, message: 'Profil mis à jour.' };
}

export async function changePassword(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = PasswordChangeSchema.safeParse({
    current: formData.get('current'),
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  });

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  const record = await findUserByEmail(user.email);
  if (!record || !(await verifyPassword(parsed.data.current, record.password_hash))) {
    return { errors: { current: ['Mot de passe actuel incorrect.'] } };
  }

  await updatePassword(user.id, await hashPassword(parsed.data.password));
  await logAction(user.id, 'user.password', 'user', user.id, 'Changement de mot de passe');

  return { success: true, message: 'Mot de passe modifié.' };
}
