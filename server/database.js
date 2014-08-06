/*******************************************************************************
 * Defines structure and helper functions for the game's state
 ******************************************************************************/
var AgentStatus = require('../shared/agent_status.js').AgentStatus;
var BalanceValues = require('../shared/balance_values.js').BalanceValues;
var GameEndReason = require('../shared/game_end_reasons.js').GameEndReason;
var GamePhase = require('../shared/game_phase.js').GamePhase;
var MoneyStatus = require('../shared/money_status.js').MoneyStatus;
var NodeTypes = require('../shared/node_types.js').NodeTypes;
var PlayerRoles = require('../shared/player_roles.js').PlayerRoles;
var SharedUtil = require('../shared/util_functions.js');
var mongoose = require('mongoose');
var log = require('./log').log;

module.exports = {
  getGameModel: getGameModel,
  getRPC: getRPC,
  getChatModel: getChatModel,
  getStatsModel: getStatsModel
};

var mongoURL = process.env.MONGO_URL || 'mongodb://localhost/FollowTheMoney';
mongoose.connect(mongoURL);

var Schema = mongoose.Schema;

// Schema for a visual location.
var positionSchema = {
  x :{type: Number, default: 0},                      // Horizontal position percentage
  y :{type: Number, default: 0}                       // Vertical position percentage
};

// Schema for nodes that make up the money network.
var nodeSchema = {
  id                  :{type: Number,  default: 0},              // The ID of the node
  cluster             :{type: Number,  default: 0},              // Which cluster group this node is in
  name                :{type: String,  default:'unnamed'},       // The name to be displayed
  position            :positionSchema,                           // The visual position where this node is placed
  type                :{type: String,  default: NodeTypes.BANK}, // Type of node (e.g. BANK, HAWALA, COURIER)
  prevLinks           :[{type:Number,  default: 0}],             // List of all links that lead to a previous node
  nextLinks           :[{type:Number,  default: 0}],             // List of all links that lead to the next node
  holdTime            :{type: Number,  default: 0},              // The time any transfered money is held before it can be used or moved
  fakeLeadProbability :{type: Number,  default: 0}               // Probability that you will be alerted by a fake suspicious transaction on this node per agent
};

// Schema for links that connect nodes together.
var linkSchema = {
  id         :{type:  Number,  default: 0},           // The ID of the link
  travelTime :{type:  Number,  default: 1},           // Number of turns this link takes to transfer money through
  nodes      :{                                       // List of node id's that this link connects between
                start:{type: Number, default: 0},
                end  :{type: Number, default: 0}
              }
};

// Schema for State agents who monitor activity.
var agentSchema = {
  id            :{type: Number, default: -1},                                           // The ID for the agent
  location      :{type: Number, default: -1},                                           // Location of the agent based on node id
  detectionRate :{type: Number, default: BalanceValues.STATE_AGENT_DETECTABILITY_RATE}, // How good this agent is at detecting money
  status        :{type: String, default: AgentStatus.FOCUSING},                         // What this agent is currently doing
  previousStatus:{type: String, default: AgentStatus.FOCUSING},                         // What this agent was previously doing
  timeFreezing  :{type: Number, default: 0}                                             // How much time this agent has been freezing money
};

// Schema for money transfer routes actively taking place.
var moneySchema = {
  id            :{type:  Number,  default: 0},                   // The ID for the money
  route         :[{type: Number,  default: 0}],                  // List of link id's that make up the rest of this money's route
  previousRoute :[{type: Number,  default: 0}],                  // List of link id's that this money had previously traveled on
  current       :{type:  Number,  default: -1},                  // Current location of money en route (could be link or node id, depending on status)
  amount        :{type:  Number,  default: 1},                   // The amount of money being transferred
  waitTime      :{type:  Number,  default: 0},                   // How many turns this money has been waiting at its current location
  courierDelay  :{type:  Number,  default: 0},                   // How many turns this money has been delayed by using a courier
  agent         :{type:  Number,  default: -1},                  // The ID of the agent following this money
  status        :{type:  String,  default: MoneyStatus.INVALID}, // The current status of this money
  courierHired  :{type:  Boolean, default: false},               // Whether a courier is hired for this transaction
  courierLocked  :{type:  Boolean, default: false}               // A courier was hired on the previous turn and can't be undone anymore
};

// Schema for the State player.
var stateSchema = {
  pendingTurn  :{type: String, default: null},         // The pending actions for the player this turn
  agents       :[agentSchema],                         // Total agents that belong to this player
  knownNodes   :[{type: Number, default: -1}],         // The indices of the nodes the State player knows about
  knownLinks   :[{type: Number, default: -1}],         // The indices of the links the State player knows about
  trackedMoney: [{ type: Number, default: 0 }],        // How much money the State player has seen arrive at the given node ID
  amountOfFrozenRealMoney: {type: Number, default: 0}, // Amount of real money the State player has frozen
  amountOfFrozenFakeMoney: {type: Number, default: 0}, // Amount of fake money the State player has frozen
  lostLeadNodes: [{type: Number, default: 0}],         // The node IDs of locations where the State lost money at
  newlyTrackedMoney: [{type: Number, default: 0}],     // The amounts of money the State tracked to a terrorist this turn indexed by nodeID
  newlyDiscoveredNodes: [{type: Number, default: 0}],  // The node IDs of nodes the State just discovered
  newlyDiscoveredLinks: [{type: Number, default: 0}],  // The node IDs of links the State just discovered
};

// Schema for the Terrorist player.
var terroristSchema = {
  pendingTurn     :{type: String, default: null},                                   // The pending actions for the player this turn
  moneyReserve    :{type: Number, default: BalanceValues.TERRORIST_MONEY_RESERVES}, // Total money in reserve, to be sent out or spent
  balances        :[{type: Number, default: 0}],                                    // Total money each of the terrorist nodes has in reserves
  lastTurn        :[{type: Number, default: 0}],                                    // The turn number a node's balance goes below 0 (undefined if this hasn't happened yet)
  maintenanceTime :{type: Number,  default: 0}                                      // How many turns has gone between maintenance updates
};

// Schema that defines the state of the game for one turn
var turnSchema = {
  phase             :{type: String, default: GamePhase.NORMAL},        // The current phase of our game
  statePlayer       :stateSchema,                                      // Our State player data
  terroristPlayer   :terroristSchema,                                  // Our Terrorist player data
  money             :[moneySchema],                                    // Current money on the network
  currentTurnNumber :{type: Number, default: 0},                       // The turn counter
  gameEndReason     :{type: String, default: GameEndReason.UNDECIDED}, // What caused the game to end
  uniqueID          :{type: Number, default: 0},                       // A number used as a unique id (always increments when used)
  followedFakeMoney :{type: Number, default: 0},
  movedFakedMoney   :{type: Number, default: 0},
  generatedFakeMoney:{type: Number, default: 0},
  totalFakeMoney    :{type: Number, default: 0},
};

// Schema that defines our entire money network.
var networkSchema = {
  nodes :[nodeSchema],                                // List of all nodes in our network
  links :[linkSchema]                                 // List of all links between nodes in our network
};

// Schema for our game.
var gameSchema = new Schema({
  turns                :[turnSchema],                  // The list of turns that make up this game
  statePlayerName      :{type: String, default: null}, // The state player's name
  terroristPlayerName  :{type: String, default: null}, // The terrorist player's name
  network              :networkSchema,                  // List of all nodes in our network
  fakeMoneyFollowBits  :mongoose.Schema.Types.Mixed,
  fakeMoneyFollowTrials:{type:Number, default: 0},
  debugFakeMoneyFollow :{type: String, default: null}
});

// Schema for a chat entry
var chatSchema = new Schema({
  name : { type:String, default:null },
  text : { type:String, default:null }
});

// Schema for collected statistics
var statsScheme = new Schema({
  timesTerroristWon : { type:Number, default: 0 },
  timesStateWon :     { type:Number, default: 0 },
  terroristWinTurn :  [{ type:Number, default: 0 }], // an array index for each possible turn
  stateWinTurn :      [{ type:Number, default: 0 }], // an array index for each possible turn
  networkDiscoveredPct : [{ type:Number, default: 0 }] // an array index for each possible integer percentage
});

//------------------------------------------------------------------------------
// Get the turn number for the current turn
gameSchema.methods.getCurrentTurnNumber = function() {
  return this.turns.length - 1;
};

//------------------------------------------------------------------------------
// Get the object for the current turn
gameSchema.methods.getCurrentTurn = function() {
  return this.getTurn(this.getCurrentTurnNumber());
};

//------------------------------------------------------------------------------
// Get the object for the given turn number
gameSchema.methods.getTurn = function(turnIndex) {
  if (0 <= turnIndex && turnIndex < this.turns.length) {
    return this.turns[turnIndex];
  }
  return null;
};

//------------------------------------------------------------------------------
// Have all the players submitted a turn in this Game?
gameSchema.methods.allPlayersSubmitted = function() {
  var currentTurn = this.getTurn(this.getCurrentTurnNumber());
  return currentTurn.statePlayer.pendingTurn !== null && currentTurn.terroristPlayer.pendingTurn !== null;
};

//------------------------------------------------------------------------------
// Reset all the players in the game for a new turn
gameSchema.methods.resetPlayerTurns = function() {
  var currentTurn = this.getTurn(this.getCurrentTurnNumber());
  currentTurn.statePlayer.pendingTurn = null;
  currentTurn.terroristPlayer.pendingTurn = null;
};

//------------------------------------------------------------------------------
// Gathers the turn data generated from the given previous and current turn for
// the given user name
gameSchema.methods.getGameData = function(gameController, user, overrideRole, previousTurnNumber, currentTurnNumber) {
  var gameData = {
    statePlayer: this.statePlayerName,
    terroristPlayer: this.terroristPlayerName,
  };

  // Get information about the most recent game turn
  var lastTurn = this.getCurrentTurn();
  gameData.latestTurnNumber = lastTurn.currentTurnNumber;
  gameData.isGameOver = lastTurn.phase === GamePhase.ENDGAME;

  // Figure out which player role we're getting information for
  var currentRole = this.getPlayerRole(user);
  if (overrideRole && gameData.isGameOver) {
    currentRole = overrideRole;
  }
  gameData.latestPending = this.hasRoleSubmittedTurn(currentRole, lastTurn);

  // Get the actual turn data
  if (typeof currentTurnNumber === 'undefined') {
    currentTurnNumber = {
      number: lastTurn.currentTurnNumber,
      pending: lastTurn.pendingTurn !== null ? true : false,
    };
  }
  if (typeof previousTurnNumber === 'undefined') {
    previousTurnNumber = {
      number: lastTurn.currentTurnNumber - 1,
      pending: true,
    };
  }
  gameData.prevTurn = this.getTurnData(gameController, currentRole, previousTurnNumber);
  gameData.currentTurn = this.getTurnData(gameController, currentRole, currentTurnNumber);

  // Set whether we're in playback mode or not
  if (gameData.isGameOver && currentTurnNumber.number === lastTurn.currentTurnNumber) {
    gameData.isPlayback = false;
  } else {
    gameData.isPlayback = currentTurnNumber.number < lastTurn.currentTurnNumber ||
      currentTurnNumber.pending !== gameData.latestPending;
  }

 return gameData;
}

//------------------------------------------------------------------------------
// Returns the username for the given player role
gameSchema.methods.getPlayerRole = function(username) {
  switch (username) {
    case this.statePlayerName:
      return PlayerRoles.STATE;
    case this.terroristPlayerName:
      return PlayerRoles.TERRORIST;
  }
  return PlayerRoles.INVALID;
}

//------------------------------------------------------------------------------
// Returns the username for the given player role
gameSchema.methods.hasRoleSubmittedTurn = function(role, turn) {
  switch (role) {
    case PlayerRoles.STATE:
      return turn.statePlayer.pendingTurn !== null;
    case PlayerRoles.TERRORIST:
      return turn.terroristPlayer.pendingTurn !== null;
  }
  return false;
}

//------------------------------------------------------------------------------
// Get the turn data for the given role
gameSchema.methods.getTurnData = function(gameController, role, turnData) {
  var turn = this.getTurn(turnData.number);
  if (turn !== null) {
    var prevTurn = this.getPendingTurnData(this.getTurn(turn.currentTurnNumber - 1), role);
    if (turn !== null) {
      // If this turn was at the end, just modify it for the end and return it
      if (turn.phase === GamePhase.ENDGAME) {
        gameController.getEndGameState(turn, this.network);
      }
      else {
        // If we want the pending turn, then parse it from the saved string
        if (turnData.pending) {
          var pendingTurn = this.getPendingTurnData(turn, role);
          if (pendingTurn !== null) {
            prevTurn = turn;
            turn = pendingTurn;
            turn.viewingPending = true;
          }
        }

        // Modify the turn data based on which player we are
        switch (role) {
          case PlayerRoles.STATE:
            gameController.getStateGameState(turn, this.network);
            break;
          case PlayerRoles.TERRORIST:
            gameController.getTerroristGameState(turn, this.network);
            break;
        }
      }
    }

    // Run through the list of agents on the previous turn to tell our current
    // turn agents what they previously did...confusing, no?
    if (prevTurn !== null) {
      for (var agentIndex = 0; agentIndex < prevTurn.statePlayer.agents.length; ++agentIndex) {
        var previousAgent = prevTurn.statePlayer.agents[agentIndex];
        var currentAgent = turn.statePlayer.agents[SharedUtil.getIndexFromID(turn.statePlayer.agents, previousAgent.id)];
        currentAgent.previousStatus = previousAgent.status;
      }
    }
  }

  return turn;
}

//------------------------------------------------------------------------------
// Get the pending turn data from the given turn
gameSchema.methods.getPendingTurnData = function(turn, role) {
  if (turn !== null) {
    var submittedTurn = role === PlayerRoles.STATE ? turn.statePlayer.pendingTurn :
      turn.terroristPlayer.pendingTurn;
    if (submittedTurn) {
      var pendingTurn = JSON.parse(submittedTurn);
      if (role === PlayerRoles.STATE) {
        pendingTurn.statePlayer.pendingTurn = submittedTurn;
      }
      else {
        pendingTurn.terroristPlayer.pendingTurn = submittedTurn;
      }
      return pendingTurn;
    }
  }
  return null;
}

//------------------------------------------------------------------------------
var gameModel = mongoose.model('GameModel', gameSchema);
if (!gameModel) {
  log.error("Failed to create database model");
}

function getGameModel() {
  return gameModel;
}

//------------------------------------------------------------------------------
var rpcSchema = new Schema({
  rpcIndex: {type: Number, default: 0}
});

//------------------------------------------------------------------------------
var rpcModel = mongoose.model('RPCModel', rpcSchema);
if (!rpcModel) {
  log.error("Failed to create RPC model");
} else {
  rpcModel.count({}, function(err, count) {
    if (count < 1) {
      var row = new rpcModel({});
      row.save(function(err) {
        if (err) {
          log.error('failed to insert database entry for rpcIndex.');
          return;
        }
      });
    }
  });
}

//------------------------------------------------------------------------------
// Retrieves a new RPC index and passes it into
// the callback 'cb'.
function getRPC(cb) {
  rpcModel.findOneAndUpdate({}, {$inc: {rpcIndex: 1}}, {upsert: true}, function(err, rpcFound) {
    if (err) {
      log.error("Failed to find the rpc index.");
    }

    if (rpcFound) {
      cb(rpcFound.rpcIndex);
    }
  });
}

//------------------------------------------------------------------------------
// Chat
var gameChatSchema = new Schema({
  gameID: { type: mongoose.Schema.Types.ObjectId },
  entries : [chatSchema]
});

var chatModel = mongoose.model("ChatModel", gameChatSchema);
if (!chatModel) {
  log.error("Failed to create the chat model");
}

//------------------------------------------------------------------------------
function getChatModel() {
  return chatModel;
}

//------------------------------------------------------------------------------
// Stats
var statsModel = mongoose.model("Stats", statsScheme);
if (!chatModel) {
  log.error("Failed to create the stats model");
}

//------------------------------------------------------------------------------
function getStatsModel() {
  return statsModel;
}
