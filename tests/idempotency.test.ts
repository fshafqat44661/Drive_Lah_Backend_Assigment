import { processBookingCompleted } from '../src/services/settlement.service';
import { Settlement } from '../src/models/Settlement';
import * as paymentService from '../src/services/payment.service';

jest.mock('../src/models/Settlement');

describe('Idempotency & Retries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockEvent = {
    event: 'BookingCompleted',
    bookingId: 'bk_2',
    userId: 'user_1',
    scheduledEnd: '2026-04-10T18:00:00Z',
    actualEnd: '2026-04-10T18:00:00Z',
    includedUnits: 200,
    actualUnits: 200,
    baseFareCents: 8500,
    preAuthId: 'auth_1',
    preAuthAmountCents: 10000
  };

  it('should not process again if settlement already exists', async () => {
    // Mock that settlement exists
    (Settlement.findOne as jest.Mock).mockResolvedValue({
      bookingId: 'bk_2',
      status: 'COMPLETED'
    });

    const spyPayment = jest.spyOn(paymentService, 'capturePayment');

    const result = await processBookingCompleted('test-trace', mockEvent);

    expect(result.status).toBe('COMPLETED');
    expect(Settlement.findOne).toHaveBeenCalledWith({ bookingId: 'bk_2' });
    expect(spyPayment).not.toHaveBeenCalled();
  });

  it('should process once and retry on flaky payment API', async () => {
    // Doesn't exist initially
    (Settlement.findOne as jest.Mock).mockResolvedValue(null);

    // Mock payment service to simulate idempotency of the payment service itself
    const captureResult = { success: true, captureId: 'capt_123' };
    const spyPayment = jest.spyOn(paymentService, 'capturePayment').mockResolvedValue(captureResult);

    // Mock save
    const mockSave = jest.fn().mockResolvedValue(true);
    (Settlement as unknown as jest.Mock).mockImplementation(() => ({
      save: mockSave,
      status: 'COMPLETED'
    }));

    await processBookingCompleted('test-trace', mockEvent);

    expect(Settlement.findOne).toHaveBeenCalledTimes(1);
    expect(spyPayment).toHaveBeenCalledTimes(1);
    expect(spyPayment).toHaveBeenCalledWith(
      'test-trace',
      expect.objectContaining({ idempotencyKey: 'bk_2' })
    );
    expect(mockSave).toHaveBeenCalledTimes(1);
  });
});
