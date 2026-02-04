# Especificação Técnica — SPA de Chat Multi-IA com Histórico Persistente

## Objetivo
Construir uma **Single Page Application (SPA)** que replique a experiência da página de conversas do ChatGPT, permitindo alternar entre provedores de IA sem perder o histórico. A aplicação deve manter **todo o histórico persistido** enquanto estiver em execução e reconstruí-lo ao recarregar a página.

## Stack Obrigatória
- Vite
- React
- JavaScript ou TypeScript
- styled-components

### Restrições
- **Não** usar Tailwind.
- **Não** usar bibliotecas de UI prontas.
- Todo o CSS deve estar **exclusivamente** em `styled-components`, no mesmo arquivo do componente/página.
- Modo noturno com `prefers-color-scheme: dark` e/ou controle interno de estado.

## UI/UX
- Estética premium inspirada no **Apple Liquid Glass / Glassmorphism**.
- Modo noturno como padrão.
- Tipografia limpa e moderna.
- Layout:
  - Header com seletor de IA.
  - Área central de mensagens.
  - Input fixo inferior.
- Mensagens do usuário e da IA visualmente distintas.
- Indicador de “IA digitando”.
- Responsividade total.

## Histórico Persistente (Crítico)
- Manter um arquivo `history.json`.
- Cada mensagem deve incluir:
  - `timestamp`
  - `role` (`user` | `assistant`)
  - `content`
  - `provider`
- Fluxo obrigatório:
  - Ao iniciar, ler o `history.json` e reconstruir a conversa.
  - A cada nova mensagem enviada/recebida, persistir o histórico.
  - O layout deve simular o histórico contínuo do ChatGPT.

> Observação: utilizar backend local com **Elysia.js** para leitura/escrita do `history.json`.

## Provedores de IA
- Manter um arquivo `providers.json` com a estrutura:

```json
[
  { "name": "OpenAI", "token": "sk-xxxx" },
  { "name": "OutraIA", "token": "" }
]
```

- Somente provedores com `token` válido devem aparecer no `<select>`.
- O usuário **não** informa tokens manualmente.
- A troca de IA deve ser instantânea, sem apagar o histórico.
- Cada resposta deve registrar o provedor utilizado.

## Arquitetura e Fluxo de Dados
1. **Bootstrap**
   - SPA inicializa lendo `/api/providers` e `/api/history` (servidos pelo Elysia.js).
   - Define o provedor ativo com base nos tokens válidos.
2. **Envio de Mensagem**
   - Cria mensagem do usuário com metadados.
   - Persiste o histórico completo em `history.json`.
3. **Resposta da IA**
   - Envia a mensagem para `/api/chat` (camada mockável no backend Elysia.js).
   - Recebe resposta com `provider`, `timestamp` e `content`.
   - Atualiza e persiste o histórico.
4. **Persistência**
   - `/api/history` mantém a fonte da verdade.
   - Ao recarregar, o frontend reconstrói todo o fluxo.

## Como Adicionar Novas IAs
1. Edite `providers.json`.
2. Adicione um novo objeto com `name` e `token` válido.
3. Reinicie o servidor de desenvolvimento.
4. O novo provedor aparecerá automaticamente no seletor.

## Requisitos de Implementação
- SPA com React Hooks.
- Componentização clara para:
  - carregamento de provedores,
  - controle do provedor ativo,
  - envio e renderização de mensagens,
  - persistência do histórico.
- Comunicação com IA via `fetch`, com camada mockável.
- Código limpo e extensível, evitando overengineering.
