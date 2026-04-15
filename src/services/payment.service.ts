import axios from 'axios';
import { logger } from '../utils/logger';

const PAYMENT_API_URL = process.env.PAYMENT_API_URL || 'http://localhost:4000/capture';

export interface CapturePayload {
  preAuthId: string;
  amountCents: number;
  idempotencyKey: string;
}

export interface CaptureResult {
  success: boolean;
  captureId?: string;
  error?: string;
}

export const capturePayment = async (
  traceId: string,
  payload: CapturePayload,
  maxRetries = 3
): Promise<CaptureResult> => {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      attempt++;
      logger.info(traceId, `Payment capture attempt ${attempt}/${maxRetries}`, { preAuthId: payload.preAuthId });

      const response = await axios.post(PAYMENT_API_URL, payload, {
        timeout: 5000 // 5 seconds timeout
      });

      logger.info(traceId, `Payment capture succeeded on attempt ${attempt}`, { captureId: response.data.id });
      return { success: true, captureId: response.data.id };

    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries;
      const errorMessage = error.response?.data?.error || error.message;
      
      logger.warn(traceId, `Payment capture failed on attempt ${attempt}`, { error: errorMessage });

      // If it's a 4xx error (except 429), it's likely a bad request, don't retry (we shouldn't get these, but safe to check)
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        logger.error(traceId, `Non-retriable payment error`, { status: error.response.status });
        return { success: false, error: errorMessage };
      }

      if (isLastAttempt) {
        logger.error(traceId, `Payment capture exhausted retries`, { error: errorMessage });
        return { success: false, error: errorMessage };
      }

      // Exponential backoff: 500ms, 1000ms, 2000ms
      const backoffMs = Math.pow(2, attempt - 1) * 500;
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }

  return { success: false, error: 'Unknown exact cause after max retries' };
};
