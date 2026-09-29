import 'server-only';
import mongoose, { Schema } from 'mongoose';

export interface RateLimitDoc {
  _id: string;
  count: number;
  expires_at: Date;
}

const rateLimitSchema = new Schema<RateLimitDoc>(
  {
    _id: { type: String },
    count: { type: Number, required: true, default: 0 },
    expires_at: { type: Date, required: true },
  },
  { versionKey: false, id: false },
);
rateLimitSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0, name: 'ttl_rate_limits' });

export const RateLimitModel =
  (mongoose.models.RateLimit as mongoose.Model<RateLimitDoc>) ??
  mongoose.model<RateLimitDoc>('RateLimit', rateLimitSchema, 'rate_limits');
