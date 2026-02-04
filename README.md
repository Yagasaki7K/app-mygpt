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

> 🔐 **Boas práticas**: use sempre `${NOME_DA_VARIAVEL}` no `providers.json` para manter seus tokens fora do repo.

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
