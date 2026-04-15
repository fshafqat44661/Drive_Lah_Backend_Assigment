import { Router } from 'express';
import { handleBookingCompleted, getSettlement } from '../controllers/settlement.controller';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Middleware to inject traceId
router.use((req, res, next) => {
  const traceId = req.headers['x-trace-id'] as string || uuidv4();
  (req as any).traceId = traceId;
  res.setHeader('x-trace-id', traceId);
  next();
});

router.post('/events/booking-completed', handleBookingCompleted);
router.get('/settlements/:bookingId', getSettlement);

export default router;
