const https = require('https');

module.exports = {
  name: '?troll',
  match: (msg) => msg.body.startsWith('?troll '),
  handle: async ({ msg, client, logger }) => {
    const match = msg.body.match(/^\?troll (\d+)$/);
    if (!match) {
      logger.warn('<?troll> RegEx KO');
      await client.reply(msg.from, 'Usage: ?troll <ID>', msg.id.toString());
      return;
    }

    const troll_id = parseInt(match[1], 10);
    logger.debug(`<?troll> [${troll_id}] RegExp OK`);

    const SCIZ_TOKEN = process.env.SCIZ_TOKEN;
    const options = {
      method: 'POST',
      hostname: 'www.sciz.fr',
      path: '/api/hook/trolls',
      headers: {
        'Authorization': SCIZ_TOKEN
      },
      maxRedirects: 20
    };

    const req = https.request(options, (res) => {
      let chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        try {
          const body = Buffer.concat(chunks);
          let json = JSON.parse(body);
          for (const troll of json.trolls) {
            if (troll.id === troll_id) {
              let trollHeader = `[${troll.id}] ${troll.nom}`;
              logger.debug(`<?troll> Tröll found: ${trollHeader}`);
              let trollData = `*${trollHeader}*\n` +
                `*PVs*: ${troll.pdv}/${troll.pdv_max}\n` +
                `*DLA*: ${troll.dla}\n` +
                `*POS*: X=${troll.pos_x} | Y=${troll.pos_y} | N=${troll.pos_n}`;
              logger.info("<?troll> DATA:\n" + trollData);
              client.reply(msg.from, trollData, msg.id.toString())
                .then(() => logger.debug('<?troll> Message sent'))
                .catch((erro) => logger.error('<?troll> Error when sending: ', erro));
              return;
            }
          }
          logger.warn(`<?troll> Tröll ID ${troll_id} not found`);
          client.reply(msg.from, `Tröll ID ${troll_id} not found`, msg.id.toString());
        } catch (error) {
          logger.error('<?troll> Parse error: ' + error.message);
        }
      });
      res.on('error', (error) => logger.error('<?troll> HTTP error: ' + error.message));
    });

    req.on('error', (error) => logger.error('<?troll> Request error: ' + error.message));
    req.end();
  }
};
