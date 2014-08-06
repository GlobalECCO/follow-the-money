/*******************************************************************************
 * Handles server requests from clients and EGS
 ******************************************************************************/
var gameController = require('./game_logic/game.js');
var database = require('./database.js');
var db = database.getGameModel();
var auth = require('./global_ecco_authenticator.js');
var log = require('./log').log;
var networkGenerator = require('./game_logic/network_generator.js');
var io = require('socket.io');
var chat = database.getChatModel();
var stats = database.getStatsModel();
var Util = require('./game_logic/util.js');
var inDebugMode = true;

module.exports = {
  gameList       : gameList,
  newGame        : newGame,
  deleteGame     : deleteGame,
  play           : play,
  sessionData    : sessionData,
  gameData       : gameData,
  playerData     : playerData,
  fullNetwork    : fullNetwork,
  partialNetwork : partialNetwork,
  submitTurn     : submitTurn,
  startChat      : startChat
};

//------------------------------------------------------------------------------
// A client request for listing existing games
// @return an HTMl <ul> of links to games
function gameList(request, response) {
  db.find(null, '', function (err, games) {
    if (err) {
      response.send(500, 'Error reading database');
    }

    var GamePhase = require('../shared/game_phase.js').GamePhase;

    var numGames = games.length;
    var toSend = "<ul>";
    for (var game = 0; game < numGames; ++game) {
      var latestTurn = games[game].getCurrentTurn();

      toSend += "<li>";
      toSend += "<a href=\"javascript:void(0)\" onclick=\"playGame('" + games[game]._id.toString() + "')\">" + games[game]._id.toString() + " (";
      toSend += "State='" + games[game].statePlayerName;
      toSend += "' Terrorist='" + games[game].terroristPlayerName;
      toSend += "' Turn=" + (latestTurn.currentTurnNumber + 1);
      toSend += " Status=" + latestTurn.gameEndReason;
      toSend += ')</a>';
      toSend += "  <a href=/delete?gid=" + games[game]._id.toString() + ">(Trash)</a>";
      toSend += '</li>';
    }
    if (inDebugMode) {
      toSend += "<br/><li><a href=/delete>(Trash all)</a></li>";
    }
    toSend += "</ul>";

    response.send(toSend);
    // global.gc();
  });
}

//------------------------------------------------------------------------------
// Generates a new game.
// Query string parameters:
// @param user#   - User id of all players playing this game. (replace # with (1..x))
// @returns JSON string containing information about the new game. Per EGS API.
function newGame(request, response) {
  var statePlayer = request.param('user1');
  var terroristPlayer = request.param('user2');

  if (statePlayer === undefined || terroristPlayer === undefined) {
    response.send(400, {"stat":"FAIL", "msg":"State and Terrorist players must be defined"});
    return;
  }

  // Create and initialize our game
  var myGame = new db();
  myGame.statePlayerName = statePlayer;
  myGame.terroristPlayerName = terroristPlayer;
  myGame.fakeMoneyFollowBits = Util.generateFakeMoneyFollowBits();
  myGame.debugFakeMoneyFollow = myGame.fakeMoneyFollowBits.toString();
  myGame.turns.push({});
  myGame.save(function(err) {
    if (err) {
      log.error('Failed to create new game: ' + err);
      response.send({"stat":"FAIL", "msg":"failed insert database entry for new game"});
      return;
    }
  });

  // Now initialize the new game since Mongoose has created all the correct
  // default values for us and re-save the game
  myGame.network = networkGenerator.generate();
  gameController.initializeNewGame(myGame.getCurrentTurn(), myGame.network);
  myGame.save(function(err) {
    if (err) {
      log.error('Failed to initialize new game: ' + err);
      response.send({"stat":"FAIL", "msg":"failed insert database entry for new game"});
      return;
    }
  });

  var gameChat = new chat({
    gameID: myGame._id,
    entries: []
  });

  gameChat.save(function (err) {
    if (err) {
      log.error('Failed to save new chat for new game.');
      response.send({ "stat": "FAIL", "msg": "Failed to save new chat for new game" });
      return;
    }
  });

  log.info("Created new game with id " + myGame._id.toString());

  //send back JSON string, according to EGS (Ecco Game Server) rules
  var gameJSON = {
    "stat": "OK",
    "glst": {
      "cnt" : "1",
      "game": {
        "gid": myGame._id.toString()
      }
    },
    "update": []
  };

  // build the update part of the payload
  auth.sendPlayerUpdate(gameJSON.update, myGame, myGame.getCurrentTurn());

  response.send(gameJSON);
}

//------------------------------------------------------------------------------
// Delete the game from the database
// delete?gid=<the game id>
function deleteGame(request, response) {
  var gid = request.param('gid');
  if (gid !== undefined) {
    db.findByIdAndRemove(gid, function(err, gameFound) {
      if (err) {
        response.send('Error: Could not find game to remove:'+gid);
        return;
      }

      if (gameFound) {
        log.info('Removed the game:' + gid);
        if (request.session.gid === gid) {
          request.session.gid = undefined;
        }

        chat.findOneAndRemove({gameID: gid}, function(err, found){
          if (!found) {
            log.error("Can't remove the game's chat : " + gid);
          }
        });

        response.redirect('/');
      }
    });
  } else {
    // No given gid means delete all!  But only in debug mode.
    if (inDebugMode) {
      db.remove(function() {
        log.info('All games removed');
      });
    }
    response.redirect('/');
  }
}

//------------------------------------------------------------------------------
// Request to play an existing game.
// @param gid The game id
// @param user The user's id
// @param dbg Optional. If we're in debug/developer mode
// @returns Success will return the gamepage.html file
// @note /play?gid=<game id>&user=<user id>[&dbg=1]
function play(request, response) {
  inDebugMode = false;

  if (request.param('dbg') === '1') { inDebugMode = true; }

  var gid = request.param('gid');
  if (gid === undefined) {
    response.send(400, 'gid parameter not supplied');
    return;
  }

  if (inDebugMode) {
    handleDebugPlay(request, response, gid);
  }
  else {
    auth.authenticate_with_cas(request, response, function(cas_handle) {
      log.info(cas_handle + " logged in!");

      auth.getPlayerProfile(cas_handle, gid, function(error, profile) {
        if (error) {
          response.send(400, error);
          return;
        }

        if (!profile) {
          response.send(400, "Unable to retrieve player profile.");
          return;
        }

        //the player profile is valid (gamingID is the player's nickname)
        startGame(profile.gamingId, gid, request, response);
      });
    });
  }
}

//------------------------------------------------------------------------------
// Retrieves our currently sessioned game and user ID
function sessionData(request, response) {
  if (request.session.gid === undefined) {
    log.error("Session GID invalid.");
    response.send(400, "No game session started.");
  }
  else if (request.session.user === undefined) {
    log.error("Session USER invalid.");
    response.send(400, "No user session started.");
  }
  else {
    response.send({'gid':request.session.gid, 'user':request.session.user});
  }
}

//------------------------------------------------------------------------------
// Send a given game state turn and its previous turn state back to the client.
// @note /pull?gid=<game id>
// @param gid The Game ID
// @param turnNumber The turn number someone is requesting, append
//          a 'b' to it if we want to see the pending results.
// @param prevTurn The previous turn number
// @param user The user requesting the game turn
// @param overrideUser override the user we are viewing during endgame
function gameData(request, response) {
  var gid = request.param('gid');
  if (gid !== undefined) {
    db.findById(gid, function (err, gameFound) {
      if (err) {
        response.send(400, 'Error finding the game: ' + err);
      }
      else if (gameFound) {
        var user = request.param('user');
        if (user === undefined) {
          response.send(400, 'No user information sent with the request');
        }
        else {
          var turn = undefined;
          var prevTurn = undefined;
          var turnNumber = request.param('turnNumber');
          var prevTurnNumber = request.param('prevTurn');
          if (typeof turnNumber !== 'undefined') {
            turn = {};
            turn.number = turnNumber;
            turn.pending = request.param('pending');
          }
          if (typeof prevTurnNumber !== 'undefined') {
            prevTurn = {};
            prevTurn.number = prevTurnNumber;
            prevTurn.pending = request.param('prevPending');
          }
          var overrideRole = request.param('overrideUser');
          var gameData = gameFound.getGameData(gameController, user, overrideRole, prevTurn, turn);

          response.send({
            statePlayer: gameData.statePlayer,
            terroristPlayer: gameData.terroristPlayer,
            prevTurn: gameData.prevTurn,
            currentTurn: gameData.currentTurn,
            latestTurnNumber: gameData.latestTurnNumber,
            latestPending: gameData.latestPending,
            isGameOver: gameData.isGameOver,
            isPlayback: gameData.isPlayback
          });

          // global.gc();
        }
      }
    });
  }
  else {
    response.send(400, 'No valid GID provided');
  }
}

//------------------------------------------------------------------------------
// A query to check if the current player data for this game
// @param gid The game id
// @return The JSON string of player array
// @note /playerData?gid=<game id>
function playerData(request, response) {
  var gid = request.param('gid');
  if (gid !== undefined) {
    db.findById(gid, function(err, gameFound) {
      if (err)
      {
        response.send(400, "Can't find game:" + gid + ': ' + err);
      }
      else if (gameFound)
      {
        response.send(gameController.getPlayerData(gameFound.getCurrentTurn()));
      }
    });
  }
  else {
    response.send(400,"Incorrect query parameters");
    return;
  }
}

//------------------------------------------------------------------------------
// Send a given game state turn and its previous turn state back to the client.
// @note /pull?gid=<game id>
// @param gid The Game ID
// @param turnNumber The turn number someone is requesting
// @param user The user requesting the game turn
function fullNetwork(request, response) {
  var gid = request.param('gid');
  if (gid !== undefined) {
    db.findById(gid, function (err, gameFound) {
      if (err) {
        response.send(400, 'Error finding the game: ' + err);
      }
      else if (gameFound) {
        response.send(gameFound.network);
      }
      // global.gc();
    });
  }
  else {
    response.send(400, 'No valid GID provided');
  }
}

//------------------------------------------------------------------------------
// Send a given game state turn and its previous turn state back to the client.
// @note /pull?gid=<game id>
// @param gid The Game ID
// @param turnNumber The turn number someone is requesting
// @param user The user requesting the game turn
function partialNetwork(request, response) {
  var gid = request.param('gid');
  if (gid !== undefined) {
    db.findById(gid, function (err, gameFound) {
      if (err) {
        response.send(400, 'Error finding the game: ' + err);
      }
      else if (gameFound) {
        // Return a version of the game state at the requested turn number
        // modified based on which player is asking
        var turnNumber = request.param('turnNumber');
        if (turnNumber === undefined) {
          turnNumber = gameFound.getCurrentTurnNumber();
        }

        var prevTurnNumber = request.param('prevTurn');
        if (prevTurnNumber === undefined) {
          prevTurnNumber = parseInt(turnNumber) - 1;
        }

        var previousTurn = gameFound.getTurn(prevTurnNumber);
        var currentTurn = gameFound.getTurn(turnNumber);

        response.send({
          previousNetwork: gameController.getPartialNetwork(previousTurn, gameFound.network),
          currentNetwork: gameController.getPartialNetwork(currentTurn, gameFound.network)
        });
      }
      // global.gc();
    });
  }
  else {
    response.send(400, 'No valid GID provided');
  }
}

//------------------------------------------------------------------------------
// Handle the player's pushing of data to the server.
// @param gid The Game ID
// @param user The user's ID who's submitting their turn actions
// @param actions The list of encoded actions
// @note "/push?gid=<gid>&user=<user id>&actions=<action list>
function submitTurn(request, response) {
  var gid = request.param('gid');
  if (gid !== undefined) {
    db.findById(gid, function(err, gameFound) {
      if (err) {
        response.send(400, 'Could not find the requested game');
        return;
      }
      else if (gameFound) {
        var user = request.param('user');
        if (user !== undefined && request.body.hasOwnProperty('actions')) {
          var actions = request.body.actions;
          if (setThePlayersActions(gid, user, actions, gameFound)) {
            //See if all players have submitted their turn and update the game state
            if (gameFound.allPlayersSubmitted()) {
              log.debug('All players have submitted their turns for game ' + gid);

              // Create a copy of the current game state, update it, and add it to our list
              var Util = require('../shared/util_functions.js');

              // Make fake money follow data available
              var newTurn = Util.copyTurn(gameFound.getCurrentTurn());
              newTurn.fakeMoneyFollowBits = gameFound.fakeMoneyFollowBits;
              newTurn.fakeMoneyFollowTrials = gameFound.fakeMoneyFollowTrials;

              // Update the state and if the game is over, store the results for later analysis
              if (gameController.updateGameState(newTurn, gameFound.network)) {
                collectStatistics(gameFound);
              }

              // Update the number of trials (die rolls)
              gameFound.fakeMoneyFollowTrials = newTurn.fakeMoneyFollowTrials;

              // Remove temp data
              delete newTurn.fakeMoneyFollowBits;
              delete newTurn.fakeMoneyFollowTrials;

              gameFound.turns.push(newTurn);
              gameFound.resetPlayerTurns();
              saveTheGameState(gameFound);
            }
            else {
              //save the new game state to the database
              saveTheGameState(gameFound);
            }

            response.send('success');
          }
        }
        else {
          response.send(400, 'User and/or Actions not provided');
        }
      }//if game found
      else {
        log.warn('did not find the game');
        response.send(400, 'Could not find the requested game');
      }
    });
  }
  else {
    response.send(400, 'No valid GID provided');
  }
}

//------------------------------------------------------------------------------
// Start the game play, using the supplied params.
// @param username : The player's nickname for this game
// @param gid : The Game ID
// @param request : The clients request object
// @param response: The responce object to the client
var startGame = function(username, gid, request, response) {
   //see if request.param('gid') exists in the database
  db.findOne({_id: gid}, function(err, gameFound) {
    if (err) {
      log.warn ('Did not find the requested game: '+gid);
      response.send(400, 'The requested game was not found: '+ gid);
      return;
    }

    if (gameFound) {
      // Determine the user can play the game or just view.
      var playerObj = getPlayerObj(gameFound, username);
      if (playerObj !== undefined) {
        request.session.gid  = gid;
        request.session.user = username;

        log.info ('Player ' + username + ' is joining game: ' + gid);

        response.sendfile("gamepage.html");
      }
      else {
        response.send(400, 'You are not a player in this game');
      }
    }
    else {
      response.send(400, "Game not found.");
    }
  });
};

//------------------------------------------------------------------------------
function startChat(server) {

  io = io.listen(server, {log: false});
  io.sockets.on('connection', function(socket) {

    socket.emit('connected-to-server');

    socket.on('join-game', function(data) {
      if (data.hasOwnProperty('gid') && data.hasOwnProperty('user')) {
        //console.log("Joining channel " + data.gid);
        socket.gid = data.gid;
        socket.user = data.user;
        socket.join(data.gid.toString());
        socket.emit('game-joined');
        socket.broadcast.to(data.gid).emit('other-user-joined-game', { user: data.user });

      } else {
        console.log('trying to join a chat channel without a game id.');
      }
    });

    socket.on('request-chat-history', function(data) {
      getFullChatHistory(data.gid, function(entries) {
          socket.emit('chat-history', entries);
        });
    });

    socket.on('chat', function(data) {
      if (data.hasOwnProperty('gid') &&
          data.hasOwnProperty('user') &&
          data.hasOwnProperty('text')) {
        var dataToSend = { user: data.user, text: data.text };
        socket.emit('client-chat', dataToSend);
        socket.broadcast.to(data.gid.toString()).emit('client-chat', dataToSend);

        // Save to db
        saveChat(data.gid, data.user, data.text);
      } else {
        console.log('trying to chat without valid gid and user');
      }
    });

    socket.on('user-typing', function(data) {
      if (data.hasOwnProperty('gid') && data.hasOwnProperty('user')) {
        socket.broadcast.to(data.gid.toString()).emit('other-user-typing', data.user);
      }
    });

    socket.on('disconnect', function() {
      if (socket.gid && socket.user) {
        console.log(socket.user + ' left the game.');
        socket.broadcast.to(socket.gid.toString()).emit('game-left', socket.user);
      }
    });
  });
}

//------------------------------------------------------------------------------
function saveChat(gid, user, text) {
   chat.findOne({ gameID: gid }, function (error, found) {
    if (error) {
      response.send(500, 'Error reading database for chat');
    }

    if (found) {
      var entry = {
        name : user,
        text : text
      };

      found.entries.push(entry);

      found.save(function (err) {
        if (err) {
          log.error("Failed to save new chat entry: " + err);
        }
      });
    }
  });
}

//------------------------------------------------------------------------------
function getFullChatHistory(gid, resultCB) {
  chat.findOne({ gameID: gid }, function (error, found) {
    if (error) {
      response.send(500, 'Error reading database for chat');
    }

    if (found) {
      resultCB && resultCB(found.entries);
    }
  });
}

//------------------------------------------------------------------------------
// Set the actions this player has taken this turn
var setThePlayersActions = function(gid, id, actions, gameFound) {
  // Find the player, mark their turn as taken, and store their actions
  var success = false;
  var playerObj = getPlayerObj(gameFound, id);
  if (playerObj !== undefined) {
    log.debug('Player ' + id + ' placed a turn for game ' + gid);
    if (playerObj.pendingTurn === null) {
      playerObj.pendingTurn = actions;
      success = true;
    }
    else {
      log.warn('Player: ' + id + ' tried to submit another turn (already has one recorded) for game ' + gid);
    }
  }
  return success;
};

//------------------------------------------------------------------------------
var saveTheGameState = function(gameFound) {
  //save the game model changes to the database
  log.debug('saving game state for game ' + gameFound._id);
  gameFound.save(function (err) {
    if (err) {
      log.error('failed to save new data: ' + err);
    }
  });

  if (!inDebugMode) {
    // Send an updated game status to the EGS server.
    database.getRPC(function (rpcIndex) {
      auth.sendEGSUpdate(rpcIndex, gameFound);
    });
  }

};

//------------------------------------------------------------------------------
// Handle the request to play in developer/debug mode. This does not use
// the CAS system for authentication.
var handleDebugPlay = function(request, response, gid) {
  //kick out with an error if params aren't correct
  if (!request.param('user')) {
    response.send(400, 'user parameter not supplied');
    return;
  }

  var user = request.param('user');

  startGame(user, gid, request, response);
};

//------------------------------------------------------------------------------
// Get the player object for the given ID or undefined if it isn't one
var getPlayerObj = function(game, username) {
  if (game.statePlayerName === username) {
    return game.getCurrentTurn().statePlayer;
  }
  if (game.terroristPlayerName === username) {
    return game.getCurrentTurn().terroristPlayer;
  }
  return undefined;
};

//------------------------------------------------------------------------------
var collectStatistics = function(game) {
  stats.find({}, function(err, statsDB) {
    var statsEntry = statsDB[0];
    var areStatsNew = false;

    if (statsEntry === undefined) {
      statsEntry = new stats();
      areStatsNew = true;
    }

    // Allow these properties to be added to an existing table as well as a newly created one
    if (areStatsNew || statsEntry.stateWinTurn.length !== 41 || statsEntry.terroristWinTurn.length !== 41) {
      for (var i = 0; i < 40; ++i) {
        statsEntry.stateWinTurn[i] = 0;
        statsEntry.terroristWinTurn[i] = 0;
      }
    }

    // Allow these properties to be added to an existing table as well as a newly created one
    if (areStatsNew || statsEntry.networkDiscoveredPct.length !== 101) {
      for (var i = 0; i <= 100; ++i) {
        statsEntry.networkDiscoveredPct[i] = 0;
      }
    }

    var numTurns = game.turns.length - 1;
    var currentTurn = game.getCurrentTurn();

    // Keep track wins and win turn
    if (Util.didTerroristPlayerWin(currentTurn)) {
      statsEntry.terroristWinTurn[numTurns] += 1;
      statsEntry.markModified('terroristWinTurn');
      ++statsEntry.timesTerroristWon;
    } else {
      statsEntry.stateWinTurn[numTurns] += 1;
      statsEntry.markModified('stateWinTurn');
      ++statsEntry.timesStateWon;
    }

    var percentNetworkDiscovered = Math.round(currentTurn.statePlayer.knownNodes.length * 100 / game.network.nodes.length);
    statsEntry.networkDiscoveredPct[percentNetworkDiscovered] += 1;
    statsEntry.markModified('networkDiscoveredPct');

    //console.log('state[' + numTurns.toString() + '] = ' + statsEntry.stateWinTurn[numTurns].toString());
    //console.log('terrorist[' + numTurns.toString() + '] = ' + statsEntry.terroristWinTurn[numTurns].toString());

    statsEntry.save(function (err) {
      if (err) {
        log.error('failed to save new stats: ' + err);
      }
    });
  });
}

var getNetworkDiscoveredPercentage = function(game) {

}
