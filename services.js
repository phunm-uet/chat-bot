var config = require('./config.js');
var bittrex = require('node.bittrex.api');
bittrex.options({
  'apikey' : config.key,
  'apisecret' : config.secret
});
module.exports = bittrex;