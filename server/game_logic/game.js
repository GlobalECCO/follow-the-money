/*******************************************************************************
 * The main game logic controller that manages the current game state
 ******************************************************************************/
var GamePhase = require('../../shared/game_phase.js').GamePhase;
var EndGameLogic = require('./end_game.js');
var NetworkLogic = require('./network.js');
var StateLogic = require('./state.js');
var TerroristLogic = require('./terrorist.js');

//------------------------------------------------------------------------------
// Setup the initial state of the game
this.initializeNewGame = function(gameState, network) {
  StateLogic.initializePlayer(gameState, network);
  TerroristLogic.initializePlayer(gameState, network);
};

//------------------------------------------------------------------------------
// Update the state of the game now that players have submitted their turns
this.updateGameState = function (gameState, network) {
  // Update the turn number
  ++gameState.currentTurnNumber;

  // Reset turn based stat tracking data
  StateLogic.resetStatValues(gameState, network);

  // Update the game state
  NetworkLogic.removeExpiredMoney(gameState);
  StateLogic.synchronizeGameState(gameState);
  TerroristLogic.synchronizeGameState(gameState);
  NetworkLogic.moveMoney(gameState, network);
  StateLogic.updateAgents(gameState);
  TerroristLogic.performMaintenance(gameState, network);

  // Check for the end of the game
  if (EndGameLogic.hasWinner(gameState, network)) {
    gameState.phase = GamePhase.ENDGAME;
  }

  return gameState.phase === GamePhase.ENDGAME;
};

//------------------------------------------------------------------------------
// Modify the game state for what the State can see
this.getStateGameState = function (gameState, network) {
  if (gameState !== null) {
    StateLogic.modifyGameState(gameState, network);
  }
};

//------------------------------------------------------------------------------
// Modify the game state for what the Terrorist can see
this.getTerroristGameState = function (gameState, network) {
  if (gameState !== null) {
    TerroristLogic.modifyGameState(gameState, network);
  }
};

//------------------------------------------------------------------------------
// Modify the game state for what the Terrorist can see
this.getEndGameState = function (gameState, network) {
  if (gameState !== null) {
    EndGameLogic.modifyGameState(gameState, network);
  }
};

//------------------------------------------------------------------------------
// Modify the network based on what the State player currently knows
this.getPartialNetwork = function (gameState, network) {
  if (gameState !== null) {
    return StateLogic.getPartialNetwork(gameState.statePlayer, network);
  }
  return null;
};

//------------------------------------------------------------------------------
// Get the player data relevant to the State player
this.getPlayerData = function (gameState) {
  return {
    stateTakenTurn: gameState.statePlayer.pendingTurn !== null,
    terroristTakenTurn: gameState.terroristPlayer.pendingTurn !== null
  }
};
