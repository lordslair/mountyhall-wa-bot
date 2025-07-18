// Supports ES6
const https = require('https');
const querystring = require('querystring');
// import { create, Whatsapp } from '@wppconnect-team/wppconnect';
const wppconnect = require('@wppconnect-team/wppconnect');
const winston = require('winston');
const { combine, timestamp, printf, colorize } = winston.format;

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'silly',
    format: combine(
      colorize({ all: false }),
      printf((info) => `${info.level} : ${info.message}`)
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

const session_name = 'mhSession'

wppconnect.create({
    session: session_name, //Pass the name of the client you want to start the bot
    catchQR: (asciiQR, attempts) => {
      console.log('Number of attempts to read the qrcode: ', attempts);
    },
    statusFind: (statusSession, session) => {
      console.log('Status Session: ', statusSession); //return isLogged || notLogged || browserClose || qrReadSuccess || qrReadFail || autocloseCalled || desconnectedMobile || deleteToken
      //Create session wss return "serverClose" case server for close
      console.log('Session name: ', session);
    },
    onLoadingScreen: (percent, message) => {
      console.log('LOADING_SCREEN', percent, message);
    },
    headless: true, // Headless Chrome
    devtools: false, // Open devtools by default
    useChrome: true, // If false will use Chromium instance
    debug: false, // Opens a debug session
    logQR: true, // Logs QR automatically in terminal
    browserArgs: [
      '--disable-setuid-sandbox',
      '--no-sandbox',
      '--safebrowsing-disable-auto-update',
      '--disable-features=LeakyPeeker' // Disable the browser's sleep mode when idle, preventing the browser from going into sleep mode, this is useful for WhatsApp not to be in economy mode in the background, avoiding possible crashes
    ], // Parameters to be added into the Chrome browser instance
    puppeteerOptions: {
      userDataDir: `${__dirname}/tokens/${session_name}`,
      args: ['--no-sandbox', '--disable-gpu', '--disable-setuid-sandbox'],
    }, // Will be passed to puppeteer.launch
    disableWelcome: false, // Option to disable the welcoming message which appears in the beginning
    updatesLog: true, // Logs info updates automatically in terminal
    autoClose: 60000, // Automatically closes the wppconnect only when scanning the QR code (default 60 seconds, if you want to turn it off, assign 0 or false)
    tokenStore: 'file', // Define how to work with tokens, which can be a custom interface
    folderNameToken: `${__dirname}/tokens`, //folder name when saving tokens
   })
  .then((client) => start(client))
  .catch((error) => console.log(error));


function start(client) {
  logger.info('Starting bot...');
  client.onMessage(async (msg) => {
    try {
      if (msg.body == '!!ping') {
        // Send a new message to the same chat
        client.sendText(msg.from, 'pong');
      } else if (msg.body == "!!shutdown") {
        logger.debug(`<!!shutdown> Command OK (${msg.body})`)
        // Here is it a watchdog to properly close the client remotely //
        client
          .reply(msg.from, 'Ok, understood. Shutting down...', msg.id.toString())
          .then((result) => {
            logger.debug('<!!shutdown> Message sent');
          })
          .catch((erro) => {
            logger.error('<!!shutdown> Error when sending: ', erro); //return object error
          })
          .finally(()=> {
            client.close();
          });
      } else if (msg.body == '!!chats') {
        // We return the number of opened chats //
        const chats = await client.listChats();
        //logger.debug(chats)
        client
          .reply(msg.from, `The bot has ${chats.length} chats open.`, msg.id.toString())
          .then((result) => {
            logger.debug('<!!chats> Message sent');
          })
          .catch((erro) => {
            logger.error('<!!chats> Error when sending: ', erro); //return object error
          });
      } else if (msg.body == "?team") {
        // Here we are trying to catch TEAM requests //
        logger.debug(`<?team> Command OK (${msg.body})`)

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

            logger.info("<?team> DATA: \n"+team_data)

            client
              .reply(msg.from, team_data, msg.id.toString())
              .then((result) => {
                logger.debug('<?team> Message sent');
              })
              .catch((erro) => {
                logger.error('<?team> Error when sending: ', erro); //return object error
              });
          });
      
          res.on("error", function (error) {
            logger.error(error);
          });
        });
        req.end();
      } else if (msg.body.startsWith("?mob")) {
        // Here we are trying to catch MONSTERS requests //
        regexp_match = msg.body.match(/^[?]mob (\d+)$/)
        logger.debug(`<?mob> Command OK (${msg.body})`)
  
        if (regexp_match) {
          mob_id = parseInt(regexp_match[1], 10)
          logger.debug(`<?mob> [${mob_id}] RegExp OK`)
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
                  logger.silly("<?mob> "+arr[i])
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
                logger.debug(`<?mob> [${mob_id}] RegExp OK: ${mob_name} [${mob_age}]`)
              }
              else {
                message = `<?mob> [${mob_id}] RegExp KO: Unable to grab name & age`
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
                  logger.silly("<?mob> CdM from MZ: "+mob)
                  
                  // Level
                  if (mob.niv.min == mob.niv.max) {
                    LVL_DATA = mob.niv.min
                  } else {
                    LVL_DATA = `${mob.niv.min}-${mob.niv.max}`
                  }
                  // PV
                  if (mob.pv.min2) {
                    PV_DATA = `${mob.pv.min2}-${mob.pv.max2}`
                  } else {
                    if (mob.pv.max) {
                      PV_DATA = `${mob.pv.min}-${mob.pv.max}`
                    } else {
                      PV_DATA = `${mob.pv.min}+`
                    }
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
                  if (mob.arm) {
                    // CdM exists but is CdM1, so no armM & armP
                    if (mob.arm.max) {
                      ARM_DATA = `(G): ${mob.arm.min || 1}-${mob.arm.max}`
                    } else {
                      ARM_DATA = `(G): ${mob.arm.min || 1}+`
                    }
                  } else {
                    ARM_DATA_P = `${mob.armP.min2 || mob.armP.min || 1}-${mob.armP.max2 || mob.armP.max}`
                    ARM_DATA_M = `${mob.armM.min2 || mob.armM.min || 1}-${mob.armM.max2 || mob.armM.max}`
                    ARM_DATA = `(P): ${ARM_DATA_P} | (M): ${ARM_DATA_M}`
                  }
                  // Esquive 
                  ESQ_DATA = `${mob.esq.min2 || mob.esq.min || 1}-${mob.esq.max2 || mob.esq.max}D6`
                  // Header
                  MOB_HEADER = `[${mob_id}] ${mob_name} [${mob_age}] (${LVL_DATA})`
  
                  mob_data = `*${MOB_HEADER}*\n` +
                  `*PVs*: ${PV_DATA}\n` +
                  `*ARM*: ${ARM_DATA}\n` +
                  `*ESQ*: ${ESQ_DATA}`;
  
                  logger.info("<?mob> DATA: \n"+mob_data)
  
                  client
                    .reply(msg.from, mob_data, msg.id.toString())
                    .then((result) => {
                      logger.debug('<?mob> Message sent');
                    })
                    .catch((erro) => {
                      logger.error('<?mob> Error when sending: ', erro); //return object error
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
        logger.warn('<?mob> RegEx KO - Monster ID not found');
        }
      } else if (msg.body.startsWith("?troll")) {
        // Here we are trying to catch TROLL requests //
        regexp_match = msg.body.match(/^[?]troll (\d+)$/)
        logger.debug(`<?troll> Command OK (${msg})`)
  
        if (regexp_match) {
          troll_id = parseInt(regexp_match[1], 10)
          logger.debug(`<?troll> [${troll_id}] RegExp OK`)
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
                    logger.silly("<?troll> JSON found: "+json);
                    // do something with JSON
                    for(var troll in json.trolls){
                      if (json.trolls[troll].id === troll_id) {
                        troll_header = `[${json.trolls[troll].id}] ${json.trolls[troll].nom}`
                        logger.debug("<?troll> Tröll found: "+troll_header);
                        troll_data = `*${troll_header}*\n` +
                        `*PVs*: ${json.trolls[troll].pdv}/${json.trolls[troll].pdv_max}\n` +
                        `*DLA*: ${json.trolls[troll].dla}\n` +
                        `*POS*: X=${json.trolls[troll].pos_x} | Y=${json.trolls[troll].pos_y} | N=${json.trolls[troll].pos_n}`;
  
                        logger.info("<?troll> DATA: \n"+troll_data)
  
                        client
                          .reply(message.from, troll_data, msg.id.toString())
                          .then((result) => {
                            logger.debug('<?troll> Message sent');
                          })
                          .catch((erro) => {
                            logger.error('<?troll> Error when sending: ', erro); //return object error
                          });
                      }
                      else {
                        logger.silly(`<?troll> No match ${json.trolls[troll].id} === ${troll_id}`);
                      }
                    }
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
          logger.warn('<?troll> RegEx KO');
        }
      } else {
        // We do nothing, it is a "regular" message
        logger.silly('Message skipped');
      }
    } catch (e) {
      logger.error(e);
    }
  });
}