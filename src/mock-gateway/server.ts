import express, { Request, Response } from 'express';

const app = express();
const port = process.env.MOCK_PORT || 4000;

app.use(express.json());

// In-memory store for idempotency on the gateway side
const captures = new Map<string, any>();

app.post('/capture', (req: Request, res: Response): any => {
  const { preAuthId, amountCents, idempotencyKey } = req.body;

  if (!preAuthId || !amountCents || !idempotencyKey) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Simulate 15% flakiness
  if (Math.random() < 0.15) {
    // 50% chance of 500 error, 50% chance of timeout (simulated as hanging or just delay then 504)
    if (Math.random() < 0.5) {
      return res.status(500).json({ error: 'Internal Gateway Error' });
    } else {
      // simulate timeout by delaying and returning 504
      return setTimeout(() => {
        res.status(504).json({ error: 'Gateway Timeout' });
      }, 100);
    }
  }

  // Check idempotency
  if (captures.has(idempotencyKey)) {
    return res.status(200).json(captures.get(idempotencyKey));
  }

  // Process capture
  const result = {
    id: `capt_${Math.random().toString(36).substring(2, 9)}`,
    preAuthId,
    amountCents,
    status: 'succeeded',
    capturedAt: new Date().toISOString()
  };

  captures.set(idempotencyKey, result);

  return res.status(200).json(result);
});

app.listen(port, () => {
  console.log(`Mock Gateway is running on port ${port}`);
});
