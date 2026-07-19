const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const OLLAMA_URL = 'http://localhost:11434';

const MODELOS_DISPONIBLES = [
  { id: 'qwen2.5:7b-instruct-q4_K_M', nombre: 'General (Qwen 7B)' },
  { id: 'qwen2.5-coder:7b-instruct-q4_K_M', nombre: 'Código (Qwen Coder 7B)' },
  { id: 'phi3:mini', nombre: 'Rápido (Phi-3 Mini)' }
];

const MODELO_DEFAULT = MODELOS_DISPONIBLES[0].id;

app.get('/api/models', (req, res) => {
  res.json({ models: MODELOS_DISPONIBLES, default: MODELO_DEFAULT });
});

app.post('/api/chat', async (req, res) => {
  const { messages, model } = req.body;
  const modeloElegido = MODELOS_DISPONIBLES.find(m => m.id === model)?.id || MODELO_DEFAULT;

  try {
    const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modeloElegido, messages, stream: true })
    });

    if (!ollamaRes.ok) {
      return res.status(502).json({ error: `Ollama respondió ${ollamaRes.status}. ¿Está corriendo?` });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of ollamaRes.body) {
      const lines = Buffer.from(chunk).toString().split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.message?.content) {
            res.write(`data: ${JSON.stringify({ token: json.message.content })}\n\n`);
          }
          if (json.done) res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        } catch (e) {}
      }
    }
    res.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(503).json({ error: 'No se pudo conectar con Ollama. Verificá que esté corriendo (ollama serve).' });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Se cortó la conexión con Ollama.' })}\n\n`);
      res.end();
    }
  }
});

app.listen(3001, '0.0.0.0', () => console.log('Backend en :3001'));