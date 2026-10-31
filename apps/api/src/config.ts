import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databasePath: process.env.DATABASE_PATH || path.resolve(process.cwd(), 'database/transcode.sqlite'),
  modelServiceUrl: process.env.MODEL_SERVICE_URL || 'http://localhost:8000',
  executionRunnerUrl: process.env.EXECUTION_RUNNER_URL || 'http://localhost:5000',
  corsOrigin: process.env.CORS_ORIGIN || '*',
};

