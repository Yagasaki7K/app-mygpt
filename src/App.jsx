import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled, { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    font-family: 'SF Pro Text', 'Inter', system-ui, -apple-system, sans-serif;
    background: radial-gradient(circle at top, rgba(50, 54, 73, 0.85), rgba(8, 10, 18, 1));
    color: #f5f7ff;
    min-height: 100vh;
  }

  #root {
    min-height: 100vh;
  }

  @media (prefers-color-scheme: light) {
    body {
      background: radial-gradient(circle at top, rgba(220, 230, 255, 0.9), rgba(235, 238, 248, 1));
      color: #0c0f1a;
    }
  }
`;

const API_BASE = '/api';

const App = () => {
  const [providers, setProviders] = useState([]);
  const [activeProvider, setActiveProvider] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);
  const hasLoadedHistory = useRef(false);

  const canSend = useMemo(() => input.trim().length > 0 && activeProvider, [input, activeProvider]);

  useEffect(() => {
    const loadProviders = async () => {
      const response = await fetch(`${API_BASE}/providers`);
      const data = await response.json();
      setProviders(data);
      if (data.length > 0) {
        setActiveProvider(data[0].name);
      }
    };

    const loadHistory = async () => {
      const response = await fetch(`${API_BASE}/history`);
      const data = await response.json();
      setMessages(data);
      hasLoadedHistory.current = true;
    };

    loadProviders();
    loadHistory();
  }, []);

  useEffect(() => {
    if (!hasLoadedHistory.current) {
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const persistHistory = async (nextHistory) => {
    await fetch(`${API_BASE}/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(nextHistory)
    });
  };

  const handleSend = async () => {
    if (!canSend) {
      return;
    }

    const trimmed = input.trim();
    const userMessage = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      role: 'user',
      content: trimmed,
      provider: activeProvider
    };

    const nextHistory = [...messages, userMessage];
    setMessages(nextHistory);
    setInput('');
    setIsTyping(true);
    await persistHistory(nextHistory);

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ provider: activeProvider, message: trimmed })
      });
      const data = await response.json();
      const assistantMessage = {
        ...data,
        provider: activeProvider
      };
      const updatedHistory = [...nextHistory, assistantMessage];
      setMessages(updatedHistory);
      await persistHistory(updatedHistory);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <Shell>
      <GlobalStyle />
      <Header>
        <TitleArea>
          <Title>MyGPT</Title>
          <Subtitle>Histórico contínuo com múltiplas IAs</Subtitle>
        </TitleArea>
        <ProviderSelect
          value={activeProvider}
          onChange={(event) => setActiveProvider(event.target.value)}
          disabled={providers.length === 0}
        >
          {providers.length === 0 ? (
            <option>Sem provedores válidos</option>
          ) : (
            providers.map((provider) => (
              <option key={provider.name} value={provider.name}>
                {provider.name}
              </option>
            ))
          )}
        </ProviderSelect>
      </Header>

      <ChatArea>
        {messages.map((message) => (
          <MessageRow key={message.id} $role={message.role}>
            <MessageBubble $role={message.role}>
              <MessageMeta>
                <span>{message.role === 'user' ? 'Você' : message.provider}</span>
                <span>{new Date(message.timestamp).toLocaleTimeString('pt-BR')}</span>
              </MessageMeta>
              <MessageContent>{message.content}</MessageContent>
            </MessageBubble>
          </MessageRow>
        ))}
        {isTyping && (
          <MessageRow $role="assistant">
            <TypingBubble>
              <span>IA digitando</span>
              <TypingDots>
                <span />
                <span />
                <span />
              </TypingDots>
            </TypingBubble>
          </MessageRow>
        )}
        <div ref={bottomRef} />
      </ChatArea>

      <Composer>
        <ComposerInner>
          <TextInput
            rows={1}
            placeholder="Digite sua mensagem..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <SendButton onClick={handleSend} disabled={!canSend}>
            Enviar
          </SendButton>
        </ComposerInner>
      </Composer>
    </Shell>
  );
};

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 24px 24px 110px;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 24px;
  border-radius: 24px;
  background: rgba(20, 24, 40, 0.6);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);

  @media (max-width: 720px) {
    flex-direction: column;
    align-items: flex-start;
  }

  @media (prefers-color-scheme: light) {
    background: rgba(255, 255, 255, 0.7);
    box-shadow: 0 12px 40px rgba(120, 130, 160, 0.18);
  }
`;

const TitleArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 24px;
  letter-spacing: 0.04em;
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 14px;
  opacity: 0.7;
`;

const ProviderSelect = styled.select`
  background: rgba(15, 18, 30, 0.8);
  color: inherit;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 12px 16px;
  font-size: 14px;
  min-width: 200px;
  backdrop-filter: blur(10px);

  &:disabled {
    opacity: 0.6;
  }

  @media (prefers-color-scheme: light) {
    background: rgba(255, 255, 255, 0.8);
    border-color: rgba(20, 30, 60, 0.2);
  }
`;

const ChatArea = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 32px 12px 0;
`;

const MessageRow = styled.div`
  display: flex;
  justify-content: ${(props) => (props.$role === 'user' ? 'flex-end' : 'flex-start')};
`;

const MessageBubble = styled.div`
  max-width: min(720px, 100%);
  padding: 16px 18px;
  border-radius: 22px;
  background: ${(props) =>
    props.$role === 'user'
      ? 'linear-gradient(135deg, rgba(74, 100, 255, 0.9), rgba(54, 70, 190, 0.8))'
      : 'rgba(17, 20, 32, 0.85)'};
  box-shadow: 0 16px 30px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);

  @media (prefers-color-scheme: light) {
    background: ${(props) =>
      props.$role === 'user'
        ? 'linear-gradient(135deg, rgba(66, 120, 255, 0.9), rgba(130, 170, 255, 0.9))'
        : 'rgba(255, 255, 255, 0.9)'};
    box-shadow: 0 16px 30px rgba(120, 130, 160, 0.18);
  }
`;

const MessageMeta = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  opacity: 0.7;
  margin-bottom: 8px;
`;

const MessageContent = styled.p`
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  white-space: pre-wrap;
`;

const TypingBubble = styled(MessageBubble)`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const TypingDots = styled.div`
  display: flex;
  gap: 4px;

  span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.6;
    animation: pulse 1.2s infinite ease-in-out;
  }

  span:nth-child(2) {
    animation-delay: 0.2s;
  }

  span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes pulse {
    0%, 100% {
      transform: translateY(0);
      opacity: 0.4;
    }
    50% {
      transform: translateY(-4px);
      opacity: 1;
    }
  }
`;

const Composer = styled.footer`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20px 24px;
  background: linear-gradient(180deg, rgba(8, 10, 18, 0) 0%, rgba(8, 10, 18, 0.9) 60%);

  @media (prefers-color-scheme: light) {
    background: linear-gradient(180deg, rgba(235, 238, 248, 0) 0%, rgba(235, 238, 248, 0.92) 60%);
  }
`;

const ComposerInner = styled.div`
  display: flex;
  gap: 12px;
  padding: 16px;
  border-radius: 24px;
  background: rgba(18, 22, 36, 0.8);
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.08);

  @media (prefers-color-scheme: light) {
    background: rgba(255, 255, 255, 0.8);
    box-shadow: 0 14px 28px rgba(120, 130, 160, 0.18);
  }
`;

const TextInput = styled.textarea`
  flex: 1;
  background: transparent;
  border: none;
  color: inherit;
  font-size: 15px;
  resize: none;
  outline: none;
  line-height: 1.5;

  &::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }

  @media (prefers-color-scheme: light) {
    &::placeholder {
      color: rgba(20, 30, 60, 0.5);
    }
  }
`;

const SendButton = styled.button`
  border: none;
  padding: 12px 20px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(82, 120, 255, 1), rgba(116, 155, 255, 1));
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 10px 18px rgba(56, 90, 210, 0.4);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 12px 22px rgba(56, 90, 210, 0.5);
  }
`;

export default App;
