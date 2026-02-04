import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled, { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    font-family: 'Poppins', 'SF Pro Text', 'Inter', system-ui, -apple-system, sans-serif;
    background: radial-gradient(circle at top, rgba(80, 60, 130, 0.85), rgba(8, 6, 16, 1));
    background-attachment: fixed;
    color: #f5f7ff;
    min-height: 100vh;
  }

  #root {
    min-height: 100vh;
  }

  @media (prefers-color-scheme: light) {
    body {
      background: radial-gradient(circle at top, rgba(232, 226, 255, 0.9), rgba(240, 236, 250, 1));
      background-attachment: fixed;
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
  const [providerForm, setProviderForm] = useState({
    url: '',
    model: '',
    token: ''
  });
  const [providerStatus, setProviderStatus] = useState('');
  const [toast, setToast] = useState('');
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [isClearPending, setIsClearPending] = useState(false);
  const bottomRef = useRef(null);
  const hasLoadedHistory = useRef(false);
  const importInputRef = useRef(null);
  const clearTimeoutRef = useRef(null);

  const HISTORY_STORAGE_KEY = 'mygpt-history';

  const canSend = useMemo(() => input.trim().length > 0 && activeProvider, [input, activeProvider]);

  const loadProviders = async () => {
    const response = await fetch(`${API_BASE}/providers`);
    const data = await response.json();
    setProviders(data);
    if (data.length > 0) {
      setActiveProvider((current) => current || data[0].model);
    } else {
      setActiveProvider('');
    }
  };

  useEffect(() => {
    const loadHistory = () => {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!stored) {
        hasLoadedHistory.current = true;
        return;
      }
      try {
        const data = JSON.parse(stored);
        if (Array.isArray(data)) {
          setMessages(data);
        }
      } catch (error) {
        console.warn('Invalid history in local storage.', error);
      } finally {
        hasLoadedHistory.current = true;
      }
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

  const persistHistory = (nextHistory) => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
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
    persistHistory(nextHistory);

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
      persistHistory(updatedHistory);
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

  const handleProviderChange = (event) => {
    const { name, value } = event.target;
    setProviderForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProvider = async (event) => {
    event.preventDefault();
    setProviderStatus('');
    const payload = {
      model: providerForm.model.trim(),
      url: providerForm.url.trim(),
      token: providerForm.token.trim()
    };

    const response = await fetch(`${API_BASE}/providers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (data.status === 'ok') {
      setProviderForm({ url: '', model: '', token: '' });
      setProviderStatus('');
      setToast(`Model ${data.provider.model} saved.`);
      await loadProviders();
      setActiveProvider(data.provider.model);
      setIsProviderModalOpen(false);
      return;
    }
    setProviderStatus(data.message || 'Unable to save provider.');
  };

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timeout = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(timeout);
  }, [toast]);

  const handleExportHistory = () => {
    const payload = messages.map(({ role, content }) => ({ role, content }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'mygpt-history.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const normalizeImportedHistory = (data) => {
    if (!Array.isArray(data)) {
      throw new Error('Invalid format.');
    }
    return data.map((entry, index) => {
      if (typeof entry === 'string') {
        return {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          role: 'user',
          content: entry,
          provider: activeProvider || 'imported'
        };
      }
      const content = entry?.content ?? '';
      return {
        id: entry?.id || crypto.randomUUID(),
        timestamp: entry?.timestamp || new Date(Date.now() + index).toISOString(),
        role: entry?.role || 'user',
        content,
        provider: entry?.provider || activeProvider || 'imported'
      };
    });
  };

  const handleImportHistory = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const normalized = normalizeImportedHistory(data);
        setMessages(normalized);
        persistHistory(normalized);
        setToast('History imported successfully.');
      } catch (error) {
        setToast('Unable to import history.');
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleTriggerImport = () => {
    importInputRef.current?.click();
  };

  const handleClearConversation = () => {
    if (!isClearPending) {
      setIsClearPending(true);
      setToast('This will permanently delete your local conversation. Click again to confirm.');
      clearTimeoutRef.current = setTimeout(() => {
        setIsClearPending(false);
      }, 4000);
      return;
    }

    clearTimeoutRef.current && clearTimeout(clearTimeoutRef.current);
    setIsClearPending(false);
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    setMessages([]);
    setInput('');
    setIsTyping(false);
    setToast('Conversation cleared.');
  };

  const handleCopyMessage = async (text) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setToast('Message copied.');
    } catch (error) {
      setToast('Unable to copy message.');
    }
  };

  const renderInlineMarkdown = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <StrongText key={index}>{part.slice(2, -2)}</StrongText>;
      }
      if (part.startsWith('_') && part.endsWith('_')) {
        return <EmText key={index}>{part.slice(1, -1)}</EmText>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <InlineCode key={index}>{part.slice(1, -1)}</InlineCode>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  const renderTextSegment = (segment) => {
    const lines = segment.split('\n');
    return lines.map((line, lineIndex) => {
      const headingMatch = line.match(/^(#{1,4})\s+(.+)/);
      const content = headingMatch ? headingMatch[2] : line;
      const rendered = renderInlineMarkdown(content);
      return (
        <React.Fragment key={lineIndex}>
          {headingMatch ? <StrongText>{rendered}</StrongText> : rendered}
          {lineIndex < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  const renderMessageContent = (text) => {
    const segments = text.split(/(```[\s\S]*?```)/g);
    return segments.map((segment, index) => {
      if (segment.startsWith('```') && segment.endsWith('```')) {
        const code = segment.replace(/^```/, '').replace(/```$/, '').replace(/^\n/, '');
        return (
          <CodeBlock key={index}>
            <code>{code}</code>
          </CodeBlock>
        );
      }
      return <span key={index}>{renderTextSegment(segment)}</span>;
    });
  };

  return (
    <Shell>
      <GlobalStyle />
      <Header>
        <TitleArea>
          <Title>MyGPT</Title>
          <Subtitle>Continuous history with multiple AIs</Subtitle>
        </TitleArea>
        <HeaderControls>
          <ProviderSelect
            value={activeProvider}
            onChange={(event) => setActiveProvider(event.target.value)}
            disabled={providers.length === 0}
          >
            {providers.length === 0 ? (
              <option>No valid providers</option>
            ) : (
              providers.map((provider) => (
                <option key={provider.model} value={provider.model}>
                  {provider.model}
                </option>
              ))
            )}
          </ProviderSelect>
          <SecondaryButton type="button" onClick={() => setIsProviderModalOpen(true)}>
            Add provider
          </SecondaryButton>
          <DestructiveButton
            type="button"
            onClick={handleClearConversation}
            disabled={messages.length === 0}
          >
            Clear conversation
          </DestructiveButton>
        </HeaderControls>
      </Header>

      <HistoryPanel>
        <HistoryInfo>
          <span>History is saved locally.</span>
          <small>Import or export JSON anytime.</small>
        </HistoryInfo>
        <HistoryActions>
          <SecondaryButton type="button" onClick={handleTriggerImport}>
            Import JSON
          </SecondaryButton>
          <SecondaryButton type="button" onClick={handleExportHistory} disabled={messages.length === 0}>
            Export JSON
          </SecondaryButton>
          <HiddenInput
            ref={importInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportHistory}
          />
        </HistoryActions>
      </HistoryPanel>

      {isProviderModalOpen && (
        <ModalOverlay>
          <ModalCard>
            <ModalHeader>
              <ProviderTitle>Add provider</ProviderTitle>
              <IconButton type="button" onClick={() => setIsProviderModalOpen(false)}>
                ✕
              </IconButton>
            </ModalHeader>
            <ProviderForm onSubmit={handleSaveProvider}>
              <FieldGroup>
                <FieldLabel htmlFor="provider-url">API URL</FieldLabel>
                <FieldInput
                  id="provider-url"
                  name="url"
                  type="url"
                  placeholder="https://integrate.api.nvidia.com/v1/chat/completions"
                  value={providerForm.url}
                  onChange={handleProviderChange}
                  required
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel htmlFor="provider-model">Model</FieldLabel>
                <FieldInput
                  id="provider-model"
                  name="model"
                  type="text"
                  placeholder="moonshotai/kimi-k2.5"
                  value={providerForm.model}
                  onChange={handleProviderChange}
                  required
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel htmlFor="provider-token">Token</FieldLabel>
                <FieldInput
                  id="provider-token"
                  name="token"
                  type="password"
                  placeholder="sk-..."
                  value={providerForm.token}
                  onChange={handleProviderChange}
                  required
                />
              </FieldGroup>
              <ProviderActions>
                <PrimaryButton type="submit">Save provider</PrimaryButton>
                {providerStatus && <StatusText>{providerStatus}</StatusText>}
              </ProviderActions>
            </ProviderForm>
          </ModalCard>
        </ModalOverlay>
      )}

      <ChatArea>
        {messages.map((message) => (
          <MessageRow key={message.id} $role={message.role}>
            <MessageBubble $role={message.role}>
              <MessageMeta>
                <span>{message.role === 'user' ? 'You' : message.provider}</span>
                <span>{new Date(message.timestamp).toLocaleTimeString('en-US')}</span>
              </MessageMeta>
              <MessageContent>{renderMessageContent(message.content)}</MessageContent>
            </MessageBubble>
            <MessageActions $role={message.role}>
              <CopyButton
                type="button"
                onClick={() => handleCopyMessage(message.content)}
                aria-label="Copy message"
              >
                📋
              </CopyButton>
            </MessageActions>
          </MessageRow>
        ))}
        {isTyping && (
          <MessageRow $role="assistant">
            <TypingBubble>
              <span>{activeProvider || 'AI'} is thinking ...</span>
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
            placeholder="Type your message..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <SendButton onClick={handleSend} disabled={!canSend}>
            Send
          </SendButton>
        </ComposerInner>
      </Composer>
      {toast && <Toast>{toast}</Toast>}
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
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 24px;
  border-radius: 24px;
  background: rgba(34, 24, 56, 0.6);
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

const HeaderControls = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

const ProviderTitle = styled.h2`
  margin: 0 0 12px;
  font-size: 16px;
`;

const ProviderForm = styled.form`
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FieldLabel = styled.label`
  font-size: 12px;
  opacity: 0.7;
`;

const FieldInput = styled.input`
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(12, 15, 26, 0.8);
  color: inherit;
  font-size: 14px;

  &:focus {
    outline: 2px solid rgba(113, 89, 193, 0.7);
    outline-offset: 2px;
  }

  @media (prefers-color-scheme: light) {
    background: rgba(255, 255, 255, 0.9);
    border-color: rgba(20, 30, 60, 0.2);
  }
`;

const ProviderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
  grid-column: 1 / -1;
`;

const PrimaryButton = styled.button`
  border: none;
  padding: 12px 20px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(113, 89, 193, 1), rgba(142, 114, 220, 1));
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 10px 18px rgba(84, 64, 160, 0.4);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 22px rgba(84, 64, 160, 0.5);
  }
`;

const SecondaryButton = styled.button`
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 10px 16px;
  border-radius: 16px;
  background: rgba(18, 22, 36, 0.6);
  color: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 12px 22px rgba(113, 89, 193, 0.3);
    border-color: rgba(113, 89, 193, 0.6);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (prefers-color-scheme: light) {
    background: rgba(255, 255, 255, 0.8);
    border-color: rgba(20, 30, 60, 0.2);
  }
`;

const DestructiveButton = styled(SecondaryButton)`
  border-color: rgba(255, 122, 122, 0.45);
  color: rgba(255, 214, 214, 0.95);

  &:hover:not(:disabled) {
    box-shadow: 0 12px 22px rgba(255, 90, 90, 0.25);
    border-color: rgba(255, 122, 122, 0.8);
  }

  @media (prefers-color-scheme: light) {
    color: rgba(140, 0, 0, 0.9);
    border-color: rgba(180, 40, 40, 0.4);
  }
`;

const StatusText = styled.span`
  font-size: 13px;
  opacity: 0.75;
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
  flex-direction: column;
  align-items: ${(props) => (props.$role === 'user' ? 'flex-end' : 'flex-start')};
  gap: 6px;
`;

const MessageBubble = styled.div`
  max-width: min(720px, 100%);
  padding: 16px 18px;
  border-radius: 22px;
  background: ${(props) =>
    props.$role === 'user'
      ? 'linear-gradient(135deg, rgba(113, 89, 193, 0.95), rgba(95, 70, 168, 0.9))'
      : 'rgba(34, 24, 56, 0.6)'};
  box-shadow: 0 16px 30px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);

  @media (prefers-color-scheme: light) {
    background: ${(props) =>
      props.$role === 'user'
        ? 'linear-gradient(135deg, rgba(113, 89, 193, 0.9), rgba(160, 140, 235, 0.9))'
        : 'rgba(255, 255, 255, 0.7)'};
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

const MessageContent = styled.div`
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  white-space: pre-wrap;

  strong {
    color: #fff;
    font-weight: 700;
    background: rgba(113, 89, 193, 0.25);
    padding: 0 4px;
    border-radius: 6px;
  }
`;

const MessageActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 6px;
`;

const CopyButton = styled.button`
  border: none;
  background: rgba(20, 18, 36, 0.6);
  color: inherit;
  border-radius: 12px;
  padding: 6px 10px;
  font-size: 14px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.25);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
  }

  @media (prefers-color-scheme: light) {
    background: rgba(255, 255, 255, 0.85);
    box-shadow: 0 6px 12px rgba(120, 130, 160, 0.2);
  }
`;

const InlineCode = styled.code`
  font-family: 'JetBrains Mono', 'SFMono-Regular', ui-monospace, SFMono-Regular, Menlo, monospace;
  background: rgba(113, 89, 193, 0.25);
  color: #fdf6ff;
  padding: 2px 6px;
  border-radius: 6px;
`;

const CodeBlock = styled.pre`
  margin: 12px 0;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(12, 12, 20, 0.9);
  color: #f7f1ff;
  overflow-x: auto;
  border: 1px solid rgba(113, 89, 193, 0.35);
  font-family: 'JetBrains Mono', 'SFMono-Regular', ui-monospace, SFMono-Regular, Menlo, monospace;
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
  background: linear-gradient(180deg, rgba(8, 10, 18, 0) 0%, rgba(8, 6, 16, 0.9) 60%);

  @media (prefers-color-scheme: light) {
    background: linear-gradient(180deg, rgba(235, 238, 248, 0) 0%, rgba(240, 236, 250, 0.92) 60%);
  }
`;

const ComposerInner = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 24px;
  background: rgba(34, 24, 56, 0.6);
  box-shadow: 0 16px 30px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(26px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.25);

  @media (prefers-color-scheme: light) {
    background: rgba(255, 255, 255, 0.7);
    box-shadow: 0 16px 30px rgba(120, 130, 160, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.6);
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
  text-align: center;

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
  background: linear-gradient(135deg, rgba(113, 89, 193, 1), rgba(142, 114, 220, 1));
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 10px 18px rgba(84, 64, 160, 0.4);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 12px 22px rgba(84, 64, 160, 0.5);
  }
`;

const HistoryPanel = styled.section`
  margin-top: 24px;
  padding: 16px 20px;
  border-radius: 18px;
  background: rgba(18, 20, 36, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;

  @media (prefers-color-scheme: light) {
    background: rgba(255, 255, 255, 0.85);
  }
`;

const HistoryInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  small {
    opacity: 0.7;
  }
`;

const HistoryActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const HiddenInput = styled.input`
  display: none;
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(8, 8, 16, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 20;
`;

const ModalCard = styled.section`
  width: min(720px, 100%);
  padding: 20px 24px;
  border-radius: 20px;
  background: rgba(16, 20, 34, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(18px);
  font-family: 'Poppins', 'SF Pro Text', 'Inter', system-ui, -apple-system, sans-serif;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const IconButton = styled.button`
  border: none;
  background: transparent;
  color: inherit;
  font-size: 18px;
  cursor: pointer;
`;

const Toast = styled.div`
  position: fixed;
  right: 24px;
  bottom: 110px;
  padding: 12px 18px;
  border-radius: 16px;
  background: rgba(113, 89, 193, 0.95);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 12px 24px rgba(84, 64, 160, 0.4);
  z-index: 30;
`;

const StrongText = styled.strong``;

const EmText = styled.em`
  font-style: italic;
`;

export default App;
