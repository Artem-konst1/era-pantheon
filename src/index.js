require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { runCouncil, callAgent } = require('./orchestrator/council');
const { PANTHEON } = require('./agents/pantheon');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/council', async (req, res) => {
  const { task } = req.body;
  if (!task) return res.status(400).json({ error: 'task required' });
  try {
    const result = await runCouncil(task);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/agent/:id', async (req, res) => {
  const { id } = req.params;
  const { task } = req.body;
  if (!PANTHEON[id]) return res.status(404).json({ error: 'Agent not found' });
  try {
    const result = await callAgent(id, task);
    res.json({ agent: PANTHEON[id], result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/agents', (req, res) => {
  const agents = Object.values(PANTHEON).map(({ id, name, emoji, domain, role }) =>
    ({ id, name, emoji, domain, role })
  );
  res.json(agents);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Web server: http://localhost:' + PORT));

if (process.env.TELEGRAM_BOT_TOKEN) {
  require('./telegram/bot');
  console.log('Telegram bot started');
} else {
  console.log('TELEGRAM_BOT_TOKEN not set');
}require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { runCouncil, callAgent } = require('./orchestrator/council');
const { PANTHEON } = require('./agents/pantheon');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/council', async (req, res) => {
  const { task } = req.body;
  if (!task) return res.status(400).json({ error: 'task required' });
  try {
    const result = await runCouncil(task);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/agent/:id', async (req, res) => {
  const { id } = req.params;
  const { task } = req.body;
  if (!PANTHEON[id]) return res.status(404).json({ error: 'Agent not found' });
  try {
    const result = await callAgent(id, task);
    res.json({ agent: PANTHEON[id], result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/agents', (req, res) => {
  const agents = Object.values(PANTHEON).map(({ id, name, emoji, domain, role }) =>
    ({ id, name, emoji, domain, role })
  );
  res.json(agents);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Web server: http://localhost:' + PORT));

if (process.env.TELEGRAM_BOT_TOKEN) {
  require('./telegram/bot');
  console.log('Telegram bot started');
} else {
  console.log('TELEGRAM_BOT_TOKEN not set — bot disabled');
}
