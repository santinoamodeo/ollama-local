import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import './ChatBot.css';

const CONVERSATIONS_KEY = 'chatbot-conversaciones';
const ACTIVE_ID_KEY = 'chatbot-active-id';

function extractText(node) {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return node.toString();
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node?.props?.children) return extractText(node.props.children);
  return '';
}

function CodeBlock({ children }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(extractText(children));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="code-block-wrapper">
      <button className="copy-code-btn" onClick={handleCopy}>
        {copied ? '✓ Copiado' : 'Copiar'}
      </button>
      <pre>{children}</pre>
    </div>
  );
}

function crearConversacionVacia(modeloDefault) {
  return {
    id: Date.now().toString(),
    title: 'Nueva conversación',
    messages: [],
    model: modeloDefault,
    createdAt: Date.now()
  };
}

export default function ChatBot({ token, onLogout }) {
  const [models, setModels] = useState([]);
  const [defaultModel, setDefaultModel] = useState('');

  const [conversations, setConversations] = useState(() => {
    const saved = localStorage.getItem(CONVERSATIONS_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [activeId, setActiveId] = useState(() => {
    return localStorage.getItem(ACTIVE_ID_KEY) || null;
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    fetch('http://localhost:3001/api/models', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => {
        if (!r.ok) throw new Error('sesión inválida');
        return r.json();
      })
      .then(d => {
        setModels(d.models);
        setDefaultModel(d.default);
        setConversations(prev => {
          if (prev.length > 0) return prev;
          return [crearConversacionVacia(d.default)];
        });
      })
      .catch(() => {
        setError('No se pudo conectar con el backend o la sesión expiró.');
      });
  }, [token]);

  useEffect(() => {
    if (conversations.length > 0 && (!activeId || !conversations.find(c => c.id === activeId))) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
    }
  }, [conversations]);

  useEffect(() => {
    if (activeId) localStorage.setItem(ACTIVE_ID_KEY, activeId);
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeId, conversations]);

  const activeConversation = conversations.find(c => c.id === activeId);
  const messages = activeConversation?.messages || [];
  const currentModel = activeConversation?.model || defaultModel;

  const updateActiveMessages = (updater) => {
    setConversations(prev => prev.map(c => {
      if (c.id !== activeId) return c;
      const newMessages = typeof updater === 'function' ? updater(c.messages) : updater;
      return { ...c, messages: newMessages };
    }));
  };

  const cambiarModelo = (nuevoModelo) => {
    setConversations(prev => prev.map(c =>
      c.id === activeId ? { ...c, model: nuevoModelo } : c
    ));
  };

  const nuevaConversacion = () => {
    const nueva = crearConversacionVacia(defaultModel);
    setConversations(prev => [nueva, ...prev]);
    setActiveId(nueva.id);
  };

  const eliminarConversacion = (id, e) => {
    e.stopPropagation();
    setConversations(prev => {
      const restantes = prev.filter(c => c.id !== id);
      return restantes.length > 0 ? restantes : [crearConversacionVacia(defaultModel)];
    });
  };

  const stopGeneration = () => {
    abortControllerRef.current?.abort();
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    setError(null);
    const userMsg = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    setInput('');
    setLoading(true);
    updateActiveMessages([...newMessages, { role: 'assistant', content: '' }]);

    if (messages.length === 0) {
      const titulo = input.trim().slice(0, 40) + (input.length > 40 ? '...' : '');
      setConversations(prev => prev.map(c => c.id === activeId ? { ...c, title: titulo } : c));
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ messages: newMessages, model: currentModel }),
        signal: controller.signal
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error del servidor (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const data = JSON.parse(line.replace('data: ', ''));
          if (data.error) throw new Error(data.error);
          if (data.token) {
            fullText += data.token;
            updateActiveMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'assistant', content: fullText };
              return updated;
            });
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Error de conexión con el backend.');
        updateActiveMessages(prev => prev.slice(0, -1));
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="chat-wrapper">
      <div className="sidebar">
        <button className="new-chat-btn" onClick={nuevaConversacion}>+ Nuevo chat</button>
        <div className="conversation-list">
          {conversations.map(c => (
            <div
              key={c.id}
              className={`conversation-item ${c.id === activeId ? 'active' : ''}`}
              onClick={() => setActiveId(c.id)}
            >
              <span className="conversation-title">{c.title}</span>
              <button
                className="delete-conversation-btn"
                onClick={(e) => eliminarConversacion(c.id, e)}
                title="Eliminar conversación"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="chat-container">
        <div className="chat-header">
          <span className="chat-title">Chat interno</span>
          <select
            className="model-select"
            value={currentModel}
            onChange={e => cambiarModelo(e.target.value)}
            disabled={loading}
          >
            {models.map(m => (
              <option key={m.id} value={m.id}>{m.nombre}</option>
            ))}
          </select>
          <button className="logout-btn" onClick={onLogout}>Salir</button>
        </div>

        <div className="chat-area">
          {messages.length === 0 && (
            <div className="empty-state">Escribí algo para empezar.</div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`msg-row ${m.role}`}>
              <div className={`bubble ${m.role}`}>
                {m.role === 'assistant' ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    components={{ pre: CodeBlock }}
                  >
                    {m.content || (loading && i === messages.length - 1 ? '...' : '')}
                  </ReactMarkdown>
                ) : (
                  m.content
                )}
                {m.role === 'assistant' && m.content && (
                  <button
                    className="copy-response-btn"
                    onClick={() => navigator.clipboard.writeText(m.content)}
                  >
                    Copiar respuesta
                  </button>
                )}
              </div>
            </div>
          ))}
          {error && <div className="error-box">⚠ {error}</div>}
          <div ref={bottomRef} />
        </div>

        <div className="input-row">
          <input
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Escribí tu consulta..."
            disabled={loading}
          />
          {loading ? (
            <button onClick={stopGeneration} className="stop-btn">⏹ Detener</button>
          ) : (
            <button onClick={sendMessage} className="send-btn">Enviar</button>
          )}
        </div>
      </div>
    </div>
  );
}