const https = require('https');

module.exports = {
  name: '?team',
  match: (msg) => msg.body === '?team',
  handle: async ({ msg, client, logger }) => {
    logger.debug('<?team> Command OK');

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
          let teamData = `*[TEAM] Informations*:\n`;
          for (const troll of json.trolls) {
            let pv = `${troll.pdv}/${troll.pdv_max || '...'}`.padStart(7, " ");
            teamData = teamData + '```' + `${troll.id}: ${pv}PV @(${troll.dla.slice(0, -3)})` + '```\n';
          }
          logger.info("<?team> DATA:\n" + teamData);
          client.reply(msg.from, teamData, msg.id.toString())
            .then(() => logger.debug('<?team> Message sent'))
            .catch((erro) => logger.error('<?team> Error when sending: ', erro));
        } catch (error) {
          logger.error('<?team> Parse error: ' + error.message);
        }
      });
      res.on('error', (error) => logger.error('<?team> HTTP error: ' + error.message));
    });

    req.on('error', (error) => logger.error('<?team> Request error: ' + error.message));
    req.end();
  }
};
