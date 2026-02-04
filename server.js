import { Elysia } from 'elysia';
import { node } from '@elysiajs/node';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 5174;

const historyPath = path.join(__dirname, 'history.json');
const providersPath = path.join(__dirname, 'providers.json');

const readJsonFile = async (filePath, fallback) => {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(filePath, JSON.stringify(fallback, null, 2));
      return fallback;
    }
    throw error;
  }
};

const writeJsonFile = async (filePath, data) => {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
};

const app = new Elysia({ adapter: node() })
  .get('/api/providers', async () => {
  const providers = await readJsonFile(providersPath, []);
  const validProviders = providers.filter((provider) => provider.token && provider.token.trim() !== '');
  return validProviders;
})
  .get('/api/history', async () => {
  const history = await readJsonFile(historyPath, []);
  return history;
})
  .post('/api/history', async ({ body }) => {
  const history = Array.isArray(body) ? body : [];
  await writeJsonFile(historyPath, history);
  return { status: 'ok' };
})
  .post('/api/message', async ({ body }) => {
  const { message } = body;
  const history = await readJsonFile(historyPath, []);
  const nextHistory = [...history, message];
  await writeJsonFile(historyPath, nextHistory);
  return { status: 'ok', history: nextHistory };
})
  .post('/api/chat', async ({ body }) => {
  const { provider, message } = body;
  const reply = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    role: 'assistant',
    content: `Resposta gerada por ${provider}: ${message.slice(0, 120)}`,
    provider
  };
  return reply;
})
  .listen(PORT);

console.log(`API server running on http://localhost:${PORT}`);
