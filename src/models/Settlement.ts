import mongoose, { Document, Schema } from 'mongoose';

export interface ISettlement extends Document {
  bookingId: string;
  userId: string;
  baseFareCents: number;
  overageCents: number;
  lateFeeCents: number;
  totalAmountCents: number;
  status: 'COMPLETED' | 'FAILED';
  captureId?: string;
  errorReason?: string;
  createdAt: Date;
}

const settlementSchema = new Schema<ISettlement>({
  bookingId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true },
  baseFareCents: { type: Number, required: true },
  overageCents: { type: Number, default: 0 },
  lateFeeCents: { type: Number, default: 0 },
  totalAmountCents: { type: Number, required: true },
  status: { type: String, enum: ['COMPLETED', 'FAILED'], required: true },
  captureId: { type: String, required: false },
  errorReason: { type: String, required: false },
  createdAt: { type: Date, default: Date.now },
});

export const Settlement = mongoose.model<ISettlement>('Settlement', settlementSchema);
