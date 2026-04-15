import express from 'express';
import eventRoutes from './routes/event.routes';

const app = express();

app.use(express.json());
app.use('/', eventRoutes);

// Export for testing
export default app;
