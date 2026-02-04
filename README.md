<p align="center">
  <img
    src="https://github.com/user-attachments/assets/3c03aa7e-9d14-4c92-84f1-a887ca66f7af"
    alt="image"
    width="1899"
    height="926"
  />
</p>

# MyGPT (secure local multi-LLM)

MyGPT is a local interface to chat with multiple large language models (LLMs) in one place, keeping your keys and history under your control. It works with any provider compatible with the OpenAI-style API (`chat/completions`) and lets you switch models quickly without exposing tokens in the front-end.

## Key benefits

- **Centralizes multiple LLMs in one dashboard**: switch between Gemini, OpenAI, Claude, Copilot (or any compatible provider) without leaving the app.
- **Local and secure execution**: the back end runs locally and makes requests directly to providers; tokens stay on the server and/or in your `.env`.
- **Local history**: your conversations are stored locally and can be exported/imported as JSON.
- **Fast, lightweight interface**: UI built with React + Vite with a focus on usability.

## How it works (overview)

1. **Front-end** (React/Vite) renders the chat UI and model selector.
2. **Local back-end** (Elysia/Node) receives messages, resolves tokens from `.env`, and forwards them to the provider.
3. **Local persistence**: history and providers are stored in `history.json` and `providers.json`.

## Requirements

- Node.js 18+ (recommended)
- npm (or another package manager, but the commands below use npm)

## Token configuration (required for use)

1. **Create the `.env` file** from the example:

   ```bash
   cp .env.example .env
   ```

2. **Fill in your keys** in `.env`:

   ```env
   GEMINI_TOKEN=...
   OPENAI_TOKEN=...
   CLAUDE_TOKEN=...
   COPILOT_TOKEN=...
   TOKEN=... # optional generic token used by providers
   ```

> ⚠️ `.env` is never committed. It is ignored by `.gitignore`.

## Provider setup

Providers are configured in `providers.json`. Each entry requires:

- `model`: model name to send in the payload
- `url`: OpenAI-compatible endpoint
- `token`: literal token **or** an environment variable reference like `${GEMINI_TOKEN}`

Example:

```json
[
  {
    "model": "gemini-1.5-pro",
    "url": "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    "token": "${GEMINI_TOKEN}"
  }
]
```

You can also reference environment variables in the URL or token using:

- `${TOKEN}`
- `env:TOKEN`
- `process.env.TOKEN`

> 🔐 **Best practices**: always use `${VARIABLE_NAME}` (or `process.env.VARIABLE_NAME`) in `providers.json` to keep tokens out of the repo.

## Running locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development environment:

   ```bash
   npm run dev
   ```

This starts:

- **Local API** at `http://localhost:5174`
- **Front-end** at `http://localhost:5173`

## Basic usage

1. Open the application in your browser.
2. Select a provider/model at the top.
3. Send messages normally.
4. Export/import history when needed.

## Security

- Tokens stay on the server and/or `.env`.
- The front-end never receives your tokens.
- History stays on your machine (local file).

## Project structure

```
.
├── server.js         # Local API that talks to providers
├── providers.json    # Provider list (with tokens/variables)
├── history.json      # Locally persisted history
├── src/              # React front-end
└── .env.example      # Environment variable example
```

## Tips

- To add new providers, add more objects to `providers.json`.
- To rotate tokens, edit only `.env`.
- You can also add providers via the UI ("Add provider" button).

## License

Free to use for personal and internal purposes.

---

# MyGPT (multi-LLM local seguro)

O MyGPT é uma interface local para conversar com múltiplos modelos de linguagem (LLMs) em um único lugar, mantendo suas chaves e histórico sob seu controle. Ele funciona com qualquer provedor compatível com a API estilo OpenAI (endpoint de `chat/completions`) e permite alternar modelos rapidamente sem expor tokens no front-end.

## Principais benefícios

- **Centraliza LLMs em um único painel**: alterne entre Gemini, OpenAI, Claude, Copilot (ou outros compatíveis) sem sair da aplicação.
- **Execução local e segura**: o back-end roda localmente e faz as requisições diretamente aos provedores; tokens ficam no servidor e/ou no seu `.env`.
- **Histórico local**: suas conversas são persistidas localmente e podem ser exportadas/importadas via JSON.
- **Interface rápida e leve**: UI feita em React + Vite com foco em usabilidade.

## Como funciona (visão geral)

1. **Front-end** (React/Vite) exibe a interface de chat e o seletor de modelos.
2. **Back-end local** (Elysia/Node) recebe as mensagens, resolve os tokens do `.env` e encaminha para o provedor.
3. **Persistência local**: o histórico e a lista de provedores ficam em `history.json` e `providers.json`.

## Requisitos

- Node.js 18+ (recomendado)
- npm (ou outro gerenciador, mas os comandos abaixo usam npm)

## Configuração de tokens (obrigatório para uso)

1. **Crie o arquivo `.env`** a partir do exemplo:

   ```bash
   cp .env.example .env
   ```

2. **Preencha suas chaves** no `.env`:

   ```env
   GEMINI_TOKEN=...
   OPENAI_TOKEN=...
   CLAUDE_TOKEN=...
   COPILOT_TOKEN=...
   TOKEN=... # token genérico opcional usado pelos provedores
   ```

> ⚠️ O `.env` nunca é commitado. Ele fica ignorado no `.gitignore`.

## Cadastro de provedores

Os provedores são configurados no arquivo `providers.json`. Cada entrada exige:

- `model`: nome do modelo a ser enviado no payload
- `url`: endpoint compatível com OpenAI
- `token`: token literal **ou** referência a variável de ambiente, como `${GEMINI_TOKEN}`

Exemplo:

```json
[
  {
    "model": "gemini-1.5-pro",
    "url": "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    "token": "${GEMINI_TOKEN}"
  }
]
```

Você também pode referenciar variáveis de ambiente na URL ou no token usando:

- `${TOKEN}`
- `env:TOKEN`
- `process.env.TOKEN`

> 🔐 **Boas práticas**: use sempre `${NOME_DA_VARIAVEL}` (ou `process.env.NOME_DA_VARIAVEL`) no `providers.json` para manter seus tokens fora do repo.

## Executando localmente

1. Instale dependências:

   ```bash
   npm install
   ```

2. Rode o ambiente de desenvolvimento:

   ```bash
   npm run dev
   ```

Isso inicia:

- **API local** em `http://localhost:5174`
- **Front-end** em `http://localhost:5173`

## Uso básico

1. Abra a aplicação no navegador.
2. Selecione um provedor/modelo no topo.
3. Envie mensagens normalmente.
4. Exporte/importa histórico quando necessário.

## Segurança

- Tokens ficam no servidor e/ou `.env`.
- O front-end nunca recebe seus tokens.
- O histórico permanece no seu computador (arquivo local).

## Estrutura do projeto

```
.
├── server.js         # API local que conversa com os provedores
├── providers.json    # Lista de provedores (com tokens/variáveis)
├── history.json      # Histórico persistido localmente
├── src/              # Front-end React
└── .env.example      # Exemplo de variáveis de ambiente
```

## Dicas

- Para adicionar novos provedores, basta inserir mais objetos no `providers.json`.
- Para trocar tokens, edite apenas o `.env`.
- Se preferir, você pode cadastrar provedores pela UI (botão “Adicionar provedor”).

## Licença

Uso livre para fins pessoais e internos.
