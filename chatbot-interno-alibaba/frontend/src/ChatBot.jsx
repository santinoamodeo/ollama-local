import { useState, useRef, useEffect } from 'react';
import './ChatBot.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

const STORAGE_KEY = 'chatbot-historial';

export default function ChatBot() {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modelName, setModelName] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    fetch('http://localhost:3001/api/model')
      .then(r => r.json())
      .then(d => setModelName(d.model))
      .catch(() => setModelName('desconocido'));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const limpiarHistorial = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    setError(null);
    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setMessages([...newMessages, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
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
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'assistant', content: fullText };
              return updated;
            });
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Error de conexión con el backend.');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-wrapper">
      <div className="chat-container">
        <div className="chat-header">
          <span className="chat-title">Chat interno</span>
          <span className="model-badge">{modelName || '...'}</span>
          <button onClick={limpiarHistorial} className="clear-btn">Limpiar</button>
        </div>

        <div className="chat-area">
          {messages.length === 0 && (
            <div className="empty-state">Escribí algo para empezar.</div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`msg-row ${m.role}`}>
             <div className={`bubble ${m.role}`}>
                {m.role === 'assistant' ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                    {m.content || (loading && i === messages.length - 1 ? '...' : '')}
                  </ReactMarkdown>
                ) : (
                  m.content
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
          <button onClick={sendMessage} disabled={loading} className="send-btn">
            {loading ? 'Pensando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
}