const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const OLLAMA_URL = 'http://localhost:11434';
const MODEL = 'qwen2.5:7b-instruct-q4_K_M';

// Nombre del modelo para mostrar en el frontend
app.get('/api/model', (req, res) => {
  res.json({ model: MODEL });
});

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  try {
    const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, messages, stream: true })
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
    // Ollama caído o inaccesible (ECONNREFUSED, etc.)
    if (!res.headersSent) {
      res.status(503).json({ error: 'No se pudo conectar con Ollama. Verificá que esté corriendo (ollama serve).' });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Se cortó la conexión con Ollama.' })}\n\n`);
      res.end();
    }
  }
});

app.listen(3001, '0.0.0.0', () => console.log(`Backend en :3001, modelo: ${MODEL}`));