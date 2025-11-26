import express from 'express';
import cors from 'cors';
import analyzeHandler from './api/analyze.js';
import healthHandler from './api/health.js';

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.disable('x-powered-by');
app.use(cors());

app.all('/api/analyze', (req, res) => analyzeHandler(req, res));
app.all('/api/health', (req, res) => healthHandler(req, res));

app.listen(PORT, () => {
  console.log(`AI Mapper backend listening on http://localhost:${PORT}`);
});
