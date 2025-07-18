const fs = require('fs');
const path = require('path');

const commands = [];

fs.readdirSync(__dirname).forEach(file => {
  if (file === 'index.js' || !file.endsWith('.js')) return;
  const command = require(path.join(__dirname, file));
  if (command && typeof command.match === 'function') {
    commands.push(command);
  }
});

module.exports = commands;
