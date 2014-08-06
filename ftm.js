var PORT = process.env.PORT || 8080;
var enableHeapDebug = false;

var express = require('express');
var app = express();
var Handler = require('./server/communication_handler');
var log = require('./server/log').log;
var server = require('http').createServer(app);

app.use(express.compress());
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({secret: '1234567890QWERTY'}));
app.use(app.router);
app.use(express.static(__dirname + "/client"));
app.use(express.static(__dirname + "/client/modules"));
app.use(express.static(__dirname + "/shared"));
app.use(express.static(__dirname + "/lib"));
app.use(express.static(__dirname + "/build"));

app.get('/', function(require, response) {
  response.sendfile('index.html');
});

app.get('/status', function(request, response) {
  response.send("Okay!");
});

app.get('/gamelist', Handler.gameList);

app.get('/new', Handler.newGame);

app.get('/delete', Handler.deleteGame);

app.get('/play', Handler.play);

app.get('/sessionData', Handler.sessionData);

app.get('/pull', Handler.gameData);

app.get('/playerData', Handler.playerData);

app.get('/fullNetwork', Handler.fullNetwork);

app.get('/partialNetwork', Handler.partialNetwork);

app.post('/push', Handler.submitTurn);

Handler.startChat(server);

// debug memory / heap
if (enableHeapDebug) {
  app.use(express.static(__dirname + "/client/debug"));
  require('./server/heap_debug').startHeapDebug(server);
  app.get('/heap', function(require, response) {
    response.sendfile('client/debug/index.html');
    console.log('Started heap debug.');
  });
}

server.listen(PORT);

log.info('Listening on port:' + PORT);
