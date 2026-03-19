const Anthropic = require('@anthropic-ai/sdk');
const { PANTHEON } = require('../agents/pantheon');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-20250514';

// Humanizer — пропускает каждый текст перед отправкой Артёму
// Цель: максимум 7% AI-детектора, звучит как живой человек

async function humanize(text, context) {
  const r = await client.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: `Ты редактор ERA. Перепиши текст так, чтобы AI-детектор показал не более 7%.
Правила:
1. Убери шаблонные фразы: "важно отметить", "стоит подчеркнуть", "безусловно", "таким образом", "в целом"
2. Чередуй короткие и длинные предложения — люди так думают
3. Убери буллеты и тире-списки, перепиши в живую речь
4. Каждый абзац другой по ритму
5. Запрещены слова: "оптимальный", "эффективный", "реализовать", "осуществить"
6. Скрипт — живой диалог с паузами, пост — мысль живого человека
Верни только переписанный текст, без комментариев.`,
    messages: [{ role: 'user', content: 'Контекст: ' + context + '\n\nТекст:\n' + text }],
  });
  return r.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
}

async function callAgent(agentId, userMessage, orchContext) {
  const agent = PANTHEON[agentId];
  if (!agent) throw new Error('Agent ' + agentId + ' not found');
  const content = orchContext
    ? 'Задача Артёма: ' + userMessage + '\n\nВоля Велеса:\n' + orchContext
    : 'Задача Артёма: ' + userMessage;
  const r = await client.messages.create({
    model: MODEL, max_tokens: 1000,
    system: agent.systemPrompt,
    messages: [{ role: 'user', content }],
  });
  const raw = r.content.filter(b => b.type === 'text').map(b => b.text).join('');
  if (agent.isOrchestrator) return raw;
  return await humanize(raw, agent.name + ' / ' + agent.role + ' / задача: ' + userMessage);
}

async function orchestrate(task) {
  const velesResult = await callAgent('veles', task);
  const line = (velesResult.match(/ПРИЗЫВАЮ:\s*(.+)/i) || [])[1] || '';
  const agents = Object.values(PANTHEON)
    .filter(a => !a.isOrchestrator)
    .filter(a => line.toLowerCase().includes(a.name.toLowerCase()));
  const activeAgents = agents.length > 0 ? agents : Object.values(PANTHEON).filter(a => !a.isOrchestrator);
  return { velesResult, activeAgents };
}

async function runCouncil(task, onAgentDone) {
  const { velesResult, activeAgents } = await orchestrate(task);
  const agentResults = await Promise.all(
    activeAgents.map(async agent => {
      const result = await callAgent(agent.id, task, velesResult);
      if (onAgentDone) onAgentDone(agent, result);
      return { agent, result };
    })
  );
  const answersText = agentResults.map(({ agent, result }) => '[' + agent.name + ']:\n' + result).join('\n\n');
  const synthRaw = await client.messages.create({
    model: MODEL, max_tokens: 1200,
    system: 'Ты Велес. Собери слова богов для Артёма.\n— Суть (1-2 предложения)\n— Сделай прямо сейчас (3 шага)\n— Лучшее от богов (скрипты, цифры)',
    messages: [{ role: 'user', content: 'Задача: ' + task + '\n\nСлова богов:\n' + answersText }],
  });
  const synthText = synthRaw.content.filter(b => b.type === 'text').map(b => b.text).join('');
  const synthesis = await humanize(synthText, 'Итоговый совет для Артёма: ' + task);
  return { veles: velesResult, agents: agentResults, synthesis };
}

module.exports = { runCouncil, callAgent, orchestrate, humanize };const Anthropic = require('@anthropic-ai/sdk');
const { PANTHEON } = require('../agents/pantheon');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-20250514';

// ─── HUMANIZER ───────────────────────────────────────────────────────────────
// Пропускает каждый текст через фильтр "очеловечивания" перед отправкой Артёму.
// Цель: максимум 7% AI-детектора. Текст должен звучать как живой человек.

async function humanize(text, context) {
  const r = await client.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: `Ты — редактор текстов для команды ERA (NL International).
Твоя задача: переписать текст так, чтобы AI-детектор показал не более 7%.

ПРАВИЛА ОЧЕЛОВЕЧИВАНИЯ:
1. Убери все шаблонные фразы ("важно отметить", "стоит подчеркнуть", "безусловно", "несомненно", "в целом", "таким образом")
2. Замени ровные длинные предложения — чередуй короткие и длинные. Люди так думают.
3. Добавь живые детали: конкретику, паузы в мышлении, неожиданные переходы
4. Убери все перечисления с тире/буллетами — перепиши их в живую речь
5. Каждый абзац должен звучать иначе по ритму
6. Не используй слова: "оптимальный", "эффективный", "качественный", "реализовать", "осуществить"
7. Если это скрипт звонка — он должен звучать как живой разговор, с паузами и вопросами
8. Если это пост — он должен читаться как мысль живого человека, а не статья

Верни ТОЛЬКО переписанный текст. Без комментариев, без пояснений.`,
    messages: [{ role: 'user', content: 'Контекст: ' + context + '\n\nТекст для очеловечивания:\n' + text }],
  });
  return r.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
}

// ─── ВЫЗОВ АГЕНТА ─────────────────────────────────────────────────────────────

async function callAgent(agentId, userMessage, orchContext) {
  const agent = PANTHEON[agentId];
  if (!agent) throw new Error('Agent ' + agentId + ' not found');
  const content = orchContext
    ? 'Задача Артёма: ' + userMessage + '\n\nВоля Велеса:\n' + orchContext
    : 'Задача Артёма: ' + userMessage;
  const r = await client.messages.create({
    model: MODEL, max_tokens: 1000,
    system: agent.systemPrompt,
    messages: [{ role: 'user', content }],
  });
  const raw = r.content.filter(b => b.type === 'text').map(b => b.text).join('');

  // Пропускаем через humanizer — кроме Велеса-оркестратора
  if (agent.isOrchestrator) return raw;
  return await humanize(raw, 'Агент: ' + agent.name + ' (' + agent.role + '). Задача Артёма: ' + userMessage);
}

// ─── ОРКЕСТРАТОР ──────────────────────────────────────────────────────────────

async function orchestrate(task) {
  const velesResult = await callAgent('veles', task);
  const line = (velesResult.match(/ПРИЗЫВАЮ:\s*(.+)/i) || [])[1] || '';
  const agents = Object.values(PANTHEON)
    .filter(a => !a.isOrchestrator)
    .filter(a => line.toLowerCase().includes(a.name.toLowerCase()));
  const activeAgents = agents.length > 0 ? agents : Object.values(PANTHEON).filter(a => !a.isOrchestrator);
  return { velesResult, activeAgents };
}

// ─── ПОЛНЫЙ СОВЕТ ─────────────────────────────────────────────────────────────

async function runCouncil(task, onAgentDone) {
  const { velesResult, activeAgents } = await orchestrate(task);

  const agentResults = await Promise.all(
    activeAgents.map(async agent => {
      const result = await callAgent(agent.id, task, velesResult);
      if (onAgentDone) onAgentDone(agent, result);
      return { agent, result };
    })
  );

  const answersText = agentResults
    .map(({ agent, result }) => '[' + agent.name + ']:\n' + result)
    .join('\n\n');

  // Синтез Велеса — тоже очеловечиваем
  const synthRaw = await client.messages.create({
    model: MODEL, max_tokens: 1200,
    system: 'Ты Велес. Собери слова богов в единое решение для Артёма.\n— Суть (1-2 предложения)\n— Сделай прямо сейчас (3 конкретных шага)\n— Лучшее от богов (скрипты, тексты, цифры)\nКоротко и точно.',
    messages: [{ role: 'user', content: 'Задача: ' + task + '\n\nСлова богов:\n' + answersText }],
  });
  const synthText = synthRaw.content.filter(b => b.type === 'text').map(b => b.text).join('');
  const synthesis = await humanize(synthText, 'Итоговый совет для Артёма по задаче: ' + task);

  return { veles: velesResult, agents: agentResults, synthesis };
}

module.exports = { runCouncil, callAgent, orchestrate, humanize };const Anthropic = require('@anthropic-ai/sdk');
const { PANTHEON } = require('../agents/pantheon');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-20250514';

async function callAgent(agentId, userMessage, orchContext) {
  const agent = PANTHEON[agentId];
  if (!agent) throw new Error('Agent ' + agentId + ' not found');
  const content = orchContext
    ? 'Задача Артёма: ' + userMessage + '\n\nВоля Велеса:\n' + orchContext
    : 'Задача Артёма: ' + userMessage;
  const r = await client.messages.create({
    model: MODEL, max_tokens: 1000,
    system: agent.systemPrompt,
    messages: [{ role: 'user', content }],
  });
  return r.content.filter(b => b.type === 'text').map(b => b.text).join('');
}

async function orchestrate(task) {
  const velesResult = await callAgent('veles', task);
  const line = (velesResult.match(/ПРИЗЫВАЮ:\s*(.+)/i) || [])[1] || '';
  const agents = Object.values(PANTHEON)
    .filter(a => !a.isOrchestrator)
    .filter(a => line.toLowerCase().includes(a.name.toLowerCase()));
  const activeAgents = agents.length > 0 ? agents : Object.values(PANTHEON).filter(a => !a.isOrchestrator);
  return { velesResult, activeAgents };
}

async function runCouncil(task, onAgentDone) {
  const { velesResult, activeAgents } = await orchestrate(task);
  const agentResults = await Promise.all(
    activeAgents.map(async agent => {
      const result = await callAgent(agent.id, task, velesResult);
      if (onAgentDone) onAgentDone(agent, result);
      return { agent, result };
    })
  );
  const answersText = agentResults.map(({ agent, result }) => '[' + agent.name + ']:\n' + result).join('\n\n');
  const synthesis = await client.messages.create({
    model: MODEL, max_tokens: 1200,
    system: 'Ты Велес. Собери слова богов для Артёма.\n— Суть (1-2 предложения)\n— Сделай прямо сейчас (3 шага)\n— Лучшее от богов (скрипты, цифры)',
    messages: [{ role: 'user', content: 'Задача: ' + task + '\n\nСлова богов:\n' + answersText }],
  });
  return { veles: velesResult, agents: agentResults, synthesis: synthesis.content.filter(b => b.type === 'text').map(b => b.text).join('') };
}

module.exports = { runCouncil, callAgent, orchestrate };
