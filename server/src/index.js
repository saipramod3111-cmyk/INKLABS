import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import uploadRoutes from './routes/upload.js';
import orderRoutes from './routes/orders.js';
import checkoutRoutes from './routes/checkout.js';

const app = express();

app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(config.uploadDir, { maxAge: '7d' }));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'InkLabs API', paymentMode: config.stripeMode }));
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api', orderRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, next) => {
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Something went wrong' : err.message });
});

app.listen(config.port, () => {
  console.log(`InkLabs API listening on http://localhost:${config.port} (payments: ${config.stripeMode})`);
});
