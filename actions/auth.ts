'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { hashPassword, needsRehash, verifyPassword } from '@/lib/password';
import { createSession, deleteSession } from '@/lib/session';
import { getCurrentUser, requireUser } from '@/lib/dal';
import { clientIp, safeRelativePath } from '@/lib/request';
import { RULES, consume, peek, reset, retryMessage } from '@/lib/rate-limit';
import {
  createUser,
  emailTaken,
  findCredentialsById,
  findUserCredentials,
  logAction,
  refreshPasswordHash,
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

const SIGN_IN_FAILED = 'Incorrect email address or password.';

const BUCKETS = {
  loginIp: 'login:ip',
  loginFailures: 'login:failures',
  register: 'register:ip',
  password: 'password:user',
  profile: 'profile:user',
} as const;

export async function register(_state: ActionState, formData: FormData): Promise<ActionState> {
  const ip = await clientIp();
  const quota = await consume(BUCKETS.register, ip, RULES.register);
  if (!quota.allowed) {
    return { message: retryMessage(quota.retryAfterMs) };
  }

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
  if (await emailTaken(email)) {
    return { errors: { email: ['An account already exists with this email address.'] } };
  }

  const userId = await createUser({
    email,
    password_hash: await hashPassword(password),
    first_name,
    last_name,
    phone: phone ? phone : null,
  });
  await logAction({
    userId,
    action: 'user.register',
    entity: 'user',
    entityId: userId,
    details: `Account created for ${email}`,
    ip,
  });

  await createSession(userId, 'user', 1);
  redirect(safeRelativePath(formData.get('next')) ?? '/account');
}

export async function login(_state: ActionState, formData: FormData): Promise<ActionState> {
  const ip = await clientIp();

  const fromIp = await consume(BUCKETS.loginIp, ip, RULES.loginByIp);
  if (!fromIp.allowed) {
    return { message: retryMessage(fromIp.retryAfterMs) };
  }

  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  const { email, password } = parsed.data;

  const locked = await peek(BUCKETS.loginFailures, email, RULES.loginByAccount);
  if (!locked.allowed) {
    return {
      message:
        'Too many attempts on this account. It is temporarily locked; try again in a few minutes.',
    };
  }

  const credentials = await findUserCredentials(email);
  const valid = await verifyPassword(password, credentials?.password_hash ?? '');

  if (!credentials || !credentials.password_hash || !valid) {
    await consume(BUCKETS.loginFailures, email, RULES.loginByAccount);
    await logAction({
      userId: credentials?.id ?? null,
      action: 'user.login.failed',
      entity: 'user',
      entityId: credentials?.id ?? null,
      details: 'Failed sign-in',
      ip,
    });
    return { message: SIGN_IN_FAILED };
  }

  if (credentials.status === 'suspended') {
    await consume(BUCKETS.loginFailures, email, RULES.loginByAccount);
    return { message: 'This account is suspended. Please contact customer service.' };
  }

  await reset(BUCKETS.loginFailures, email, RULES.loginByAccount);

  if (needsRehash(credentials.password_hash)) {
    await refreshPasswordHash(credentials.id, await hashPassword(password));
  }

  await logAction({
    userId: credentials.id,
    action: 'user.login',
    entity: 'user',
    entityId: credentials.id,
    details: `Sign-in by ${credentials.email}`,
    ip,
  });
  await createSession(credentials.id, credentials.role, credentials.session_version);

  const next = safeRelativePath(formData.get('next'));
  redirect(next ?? (credentials.role === 'admin' ? '/admin' : '/account'));
}

export async function logout(): Promise<void> {
  const user = await getCurrentUser();
  if (user) {
    await logAction({
      userId: user.id,
      action: 'user.logout',
      entity: 'user',
      entityId: user.id,
      details: `Sign-out by ${user.email}`,
      ip: await clientIp(),
    });
  }
  await deleteSession();
  redirect('/');
}

export async function saveProfile(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const quota = await consume(BUCKETS.profile, String(user.id), RULES.profileUpdate);
  if (!quota.allowed) return { message: retryMessage(quota.retryAfterMs) };

  const parsed = ProfileSchema.safeParse({
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    email: formData.get('email'),
    phone: formData.get('phone') ?? '',
  });

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  if (await emailTaken(parsed.data.email, user.id)) {
    return { errors: { email: ['This email address is already in use.'] } };
  }

  await updateProfile(user.id, {
    first_name: parsed.data.first_name,
    last_name: parsed.data.last_name,
    email: parsed.data.email,
    phone: parsed.data.phone ? parsed.data.phone : null,
  });
  await logAction({
    userId: user.id,
    action: 'user.profile',
    entity: 'user',
    entityId: user.id,
    details: 'Profile updated',
    ip: await clientIp(),
  });

  revalidatePath('/account');
  return { success: true, message: 'Profile updated.' };
}

export async function changePassword(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const quota = await consume(BUCKETS.password, String(user.id), RULES.passwordChange);
  if (!quota.allowed) return { message: retryMessage(quota.retryAfterMs) };

  const parsed = PasswordChangeSchema.safeParse({
    current: formData.get('current'),
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  });

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  const record = await findCredentialsById(user.id);
  if (!record || !record.password_hash) {
    return {
      errors: {
        current: ['This account signs in with Google and has no password to change.'],
      },
    };
  }
  if (!(await verifyPassword(parsed.data.current, record.password_hash))) {
    return { errors: { current: ['Current password is incorrect.'] } };
  }

  await updatePassword(user.id, await hashPassword(parsed.data.password));
  await logAction({
    userId: user.id,
    action: 'user.password',
    entity: 'user',
    entityId: user.id,
    details: 'Password changed — sessions revoked',
    ip: await clientIp(),
  });

  await createSession(user.id, record.role, record.session_version + 1);

  return {
    success: true,
    message: 'Password changed. Your other devices have been signed out.',
  };
}
