// bot.js
const path = require('path');
const wppconnect = require('@wppconnect-team/wppconnect');
const logger = require('./logger');

const session_name = 'mhSession';

function initBot(startCallback) {
  return wppconnect.create({
    session: session_name,
    catchQR: (asciiQR, attempts) => {
      console.log('Number of attempts to read the qrcode: ', attempts);
    },
    statusFind: (statusSession, session) => {
      console.log('Status Session: ', statusSession);
      console.log('Session name: ', session);
    },
    onLoadingScreen: (percent, message) => {
      console.log('LOADING_SCREEN', percent, message);
    },
    headless: true,
    devtools: false,
    useChrome: true,
    debug: false,
    logQR: true,
    browserArgs: [
      '--disable-setuid-sandbox',
      '--no-sandbox',
      '--safebrowsing-disable-auto-update',
      '--disable-features=LeakyPeeker'
    ],
    puppeteerOptions: {
      userDataDir: path.resolve(__dirname, 'tokens', session_name),
      args: ['--no-sandbox', '--disable-gpu', '--disable-setuid-sandbox'],
    },
    disableWelcome: false,
    updatesLog: true,
    autoClose: 60000,
    tokenStore: 'file',
    folderNameToken: path.resolve(__dirname, 'tokens'),
  })
    .then((client) => {
      logger.info("WPPConnect client created successfully!");
      startCallback(client);
    })
    .catch((err) => {
      logger.error('Error creating WPPConnect client:', err);
    });
}

module.exports = initBot;
