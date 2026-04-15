import { Settlement } from '../models/Settlement';
import { capturePayment } from './payment.service';
import { logger } from '../utils/logger';

export interface BookingEvent {
  event: string;
  bookingId: string;
  userId: string;
  scheduledEnd: string; // ISO string
  actualEnd: string; // ISO string
  includedUnits: number;
  actualUnits: number;
  baseFareCents: number;
  preAuthId: string;
  preAuthAmountCents: number;
}

export const processBookingCompleted = async (traceId: string, event: BookingEvent) => {
  logger.info(traceId, `Processing booking completed event`, { bookingId: event.bookingId });

  // 1. Idempotency Check: Don't process if it already exists
  const existingSettlement = await Settlement.findOne({ bookingId: event.bookingId });
  if (existingSettlement) {
    logger.info(traceId, `Settlement already processed for bookingId`, { bookingId: event.bookingId, status: existingSettlement.status });
    return existingSettlement;
  }

  // 2. Calculate Final Charge
  const chargeDetails = calculateCharge(event);
  const { totalAmountCents, overageCents, lateFeeCents } = chargeDetails;

  logger.info(traceId, `Calculated charges`, chargeDetails);

  // 3. Capture Payment
  // Intentionally use bookingId as the idempotency key so we don't double charge inside the gateway
  const captureResult = await capturePayment(traceId, {
    preAuthId: event.preAuthId,
    amountCents: totalAmountCents,
    idempotencyKey: event.bookingId // ensures gateway side idempotency
  });

  // 4. Record the outcome immutably
  const settlementDoc = new Settlement({
    bookingId: event.bookingId,
    userId: event.userId,
    baseFareCents: event.baseFareCents,
    overageCents,
    lateFeeCents,
    totalAmountCents,
    status: captureResult.success ? 'COMPLETED' : 'FAILED',
    captureId: captureResult.captureId,
    errorReason: captureResult.error
  });

  await settlementDoc.save();
  logger.info(traceId, `Settlement saved completely`, { status: settlementDoc.status });

  return settlementDoc;
};

export const calculateCharge = (event: BookingEvent) => {
  // Usage overage: $0.25 (25 cents) per unit over includedUnits
  const overageUnits = Math.max(0, event.actualUnits - event.includedUnits);
  const overageCents = overageUnits * 25;

  // Late-return fee: $15 (1500 cents) per hour past scheduledEnd
  // Design decision: Charge proportionally per partial hour. 
  // Wait, "per hour" in renting could mean strict per full hour started (Math.ceil). 
  // Let's go with exact fractions or full hour. We'll use Math.ceil to charge for any started hour over the limit.
  const scheduledEndMs = new Date(event.scheduledEnd).getTime();
  const actualEndMs = new Date(event.actualEnd).getTime();
  
  let lateFeeCents = 0;
  if (actualEndMs > scheduledEndMs) {
    const msLate = actualEndMs - scheduledEndMs;
    const hoursLate = Math.ceil(msLate / (1000 * 60 * 60)); // any partial hour is counted as an hour
    lateFeeCents = hoursLate * 1500;
  }

  const totalAmountCents = event.baseFareCents + overageCents + lateFeeCents;

  return {
    baseFareCents: event.baseFareCents,
    overageCents,
    lateFeeCents,
    totalAmountCents
  };
};
