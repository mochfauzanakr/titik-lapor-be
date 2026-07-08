import express from 'express'
import 'dotenv/config';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import { apiLimiter, authLimiter } from './middlewares/rateLimiter.js';
import { sanitizeBody } from './middlewares/sanitize.js';
import authRouter from './routes/authRoutes.js';
import userRouter from './routes/userRoutes.js';
import categoryRouter from './routes/categoryRoutes.js';
import reportRouter from './routes/reportRoutes.js';
import tanggapanRouter from './routes/tanggapanRoutes.js';
import commentRouter from './routes/commentRoutes.js';
import errorHandler from './middlewares/errorHandler.js';
const app = express()

app.use(helmet());
app.use(compression());
app.use(cors({ origin: process.env.FRONTEND_URL || true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(sanitizeBody);


if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/category", categoryRouter);
app.use("/api/reports", reportRouter);
app.use("/api/reports", tanggapanRouter);
app.use("/api/reports", commentRouter);

app.use(errorHandler);

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});

export default app;

