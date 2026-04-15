import { calculateCharge, BookingEvent } from '../src/services/settlement.service';

describe('Charge Calculation', () => {
  it('should calculate base fare with no overages or late fees', () => {
    const event: BookingEvent = {
      event: 'BookingCompleted',
      bookingId: 'bk_1',
      userId: 'user_1',
      scheduledEnd: '2026-04-10T18:00:00Z',
      actualEnd: '2026-04-10T18:00:00Z',
      includedUnits: 200,
      actualUnits: 150,
      baseFareCents: 8500,
      preAuthId: 'auth_1',
      preAuthAmountCents: 10000
    };

    const charges = calculateCharge(event);
    expect(charges.baseFareCents).toBe(8500);
    expect(charges.overageCents).toBe(0);
    expect(charges.lateFeeCents).toBe(0);
    expect(charges.totalAmountCents).toBe(8500);
  });

  it('should calculate overage charges correctly', () => {
    const event: BookingEvent = {
      event: 'BookingCompleted',
      bookingId: 'bk_1',
      userId: 'user_1',
      scheduledEnd: '2026-04-10T18:00:00Z',
      actualEnd: '2026-04-10T18:00:00Z',
      includedUnits: 200,
      actualUnits: 237, // 37 units over
      baseFareCents: 8500,
      preAuthId: 'auth_1',
      preAuthAmountCents: 10000
    };

    const charges = calculateCharge(event);
    expect(charges.overageCents).toBe(37 * 25); // 925
    expect(charges.totalAmountCents).toBe(8500 + 925);
  });

  it('should calculate late fees correctly (partial hour)', () => {
    const event: BookingEvent = {
      event: 'BookingCompleted',
      bookingId: 'bk_1',
      userId: 'user_1',
      scheduledEnd: '2026-04-10T18:00:00Z',
      actualEnd: '2026-04-10T19:30:00Z', // 1.5 hours late = 2 started hours
      includedUnits: 200,
      actualUnits: 200,
      baseFareCents: 8500,
      preAuthId: 'auth_1',
      preAuthAmountCents: 10000
    };

    const charges = calculateCharge(event);
    // 2 hours started * 1500 = 3000
    expect(charges.lateFeeCents).toBe(3000);
    expect(charges.totalAmountCents).toBe(8500 + 3000);
  });

  it('should combine all charges correctly', () => {
    const event: BookingEvent = {
      event: 'BookingCompleted',
      bookingId: 'bk_8f2a',
      userId: 'user_123',
      scheduledEnd: '2026-04-10T18:00:00Z',
      actualEnd: '2026-04-10T19:30:00Z', // 2 started hours = 3000
      includedUnits: 200,
      actualUnits: 237, // 37 over = 925
      baseFareCents: 8500,
      preAuthId: 'auth_xyz',
      preAuthAmountCents: 50000
    };

    const charges = calculateCharge(event);
    expect(charges.totalAmountCents).toBe(8500 + 925 + 3000); // 12425
  });
});
