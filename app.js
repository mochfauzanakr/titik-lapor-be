import express from 'express'
import 'dotenv/config';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import compression from 'compression';
import authRouter from './routes/authRoutes.js';
import userRouter from './routes/userRoutes.js';
import categoryRouter from './routes/categoryRoutes.js';
import reportRouter from './routes/reportRoutes.js';
import tanggapanRouter from './routes/tanggapanRoutes.js';
import commentRouter from './routes/commentRoutes.js';
import errorHandler from './middlewares/errorHandler.js';
const app = express()

app.use(compression());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json()); 
app.use(morgan('dev'));
app.use(cookieParser());
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/category", categoryRouter);
app.use("/api/reports", reportRouter);
app.use("/api/reports", tanggapanRouter);
app.use("/api/reports", commentRouter);

app.use(errorHandler);

if (process.env.NODE_ENV !== 'production') {
  app.listen(process.env.PORT || 5000, () => {
    console.log(`Example app listening on port ${process.env.PORT || 3000}`);
  });
}

export default app;