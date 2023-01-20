const venom = require('venom-bot');
const https = require('https');
const logger = require('node-color-log');

logger.setLevel("debug"); // it can be any log level.

if ( process.env.SCIZ_TOKEN ) {
  SCIZ_TOKEN = process.env.SCIZ_TOKEN
  logger.debug("SCIZ_TOKEN ENV var loaded");
}
else {
  logger.error("SCIZ_TOKEN ENV var is not set");
  process.exit(1) 
}

venom
  .create({
    session: 'session-master', //name of session
    browserArgs: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-setuid-sandbox'],
    multidevice: true, // for version not multidevice use false.(default: true)
    disableSpins: true, // Will disable Spinnies animation, useful for containers (docker)
  })
  .then((client) => start(client))
  .catch((erro) => {
    logger.error(erro);
  });

function start(client) {
  client.onMessage((message) => {
    // Here we are trying to catch TROLL requests //
    if (message.body.startsWith("?troll")) {
      regexp_match = message.body.match(/^[?]troll (\d+)$/)
      if (regexp_match) {
  
        troll_id = parseInt(regexp_match[1], 10)
        logger.info("RegExp found: "+troll_id);
        var req = https.request({
          'method': 'POST',
          'hostname': 'www.sciz.fr',
          'path': '/api/hook/trolls',
          'headers': {
            'Authorization': SCIZ_TOKEN
          },
          'maxRedirects': 20
        }, function (res) {
          var chunks = [];
      
          res.on("data", function (chunk) {
            chunks.push(chunk);
          });
      
          res.on("end", function (chunk) {
            var body = Buffer.concat(chunks);
            try {
                  let json = JSON.parse(body);
                  for(var troll in json.trolls){
                    if (json.trolls[troll].id === troll_id) {
                      troll_header = `[${json.trolls[troll].id}] ${json.trolls[troll].nom}`
                      logger.info("JSON found: "+troll_header);
                      troll_data = `*${troll_header}*\n` +
                      `*PVs*: ${json.trolls[troll].pdv}/${json.trolls[troll].pdv_max}\n` +
                      `*DLA*: ${json.trolls[troll].dla}\n` +
                      `*POS*: X=${json.trolls[troll].pos_x} | Y=${json.trolls[troll].pos_y} | N=${json.trolls[troll].pos_n}\n`;

                      client
                        .sendText(message.from, troll_data)
                        .then((result) => {
                          logger.info('Result: ', result); //return object success
                        })
                        .catch((erro) => {
                          logger.error('Error when sending: ', erro); //return object error
                        });
                    }
                  }
                  logger.debug(json)
                  // do something with JSON
              } catch (error) {
                logger.error(error.message);
              };
          });
      
          res.on("error", function (error) {
            logger.error(error);
          });
        });
        req.end();
      }
      else {
        logger.warn('RegEx KO');
      }
    }
  });
}