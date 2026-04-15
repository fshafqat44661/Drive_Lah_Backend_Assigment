import { Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { processBookingCompleted } from '../services/settlement.service';
import { Settlement } from '../models/Settlement';
import { logger } from '../utils/logger';

const bookingEventSchema = z.object({
  event: z.literal('BookingCompleted'),
  bookingId: z.string().min(1),
  userId: z.string().min(1),
  scheduledEnd: z.string().datetime(),
  actualEnd: z.string().datetime(),
  includedUnits: z.number().min(0),
  actualUnits: z.number().min(0),
  baseFareCents: z.number().min(0),
  preAuthId: z.string().min(1),
  preAuthAmountCents: z.number().min(0)
});

export const handleBookingCompleted = async (req: Request, res: Response): Promise<void> => {
  const traceId = (req as any).traceId || uuidv4();

  try {
    const validatedData = bookingEventSchema.parse(req.body);
    logger.info(traceId, 'Received BookingCompleted event', { body: validatedData });

    const settlement = await processBookingCompleted(traceId, validatedData);
    
    res.status(200).json({
      message: 'Settlement processed',
      settlement
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      logger.warn(traceId, 'Validation error', { errors: error.errors });
      res.status(400).json({ error: 'Invalid event payload', details: error.errors });
      return;
    }

    logger.error(traceId, 'Error processing booking', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getSettlement = async (req: Request, res: Response): Promise<void> => {
  const traceId = (req as any).traceId || uuidv4();
  const { bookingId } = req.params;

  try {
    const settlement = await Settlement.findOne({ bookingId });
    if (!settlement) {
      res.status(404).json({ error: 'Settlement not found' });
      return;
    }

    res.status(200).json(settlement);
  } catch (error: any) {
    logger.error(traceId, 'Error retrieving settlement', { error: error.message, bookingId });
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
