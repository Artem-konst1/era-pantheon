const TelegramBot = require('node-telegram-bot-api');
const { runCouncil, callAgent } = require('../orchestrator/council');
const { PANTHEON } = require('../agents/pantheon');
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

bot.onText(/\/start/, msg => {
  bot.sendMessage(msg.chat.id, `🐍 *ERA Пантеон* — твои личные боги\n\nПросто напиши задачу — Велес решит кого призвать.\n\n⚡ *Перун* — стратегия\n🪕 *Баян* — контент\n⚖ *Числобог* — аналитика\n🌿 *Лада* — партнёры\n\n/совет — полный пантеон\n/помощь — все команды`, { parse_mode: 'Markdown' });
});

bot.onText(/\/помощь/, msg => {
  bot.sendMessage(msg.chat.id, `*Команды ERA Пантеона:*\n/совет [задача]\n/перун [задача]\n/баян [задача]\n/числобог [задача]\n/лада [задача]`, { parse_mode: 'Markdown' });
});

bot.onText(/\/совет(.*)/, async (msg, match) => {
  const task = match[1].trim();
  if (!task) return bot.sendMessage(msg.chat.id, '🐍 Напиши: /совет твоя задача');
  await fullCouncil(msg.chat.id, task);
});

[['перун','perun'],['баян','bayan'],['числобог','chislobog'],['лада','lada']].forEach(([cmd, id]) => {
  bot.onText(new RegExp('\\/' + cmd + '(.*)'), async (msg, match) => {
    const task = match[1].trim();
    const a = PANTHEON[id];
    if (!task) return bot.sendMessage(msg.chat.id, a.emoji + ' Напиши: /' + cmd + ' задача');
    const m = await bot.sendMessage(msg.chat.id, a.emoji + ' *' + a.name + '* думает...', { parse_mode: 'Markdown' });
    try {
      const r = await callAgent(id, task);
      await bot.deleteMessage(msg.chat.id, m.message_id);
      bot.sendMessage(msg.chat.id, a.emoji + ' *' + a.name + '*\n\n' + r, { parse_mode: 'Markdown' });
    } catch(e) { bot.editMessageText('Ошибка: ' + e.message, { chat_id: msg.chat.id, message_id: m.message_id }); }
  });
});

bot.on('message', async msg => {
  if (!msg.text || msg.text.startsWith('/')) return;
  await fullCouncil(msg.chat.id, msg.text);
});

async function fullCouncil(chatId, task) {
  const s = await bot.sendMessage(chatId, '🐍 *Велес слушает...*', { parse_mode: 'Markdown' });
  try {
    const r = await runCouncil(task, a => {
      bot.editMessageText(a.emoji + ' ' + a.name + ' ответил...', { chat_id: chatId, message_id: s.message_id }).catch(()=>{});
    });
    await bot.deleteMessage(chatId, s.message_id).catch(()=>{});
    await bot.sendMessage(chatId, '🐍 *Велес — воля:*\n\n' + r.veles, { parse_mode: 'Markdown' });
    for (const { agent, result } of r.agents) {
      const t = result.length > 600 ? result.slice(0,600)+'...' : result;
      await bot.sendMessage(chatId, agent.emoji + ' *' + agent.name + '*\n\n' + t, { parse_mode: 'Markdown' });
    }
    await bot.sendMessage(chatId, '✅ *Итог:*\n\n' + r.synthesis, { parse_mode: 'Markdown' });
  } catch(e) { bot.editMessageText('Ошибка: ' + e.message, { chat_id: chatId, message_id: s.message_id }); }
}

console.log('🐍 ERA Пантеон запущен');
module.exports = bot;
