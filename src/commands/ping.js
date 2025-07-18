module.exports = {
  name: '!!ping',
  match: (msg) => msg.body === '!!ping',
  handle: async ({ msg, client, logger }) => {
    await client.sendText(msg.from, 'pong');
    logger.info('[ping] Pong reply sent');
  }
};
