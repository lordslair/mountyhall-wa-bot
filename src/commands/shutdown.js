module.exports = {
  name: '!!shutdown',
  match: (msg) => msg.body === '!!shutdown',
  handle: async ({ msg, client, logger }) => {
    logger.debug('<!!shutdown> Command OK');
    try {
      await client.reply(msg.from, 'Ok, understood. Shutting down...', msg.id.toString());
      logger.debug('<!!shutdown> Message sent, shutting down.');
      await client.close();
    } catch (err) {
      logger.error(`<!!shutdown> Error: ${err.message}`);
    }
  }
};
