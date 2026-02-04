import 'dotenv/config';
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

const sanitizeProvider = (provider) => ({
  model: provider.model,
  url: provider.url
});

const resolveToken = (token = '') => {
  const trimmed = token.trim();
  const match = trimmed.match(/^(?:\\$\\{?([A-Z0-9_]+)\\}?|env:([A-Z0-9_]+))$/);
  const envKey = match?.[1] || match?.[2];
  if (envKey) {
    return process.env[envKey] ?? '';
  }
  return trimmed;
};

const isValidProvider = (provider) =>
  provider &&
  provider.model &&
  provider.url &&
  resolveToken(provider.token) &&
  provider.model.trim() !== '' &&
  provider.url.trim() !== '' &&
  resolveToken(provider.token) !== '';

const buildPayload = (message, model) => ({
  model,
  messages: [
    {
      role: 'user',
      content: message
    }
  ]
});

const formatContent = (value, fallback) => {
  if (typeof value === 'string') {
    return value;
  }
  if (value !== undefined) {
    return JSON.stringify(value, null, 2);
  }
  return JSON.stringify(fallback, null, 2);
};

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
  return providers.filter(isValidProvider).map(sanitizeProvider);
})
  .post('/api/providers', async ({ body }) => {
  const { model, url, token } = body ?? {};
  const providers = await readJsonFile(providersPath, []);
  const nextProvider = { model, url, token };
  if (!isValidProvider(nextProvider)) {
    return { status: 'error', message: 'Informe modelo, URL e token válidos.' };
  }
  const updatedProviders = providers.filter((provider) => provider.model !== model);
  updatedProviders.push(nextProvider);
  await writeJsonFile(providersPath, updatedProviders);
  return { status: 'ok', provider: sanitizeProvider(nextProvider) };
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
  const providers = await readJsonFile(providersPath, []);
  const selectedProvider = providers.find((item) => item.model === provider);
  if (!selectedProvider || !isValidProvider(selectedProvider)) {
    return {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      role: 'assistant',
      content: 'Não encontrei um provedor válido. Verifique o modelo selecionado e o cadastro.',
      provider
    };
  }

  try {
    const payload = buildPayload(message, selectedProvider.model);
    const token = resolveToken(selectedProvider.token);
    const response = await fetch(selectedProvider.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    const content = formatContent(
      data?.choices?.[0]?.message?.content ??
        data?.choices?.[0]?.text ??
        data?.output_text,
      data
    );
    return {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      role: 'assistant',
      content,
      provider: selectedProvider.model
    };
  } catch (error) {
    return {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      role: 'assistant',
      content: 'Não foi possível completar a requisição agora. Verifique a URL e o token.',
      provider: selectedProvider.model
    };
  }
})
  .listen(PORT);

console.log(`API server running on http://localhost:${PORT}`);
