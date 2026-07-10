import cookieParser from 'cookie-parser';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import swaggerUi from 'swagger-ui-express';
import authRouter from './routes/auth.js';
import scoresRouter from './routes/scores.js';
import { openapiSpec } from './openapi.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(express.json());
app.use(cookieParser());

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
app.get('/api/openapi.json', (_req, res) => res.json(openapiSpec));

app.use('/api/auth', authRouter);
app.use('/api/scores', scoresRouter);

if (process.env.NODE_ENV === 'production') {
  const buildDir = path.join(__dirname, '..', 'build');
  app.use(express.static(buildDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(buildDir, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
