import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';

const configureAPI = (app: express.Application) => {
  // Security
  app.use(helmet());
  app.use(cors());
  app.use(compression());

  // API Bypass for development
  if (process.env.UNIVERSAL_BYPASS === 'enabled') {
    app.use((req, res, next) => {
      req.headers['x-bypass-auth'] = 'true';
      next();
    });
  }

  // API Override
  if (process.env.API_OVERRIDE === 'enabled') {
    app.use((req, res, next) => {
      req.headers['x-api-override'] = 'true';
      next();
    });
  }

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
  });
  app.use('/api/', limiter);

  return app;
};

export default configureAPI;