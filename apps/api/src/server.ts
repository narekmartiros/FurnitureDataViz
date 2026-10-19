import Fastify from 'fastify';
import cors from '@fastify/cors';
import { getGoogleSignInUrl } from './google-oauth';
import { fetchSheetDualLayer, pushSheetUpdates } from './sheets-sync';

const app = Fastify({ logger: true });
app.register(cors, { origin: true });

app.get('/api/auth/google/url', async () => {
  return { url: getGoogleSignInUrl() };
});

app.get('/api/sheets/:spreadsheetId', async (req) => {
  const { spreadsheetId } = req.params as { spreadsheetId: string };
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  return fetchSheetDualLayer(token, spreadsheetId);
});

app.post('/api/sheets/:spreadsheetId/sync', async (req) => {
  const { spreadsheetId } = req.params as { spreadsheetId: string };
  const { range = 'Sheet20!A1:G27', rows } = req.body as {
    range?: string;
    rows: (string | number)[][];
  };
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  return pushSheetUpdates(token, spreadsheetId, range, rows);
});

const port = Number(process.env.PORT || 4000);
app.listen({ port, host: '0.0.0.0' }).then(() => {
  console.log(`FurnitureDataViz API running on http://localhost:${port}`);
});
