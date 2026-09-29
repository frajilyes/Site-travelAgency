import 'server-only';
import mongoose, { Schema } from 'mongoose';
import { autoIncrement } from '../db';
import type { AuditLog, Role, User, UserStatus } from '../types';

type UserDoc = Omit<User, 'id'> & { _id: number };
type AuditLogDoc = Omit<AuditLog, 'id'> & { _id: number };

const OPTIONS = { versionKey: false, id: false } as const;

const ROLES: Role[] = ['user', 'admin'];
const USER_STATUSES: UserStatus[] = ['active', 'suspended'];

const userSchema = new Schema<UserDoc>(
  {
    _id: { type: Number },
    email: { type: String, required: true },
    password_hash: { type: String, required: true },
    google_id: { type: String, default: null },
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    phone: { type: String, default: null },
    role: { type: String, required: true, enum: ROLES, default: 'user' },
    status: { type: String, required: true, enum: USER_STATUSES, default: 'active' },
    session_version: { type: Number, required: true, default: 1, min: 0 },
    created_at: { type: String, required: true },
    updated_at: { type: String, required: true },
  },
  OPTIONS,
);
userSchema.index({ email: 1 }, { unique: true, name: 'uniq_users_email' });
userSchema.index(
  { google_id: 1 },
  { unique: true, partialFilterExpression: { google_id: { $type: 'string' } }, name: 'uniq_users_google' },
);
autoIncrement(userSchema, 'users');

const auditLogSchema = new Schema<AuditLogDoc>(
  {
    _id: { type: Number },
    user_id: { type: Number, default: null },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entity_id: { type: String, default: null },
    details: { type: String, default: null },
    ip: { type: String, default: null },
    created_at: { type: String, required: true },
  },
  OPTIONS,
);
auditLogSchema.index({ created_at: -1 }, { name: 'idx_audit_created' });
auditLogSchema.index({ user_id: 1, _id: -1 }, { name: 'idx_audit_actor' });
auditLogSchema.index({ action: 1, _id: -1 }, { name: 'idx_audit_action' });
autoIncrement(auditLogSchema, 'audit_logs');

export const UserModel =
  (mongoose.models.User as mongoose.Model<UserDoc>) ??
  mongoose.model<UserDoc>('User', userSchema, 'users');

export const AuditLogModel =
  (mongoose.models.AuditLog as mongoose.Model<AuditLogDoc>) ??
  mongoose.model<AuditLogDoc>('AuditLog', auditLogSchema, 'audit_logs');
