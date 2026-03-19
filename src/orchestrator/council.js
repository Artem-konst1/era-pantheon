const Anthropic = require('@anthropic-ai/sdk');
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
