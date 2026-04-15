# Settlement Service

A reliable settlement service built with Node.js, Express, and Mongoose for a booking platform. Designed to compute charges, interface securely with a mock payment gateway, and guarantee idempotency.

## How to Run

You can run this project using either Docker or directly via NPM.

### Run with Docker (Recommended)
Prerequisites: Docker & Docker Compose
```bash
docker-compose up --build
```
This single command spins up:
- The main settlement service (`:3000`)
- The mock payment gateway (`:4000`)
- The MongoDB instance

### Run Local (NPM)
Prerequisites: Node.js (v18+) & a running MongoDB instance.
```bash
npm install
npm run start:all
```
Note: Ensure you configure `MONGO_URI` in `.env` if not using the default `mongodb://127.0.0.1:27017/settlements`.

## Run Tests
Unit and Idempotency tests are implemented using Jest.
```bash
npm test
```

## Key Design Decisions

1. **Idempotency**: Handled at multiple levels. 
   - We check if a `Settlement` for `bookingId` exists in MongoDB to prevent dual processing. 
   - We also intentionally pass `bookingId` to the Payment Gateway as the `idempotencyKey` so the gateway knows it's a retry of the same transaction event.
2. **Immutability of Settlements**: The service does not insert a document and later update it to "COMPLETED". Instead, as per the specification, it waits for the payment capture request to resolve (either successfully or exhausting retries) and then inserts a single, immutable snapshot into the database.
3. **Flaky API Retries**: Implemented exponential backoff (500ms, 1s, 2s). Capturing the payment runs sequentially with retries. If the gateway timeout/500 errors reach max retries, it is recorded as `FAILED`, giving administrators clear insight.
4. **Structured Logging**: Added a minimal trace logger mechanism wrapper. Every request is assigned a `traceId`.

## Tradeoffs & What I Would Do With More Time

1. **Tradeoff: Single Database Action**: We perform our database insert only *after* catching the gateway API response. If the Node service crashes immediately before executing `await settlementDoc.save()` but after a successful charge, the record is lost, and the next event retry would double-charge the gateway mock (although bounded by mock idempotency!). With more time, I would write the `status: PROCESSING` first, then finalize with a secondary `update`, taking distributed locks.
2. **With More Time**:
   - I would add a durable job queue (e.g. BullMQ) for robust retry ability and off-process execution.
   - Comprehensive rate-limiting on the main endpoint to protect against burst attacks.
   - Separate instances across Docker for the Gateway and the Service to perfectly isolate processes.
