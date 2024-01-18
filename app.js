const venom = require('venom-bot');
const https = require('https');
const querystring = require('querystring');
const winston = require('winston');
const { combine, timestamp, printf, colorize } = winston.format;

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
      colorize({ all: true }),
      timestamp({
        format: 'YYYY-MM-DD hh:mm:ss',
      }),
      printf((info) => `${info.timestamp} | ${info.level} : ${info.message}`)
    ),
    transports: [new winston.transports.Console()],
  });

if ( process.env.SCIZ_TOKEN ) {
  SCIZ_TOKEN = process.env.SCIZ_TOKEN
  logger.verbose("SCIZ_TOKEN ENV var loaded");
}
else {
  logger.error("SCIZ_TOKEN ENV var is not set");
  process.exit(1) 
}

venom
  .create({
    browserArgs: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-setuid-sandbox',
    ],
    disableSpins: true, // Will disable Spinnies animation, useful for containers (docker)
    headless: 'new', // you should no longer use boolean false or true, now use false, true or 'new'
    multidevice: true, // for version not multidevice use false.(default: true)
    session: 'session-master', //name of session
  })
  .then((client) => start(client))
  .catch((erro) => {
    logger.error(erro);
  });

function start(client) {
  client.onMessage((message) => {
    if (message.body.startsWith("!!shutdown")) {
      logger.debug(`Command OK (${message.body})`)
      // Here is it a watchdog to properly close the client remotely //
      client
        .sendText(message.from, 'Ok, understood. Shutting down...')
        .then((result) => {
          logger.silly('Result: ', result); //return object success
        })
        .catch((erro) => {
          logger.error('Error when sending: ', erro); //return object error
        })
        .finally(()=> {
          client.close();
        });
    } else if (message.body.startsWith("?troll")) {
      // Here we are trying to catch TROLL requests //
      regexp_match = message.body.match(/^[?]troll (\d+)$/)
      logger.debug(`Command OK (${message})`)

      if (regexp_match) {
        troll_id = parseInt(regexp_match[1], 10)
        logger.debug(`[${troll_id}] RegExp OK`)
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
                      logger.debug("JSON found: "+troll_header);
                      troll_data = `*${troll_header}*\n` +
                      `*PVs*: ${json.trolls[troll].pdv}/${json.trolls[troll].pdv_max}\n` +
                      `*DLA*: ${json.trolls[troll].dla}\n` +
                      `*POS*: X=${json.trolls[troll].pos_x} | Y=${json.trolls[troll].pos_y} | N=${json.trolls[troll].pos_n}`;

                      client
                        .sendText(message.from, troll_data)
                        .then((result) => {
                          logger.silly('Result: ', result); //return object success
                        })
                        .catch((erro) => {
                          logger.error('Error when sending: ', erro); //return object error
                        });
                    }
                  }
                  logger.silly(json)
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
    } else if (message.body.startsWith("?mob")) {
      // Here we are trying to catch MONSTERS requests //
      regexp_match = message.body.match(/^[?]mob (\d+)$/)
      logger.debug(`Command OK (${message.body})`)

      if (regexp_match) {
        mob_id = parseInt(regexp_match[1], 10)
        logger.debug(`[${mob_id}] RegExp OK`)
        // we need a MH call first to have the NAME of the mob
        var req = https.request({
          'method': 'GET',
          'hostname': 'games.mountyhall.com',
          'path': `/mountyhall/View/MonsterView.php?ai_IDPJ=${mob_id}`,
          'maxRedirects': 20
        }, function (res) {
          res.setEncoding('binary');
          res.on("data", function (data) {
            arr = data.split("\n")
            for (var i = 0; i < arr.length; i++) {
              if (arr[i].includes(mob_id) && arr[i].includes('mh_monstres')) {
                logger.silly(arr[i])
                // We grabbed a line with the mob_id inside
                // Let's see if we can grab his name
                regexp_mob_name = arr[i].match(/class="mh_monstres">un[e]? ([-'A-Za-zÀ-ÿ\s]*) \[([A-Za-zÀ-ÿ]*)\]/)
                if (regexp_mob_name) {
                  mob_name = regexp_mob_name[1]
                  mob_age = regexp_mob_name[2]
                  break
                }
              }
            }

            if (mob_name && mob_age) {
              logger.debug(`[${mob_id}] RegExp OK: ${mob_name} [${mob_age}]`)
            }
            else {
              message = `[${mob_id}] RegExp KO: Unable to grab name & age`
              // CdM was not found in events, we answer nicely
              logger.warn(message)
              mob_data = message
            }

            // Now we have id, name, age
            // Lets call the next API to grab monster data
            var options = {
              'method': 'POST',
              'hostname': 'mz.mh.raistlin.fr',
              'path': '/mz/getCaracMonstre.php',
              'headers': {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              'maxRedirects': 20
            };

            var req = https.request(options, function (res) {
              var chunks = [];
            
              res.on("data", function (chunk) {
                chunks.push(chunk);
              });
            
              res.on("end", function (chunk) {
                var body = Buffer.concat(chunks);
                let json = JSON.parse(body);
                
                mob = json[0]
                logger.silly(mob)
                
                // Level
                if (mob.niv.min == mob.niv.max) {
                  LVL_DATA = mob.niv.min
                } else {
                  LVL_DATA = `${mob.niv.min}-${mob.niv.max}`
                }
                // PV
                if (mob.pv.min2) {
                  PV_DATA = `${mob.pv.min2}-${mob.pv.max2} PV`
                } else {
                  PV_DATA = `${mob.pv.min}-${mob.pv.max} PV`
                }
                // Date blessure
                if (mob.bless && mob.timegmt) {
                  let dt = new Date((mob.timegmt + 3600) * 1000)
                  // get current date
                  // adjust 0 before single digit date
                  let date = ("0" + dt.getDate()).slice(-2);
                  // get current month
                  let month = ("0" + (dt.getMonth() + 1)).slice(-2);
                  // get time
                  let time = `${dt.getHours()}:${dt.getMinutes()}`;
                  PV_DATA = PV_DATA + ` (${mob.bless}% @${date}/${month} ${time}) [#${mob.nCdM}]`
                }
                // Armure
                ARM_DATA_P = `${mob.armP.min2 || mob.armP.min || 1}-${mob.armP.max2 || mob.armP.max}`
                ARM_DATA_M = `${mob.armM.min2 || mob.armM.min || 1}-${mob.armM.max2 || mob.armM.max}`
                ARM_DATA = `(P): ${ARM_DATA_P} | (M): ${ARM_DATA_M}`
                // Esquive 
                ESQ_DATA = `${mob.esq.min2 || mob.esq.min || 1}-${mob.esq.max2 || mob.esq.max}D6`
                // Header
                MOB_HEADER = `[${mob_id}] ${mob_name} [${mob_age}] (${LVL_DATA})`

                mob_data = `*${MOB_HEADER}*\n` +
                `*PVs*: ${PV_DATA}\n` +
                `*ARM*: ${ARM_DATA}\n` +
                `*ESQ*: ${ESQ_DATA}`;
                logger.debug(mob_data)

                client
                  .sendText(message.from, mob_data)
                  .then((result) => {
                    logger.silly('Result: ', result); //return object success
                  })
                  .catch((erro) => {
                    logger.error('Error when sending: ', erro); //return object error
                  });
              });
            
              res.on("error", function (error) {
                console.error(error);
              });
            });
            
            var postData = querystring.stringify({
              'l': `[{"index":1,"id":${mob_id},"nom":"${mob_name} [${mob_age}]"}]`
            });
            
            req.write(postData);
            
            req.end();
          });
          res.on("error", function (error) {
            logger.error(error);
          });
        });
        req.end();
      }
      else {
      logger.warn('RegEx KO - Monster ID not found');
      }
    } else if (message.body.startsWith("?team")) {
      // Here we are trying to catch TEAM requests //
      logger.debug(`Command OK (${message.body})`)

      // We have to loop over trolls in Coterie to build content //
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
          team_data = `*[TEAM] Informations*:\n`
          try {
            let json = JSON.parse(body);
            for(var troll in json.trolls) {
                pv_data = `${json.trolls[troll].pdv}/${json.trolls[troll].pdv_max || '...'}`
                pv_data = pv_data.padStart(7, " ");
                team_data = team_data +
                  '```' +
                  `${json.trolls[troll].id}: ` +
                  `${pv_data}PV ` +
                  `@(${json.trolls[troll].dla.slice(0, -3)})` + 
                  '```\n';
            }
          } catch (error) {
            logger.error(error.message);
          };
          logger.info(team_data)
          client
            .sendText(message.from, team_data)
            .then((result) => {
              logger.silly('Result: ', result); //return object success
            })
            .catch((erro) => {
              logger.error('Error when sending: ', erro); //return object error
            });
        });
    
        res.on("error", function (error) {
          logger.error(error);
        });
      });
      req.end();
    } else {
      // We do nothing, it is a "regular" message
    }
  });
}