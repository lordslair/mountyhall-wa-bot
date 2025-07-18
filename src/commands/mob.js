const https = require('https');
const querystring = require('querystring');

module.exports = {
  name: '?mob',
  match: (msg) => msg.body.startsWith('?mob '),
  
  handle: async ({ msg, client, logger }) => {
    const match = msg.body.match(/^\?mob (\d+)$/);
    if (!match) {
      logger.warn('[?mob] Invalid format');
      return client.reply(msg.from, 'Usage: ?mob <ID>', msg.id.toString());
    }

    const mob_id = parseInt(match[1], 10);
    logger.debug(`[?mob] Request for monster ID ${mob_id}`);

    // Step 1: Get monster name and age from MH page
    const optionsMH = {
      method: 'GET',
      hostname: 'games.mountyhall.com',
      path: `/mountyhall/View/MonsterView.php?ai_IDPJ=${mob_id}`,
      maxRedirects: 20
    };

    const mhReq = https.request(optionsMH, (res) => {
      res.setEncoding('binary');
      let data = '';

      res.on('data', (chunk) => { data += chunk; });

      res.on('end', () => {
        let mob_name, mob_age;
        const lines = data.split("\n");

        for (const line of lines) {
          if (line.includes(mob_id) && line.includes('h2')) {
            const nameMatch = line.match(/<h2>un[e]? ([-'A-Za-zÀ-ÿ\s]*) \[([A-Za-zÀ-ÿ]*)\]/);
            if (nameMatch) {
              mob_name = nameMatch[1];
              mob_age = nameMatch[2];
              logger.debug(`[?mob] Found name: ${mob_name}, age: ${mob_age}`);
              break;
            }
          }
        }

        if (!mob_name || !mob_age) {
          const warnMsg = `[?mob] Unable to find monster name and age for ID ${mob_id}`;
          logger.warn(warnMsg);
          return client.reply(msg.from, warnMsg, msg.id.toString());
        }

        // Step 2: Query MZ API for detailed characteristics
        const optionsMZ = {
          method: 'POST',
          hostname: 'mz.mh.raistlin.fr',
          path: '/mz/getCaracMonstre.php',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          maxRedirects: 20
        };

        const mzReq = https.request(optionsMZ, (mzRes) => {
          let chunks = [];

          mzRes.on('data', chunk => chunks.push(chunk));
          mzRes.on('end', () => {
            try {
              const body = Buffer.concat(chunks);
              const json = JSON.parse(body);
              const mob = json[0];

              // Prepare response
              const lvl = mob.niv.min === mob.niv.max ? mob.niv.min : `${mob.niv.min}-${mob.niv.max}`;

              let pv = mob.pv?.min;
              let pvMax = mob.pv?.max;
              let pvMin2 = mob.pv?.min2;
              let pvMax2 = mob.pv?.max2;

              let pvData = pvMin2 ? `${pvMin2}-${pvMax2}` :
                           (pvMax ? `${pv}-${pvMax}` : `${pv}+`);

              if (mob.bless && mob.timegmt) {
                const dt = new Date((mob.timegmt + 3600) * 1000);
                const dateStr = `${("0" + dt.getDate()).slice(-2)}/${("0" + (dt.getMonth() + 1)).slice(-2)}`;
                const timeStr = `${dt.getHours()}:${dt.getMinutes()}`;
                pvData += ` (${mob.bless}% @${dateStr} ${timeStr}) [#${mob.nCdM}]`;
              }

              let armData;
              if (mob.armP && mob.armM) {
              // Use per-type armor if both present
              const armP = `${mob.armP.min2 || mob.armP.min || 1}-${mob.armP.max2 || mob.armP.max}`;
              const armM = `${mob.armM.min2 || mob.armM.min || 1}-${mob.armM.max2 || mob.armM.max}`;
              armData = `(P): ${armP} | (M): ${armM}`;
              } else if (mob.arm) {
              // Fallback to generic armor
              if (mob.arm.max) {
                  armData = `(G): ${mob.arm.min || 1}-${mob.arm.max}`;
              } else {
                  armData = `(G): ${mob.arm.min || 1}+`;
              }
              } else {
              armData = 'No armor data';
              }

              const esqData = `${mob.esq.min2 || mob.esq.min || 1}-${mob.esq.max2 || mob.esq.max}D6`;
              const nbr = (mob.Mode === 'stat') ? mob.nCdM : null;
              //const header = `[${mob_id}] ${mob_name} [${mob_age}] (${lvl})` + (nbr ? ` {${nbr}}` : '');
              const header = `${mob_name} (${lvl})` + (nbr ? ` {${nbr}}` : '');

              const text = `*${header}*\n` +
                           `*PVs*: ${pvData}\n` +
                           `*ARM*: ${armData}\n` +
                           `*ESQ*: ${esqData}`;

              logger.info(`[?mob] Reply data:\n${text}`);

              client.reply(msg.from, text, msg.id.toString())
                .then(() => logger.debug('[?mob] Message sent'))
                .catch(err => logger.error('[?mob] Send error:', err));
            } catch (e) {
              logger.error(`[?mob] JSON parsing error: ${e.message}`);
            }
          });
        });

        // POST payload
        const postData = querystring.stringify({
          l: `[{"index":1,"id":${mob_id},"nom":"${mob_name} [${mob_age}]"}]`
        });

        mzReq.write(postData);
        mzReq.end();
      });
    });

    mhReq.on('error', err => {
      logger.error(`[?mob] HTTP error: ${err.message}`);
      client.reply(msg.from, 'Error contacting mob database.', msg.id.toString());
    });

    mhReq.end();
  }
};
