/*******************************************************************************
 * Any util functions that both the client and server need access to
 ******************************************************************************/
//------------------------------------------------------------------------------
// Return the index of the list item with the given ID
this.getIndexFromID = function (list, id) {
  for (var itemIndex = 0; itemIndex < list.length; ++itemIndex) {
    if (list[itemIndex] !== null && list[itemIndex].id === id) {
      return itemIndex;
    }
  }
  return -1;
}

//------------------------------------------------------------------------------
// Make a deep copy object of the given game turn object
this.copyTurn = function(turnToCopy) {
  var newTurn = {};

  copyTurnBasicData(turnToCopy, newTurn);
  copyTurnStateData(turnToCopy.statePlayer, newTurn.statePlayer);
  copyTurnTerroristData(turnToCopy.terroristPlayer, newTurn.terroristPlayer);
  copyTurnMoneyData(turnToCopy.money, newTurn.money);

  return newTurn;
};

//------------------------------------------------------------------------------
// Copy the game turn's basic data structures
var copyTurnBasicData = function(copyFrom, copyTo) {
  copyTo.phase = copyFrom.phase;
  copyTo.statePlayer = { agents: [], knownNodes: [], knownLinks: [], trackedMoney: [], lostLeadNodes: [], newlyTrackedMoney: [], newlyDiscoveredNodes: [], newlyDiscoveredLinks: []};
  copyTo.terroristPlayer = { balances: [], lastTurn: [] };
  copyTo.money = [];
  copyTo.currentTurnNumber = copyFrom.currentTurnNumber;
  copyTo.viewingPending = copyFrom.viewingPending;
  copyTo.isGameOver = copyFrom.isGameOver;
  copyTo.isPlayback = copyFrom.isPlayback;
  copyTo.gameEndReason = copyFrom.gameEndReason;
  copyTo.uniqueID = copyFrom.uniqueID;
  copyTo.followedFakeMoney = copyFrom.followedFakeMoney;
  copyTo.movedFakedMoney = copyFrom.movedFakedMoney;
  copyTo.generatedFakeMoney = copyFrom.generatedFakeMoney;
  copyTo.totalFakeMoney = copyFrom.totalFakeMoney;
}

//------------------------------------------------------------------------------
// Copy the game turn's state player data
var copyTurnStateData = function(copyFrom, copyTo) {
  var nodeIndex;
  copyTo.pendingTurn = copyFrom.pendingTurn;
  for (var agentIndex = 0; agentIndex < copyFrom.agents.length; ++agentIndex) {
    // Copy each Agent individually
    var agentToCopy = copyFrom.agents[agentIndex];
    var copiedAgent = {
      id: agentToCopy.id,
      location: agentToCopy.location,
      detectionRate: agentToCopy.detectionRate,
      status: agentToCopy.status,
      previousStatus: agentToCopy.previousStatus,
      timeFreezing: agentToCopy.timeFreezing
    };
    copyTo.agents.push(copiedAgent);
  }
  // Copy the known nodes
  for (nodeIndex = 0; nodeIndex < copyFrom.knownNodes.length; ++nodeIndex) {
    copyTo.knownNodes.push(copyFrom.knownNodes[nodeIndex]);
  }
  // Copy the known links
  for (var linkIndex = 0; linkIndex < copyFrom.knownLinks.length; ++linkIndex) {
    copyTo.knownLinks.push(copyFrom.knownLinks[linkIndex]);
  }
  // Copy the tracked money
  for (var moneyIndex = 0; moneyIndex < copyFrom.trackedMoney.length; ++moneyIndex) {
    copyTo.trackedMoney.push(copyFrom.trackedMoney[moneyIndex]);
  }
  // Copy the lost leads data
  for (nodeIndex = 0; nodeIndex < copyFrom.lostLeadNodes.length; ++nodeIndex) {
    copyTo.lostLeadNodes.push(copyFrom.lostLeadNodes[nodeIndex]);
  }
  // Copy the newly tracked money
  for (nodeIndex = 0; nodeIndex < copyFrom.newlyTrackedMoney.length; ++nodeIndex) {
    copyTo.newlyTrackedMoney.push(copyFrom.newlyTrackedMoney[nodeIndex]);
  }
  // Copy the newly discovered nodes
  for (nodeIndex = 0; nodeIndex < copyFrom.newlyDiscoveredNodes.length; ++nodeIndex) {
    copyTo.newlyDiscoveredNodes.push(copyFrom.newlyDiscoveredNodes[nodeIndex]);
  }
  // Copy the newly discovered links
  for (nodeIndex = 0; nodeIndex < copyFrom.newlyDiscoveredLinks.length; ++nodeIndex) {
    copyTo.newlyDiscoveredLinks.push(copyFrom.newlyDiscoveredLinks[nodeIndex]);
  }
  copyTo.amountOfFrozenRealMoney = copyFrom.amountOfFrozenRealMoney;
  copyTo.amountOfFrozenFakeMoney = copyFrom.amountOfFrozenFakeMoney;
}

//------------------------------------------------------------------------------
// Copy the game turn's terrorist player data
var copyTurnTerroristData = function(copyFrom, copyTo) {
  copyTo.pendingTurn = copyFrom.pendingTurn;
  copyTo.moneyReserve = copyFrom.moneyReserve;
  copyTo.maintenanceTime = copyFrom.maintenanceTime;
  // Copy the balances
  for (var balanceIndex = 0; balanceIndex < copyFrom.balances.length; ++balanceIndex) {
    copyTo.balances.push(copyFrom.balances[balanceIndex]);
  }
  // Copy the last turn data
  for (var lastTurnIndex = 0; lastTurnIndex < copyFrom.lastTurn.length; ++lastTurnIndex) {
    copyTo.lastTurn.push(copyFrom.lastTurn[lastTurnIndex]);
  }
}

//------------------------------------------------------------------------------
// Copy the game turn's money data
var copyTurnMoneyData = function(copyFrom, copyTo) {
  for (var moneyIndex = 0; moneyIndex < copyFrom.length; ++moneyIndex) {
    // Copy each Money Object individually
    var moneyToCopy = copyFrom[moneyIndex];
    var copiedMoney = {
      id: moneyToCopy.id,
      route: [],
      previousRoute: [],
      current: moneyToCopy.current,
      amount: moneyToCopy.amount,
      waitTime: moneyToCopy.waitTime,
      courierDelay: moneyToCopy.courierDelay,
      agent: moneyToCopy.agent,
      status: moneyToCopy.status,
      courierHired: moneyToCopy.courierHired,
      courierLocked: moneyToCopy.courierLocked,
      destination: moneyToCopy.destination,
      totalTurnsOfRoute: moneyToCopy.totalTurnsOfRoute,
      turnsTraveledOnRoute: moneyToCopy.turnsTraveledOnRoute,
    };
    for (var routeIndex = 0; routeIndex < moneyToCopy.route.length; ++routeIndex) {
      copiedMoney.route.push(moneyToCopy.route[routeIndex]);
    }
    for (var previousRouteIndex = 0; previousRouteIndex < moneyToCopy.previousRoute.length; ++previousRouteIndex) {
      copiedMoney.previousRoute.push(moneyToCopy.previousRoute[previousRouteIndex]);
    }
    copyTo.push(copiedMoney);
  }
}
