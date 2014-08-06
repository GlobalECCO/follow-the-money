/*******************************************************************************
 * All game logic related to updating Terrorist related game state
 ******************************************************************************/
var BalanceValues = require('../../shared/balance_values.js').BalanceValues;
var MoneyStatus = require('../../shared/money_status.js').MoneyStatus;
var NetworkLogic = require('./network.js');
var NodeTypes = require('../../shared/node_types.js').NodeTypes;
var SharedUtil = require('../../shared/util_functions.js');
var Util = require('./util.js');

//------------------------------------------------------------------------------
// Setup the Terrorist player
this.initializePlayer = function (gameState, network) {
  // Move some money from the Terrorist's reserves
  NetworkLogic.moveMoneyFromReserves(gameState, BalanceValues.TERRORIST_STARTING_BALANCE);

  for (var nodeIndex = 0; nodeIndex < network.nodes.length; ++nodeIndex) {
    var node = network.nodes[nodeIndex];
    if (node.type === NodeTypes.LEADER || node.type === NodeTypes.TERRORIST) {
      gameState.terroristPlayer.balances[nodeIndex] = BalanceValues.TERRORIST_STARTING_NODE_RESERVES;
      gameState.terroristPlayer.lastTurn[nodeIndex] = 0;
    }
  }
};

//------------------------------------------------------------------------------
// Modify the game state for what the Terrorist can see
this.modifyGameState = function (gameState, network) {
  for (var moneyIndex = 0; moneyIndex < gameState.money.length; ++moneyIndex) {
    // Don't let the terrorist know money has been spotted
    var money = gameState.money[moneyIndex];
    // Move any money at the beginning of a link to its previous node
    if (money.status === MoneyStatus.MOVING && (money.courierDelay > 0 || money.waitTime === 0)) {
      money.status = MoneyStatus.WAITING;
      money.route.unshift(money.current);
      money.current = network.links[SharedUtil.getIndexFromID(network.links, money.current)].nodes.start;
    }
    // Remove any fake money from the list
    else if (money.status === MoneyStatus.FAKE) {
      gameState.money.splice(moneyIndex, 1);
      --moneyIndex;
    }
  }

  // Wipe out any State data so the Terrorist can't cheat
  if (gameState.statePlayer.pendingTurn !== null) {
    gameState.statePlayer.pendingTurn = '';
  }
  gameState.statePlayer.knownNodes = [];
  gameState.statePlayer.knownLinks = [];
  gameState.statePlayer.trackedMoney = [];
};

//------------------------------------------------------------------------------
// Update the state of the game based on what the Terrorist did
this.synchronizeGameState = function (gameState) {
  // Get the JSON representing what the State thinks the game state is
  var terroristGameState = JSON.parse(gameState.terroristPlayer.pendingTurn);

  // Change the money's routes to what the Terrorist set them to
  for (var moneyIndex = 0; moneyIndex < gameState.money.length; ++moneyIndex) {
    var money = gameState.money[moneyIndex];
    var terroristMoneyIndex = SharedUtil.getIndexFromID(terroristGameState.money, money.id);
    if (terroristMoneyIndex > -1 && !money.courierHired) {
      var terroristMoney = terroristGameState.money[terroristMoneyIndex];
      if (terroristMoney.courierHired) {
        // If this had an agent following it, mark it as a node we lost a lead on
        if (money.agent > -1 && !Util.isIndexInList(terroristMoney.current, gameState.statePlayer.lostLeadNodes)) {
          gameState.statePlayer.lostLeadNodes.push(terroristMoney.current);
        }

        // If a courier was hired, then stop any agent from following it and
        // add the courier costs
        money.courierHired = true;
        money.courierLocked = true;
        money.agent = -1;
        money.amount = terroristMoney.amount;
        money.courierDelay = terroristMoney.courierDelay;
      }
      if (!isSameRoute(money.route, terroristMoney.route)) {
        // This money's route has changed
        money.route = terroristMoney.route;

        // If this money was new, set its new amount and set it moving down the chain
        if (money.status === MoneyStatus.NEW) {
          money.amount = terroristMoney.amount;
          money.status = MoneyStatus.WAITING;
        }
        // If this money just started on a link, then make sure its current location matches
        // where the player re-routed it
        else if (money.status === MoneyStatus.MOVING && money.waitTime === 0) {
          money.current = money.route.splice(0, 1)[0];
        }
      }
    }
    else if (terroristMoneyIndex === -1 && money.status !== MoneyStatus.FAKE){
      // The money got combined into another money object on the client
      gameState.money.splice(moneyIndex, 1);
      --moneyIndex;
    }
  }
};

//------------------------------------------------------------------------------
// Perform terrorist cell maintenance
this.performMaintenance = function (gameState, network) {
  // If maintenance turn has happened, lower all terrorist reserves
  ++gameState.terroristPlayer.maintenanceTime;
  if (gameState.terroristPlayer.maintenanceTime >= BalanceValues.TERRORIST_TIME_TO_MAINTENANCE) {
    gameState.terroristPlayer.maintenanceTime = 0;
    for (var nodeIndex = 0; nodeIndex < gameState.terroristPlayer.balances.length; ++nodeIndex) {
      var balance = gameState.terroristPlayer.balances[nodeIndex];
      if (balance !== null && balance >= 0) {
        balance -= BalanceValues.TERRORIST_MAINTENANCE_COSTS;
        gameState.terroristPlayer.balances[nodeIndex] = balance;
        if (balance < 0) {
          gameState.terroristPlayer.lastTurn[nodeIndex] = gameState.currentTurnNumber;
        }
      }
    }
  }
};

//-----------------------------------------------------------------------------
// Returns the index of the first money with the same route as the given money
var isSameRoute = function (route1, route2) {
  if (route1.length !== route2.length) {
    return false;
  }
  for (var index = 0; index < route1.length; ++index) {
    if (route1[index] !== route2[index]) {
      return false;
    }
  }
  return true;
};

