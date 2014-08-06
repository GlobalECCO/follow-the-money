/*******************************************************************************
 * All game logic related to determining a winner/loser
 ******************************************************************************/
var BalanceValues = require('../../shared/balance_values.js').BalanceValues;
var GameEndReason = require('../../shared/game_end_reasons.js').GameEndReason;
var MoneyStatus = require('../../shared/money_status.js').MoneyStatus;
var NodeTypes = require('../../shared/node_types.js').NodeTypes;
var PlayerRoles = require('../../shared/player_roles.js').PlayerRoles;
var SharedUtil = require('../../shared/util_functions.js');

//------------------------------------------------------------------------------
// Check if State or Terrorist player has won or lost
this.hasWinner = function (gameState, network) {
  checkTerroristEndGameState(gameState, network);
  checkStateEndGameState(gameState, network);
  return gameState.gameEndReason !== GameEndReason.UNDECIDED;
};

//------------------------------------------------------------------------------
// Modify the game state for what players see in the end game state
this.modifyGameState = function (gameState, network) {
  for (var moneyIndex = 0; moneyIndex < gameState.money.length; ++moneyIndex) {
    // Don't let the terrorist know money has been spotted
    var money = gameState.money[moneyIndex];
    if (money.status === MoneyStatus.SPOTTED) {
      money.status = MoneyStatus.WAITING;
    }
    // Move any money at the beginning of a link to its previous node
    else if (money.status === MoneyStatus.MOVING && money.waitTime === 0) {
      money.status = MoneyStatus.WAITING;
      money.route.unshift(money.current);
      money.current = network.links[SharedUtil.getIndexFromID(network.links, money.current)].nodes.start;
    }
  }
};

//------------------------------------------------------------------------------
// Check if the Terrorists end the game with a win or loss
var checkTerroristEndGameState = function (gameState, network) {
  // Calculate how much money the Terrorist has towards his goal
  var moneyTowardsGoal = 0;
  var remainingMinions = 0;
  for (var nodeIndex = 0; nodeIndex < network.nodes.length; ++nodeIndex) {
    if (network.nodes[nodeIndex].type === NodeTypes.LEADER) {
      moneyTowardsGoal = gameState.terroristPlayer.balances[nodeIndex];
    }
    else if (network.nodes[nodeIndex].type === NodeTypes.TERRORIST &&
             gameState.terroristPlayer.balances[nodeIndex] >= 0) {
      ++remainingMinions;
    }
  }

  // If the terrorist has achieved his funding goal, he wins
  if (moneyTowardsGoal >= BalanceValues.TERRORIST_MONEY_GOAL) {
    gameState.gameEndReason = GameEndReason.TERRORIST_FUNDED;
  }
  // If the leader is broke, then the terrorist loses
  else if (moneyTowardsGoal < 0) {
    gameState.gameEndReason = GameEndReason.TERRORIST_LEADER_BROKE;
  }
  // If all the minions have been eliminated, then the terrorist loses
  else if (remainingMinions < BalanceValues.NETWORK_TERRORIST_COUNT - 1) {
    gameState.gameEndReason = GameEndReason.TERRORIST_MINIONS_BROKE;
  }
  // If the terrorist does not have enough money to fulfill the goal, he loses
  else {
    // Calculate how much money the Terrorist has left and how much he has
    // heading towards the leader
    var moneyLeft = gameState.terroristPlayer.moneyReserve + getRemainingMoney(gameState.money);
    if (moneyLeft < BalanceValues.TERRORIST_MONEY_GOAL - moneyTowardsGoal) {
      gameState.gameEndReason = GameEndReason.TERRORIST_RAN_OUT_OF_MONEY;
    }
  }
};

//------------------------------------------------------------------------------
// Return the total amount of money waiting to be moved or en route
var getRemainingMoney = function (moneyList) {
  var total = 0;
  for (var moneyIndex = 0; moneyIndex < moneyList.length; ++moneyIndex) {
    // Make sure this money is headed to our intended destination
    var money = moneyList[moneyIndex];
    if (money.status !== MoneyStatus.DEPOSITED && money.status !== MoneyStatus.FROZEN &&
        money.status !== MoneyStatus.FAKE) {
      total += money.amount;
    }
  }
  return total;
};

//------------------------------------------------------------------------------
// Check if the State end the game with a win or loss
var checkStateEndGameState = function (gameState, network) {
  if (gameState.accusedNode !== undefined) {
    // If the blue player successfully picks the Terrorist leader, he wins
    if (network.nodes[SharedUtil.getIndexFromID(network.nodes, gameState.accusedNode)].type === NodeTypes.LEADER) {
      gameState.gameEndReason = GameEndReason.STATE_CHOSE_WISELY;
    }
    // Otherwise, he loses
    else {
      gameState.gameEndReason = GameEndReason.STATE_CHOSE_POORLY;
    }
  }
};
