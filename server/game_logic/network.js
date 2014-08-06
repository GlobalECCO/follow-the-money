/*******************************************************************************
 * All game logic related to dealing with the money network
 ******************************************************************************/
var AgentStatus = require('../../shared/agent_status.js').AgentStatus;
var BalanceValues = require('../../shared/balance_values.js').BalanceValues;
var MoneyStatus = require('../../shared/money_status.js').MoneyStatus;
var NodeTypes = require('../../shared/node_types.js').NodeTypes;
var SharedUtil = require('../../shared/util_functions.js');
var Util = require('./util.js');
var BitArray = require('bitarray');

//------------------------------------------------------------------------------
// Remove any money that was frozen on the previous turn
this.removeExpiredMoney = function (gameState) {
  for (var moneyIndex = 0; moneyIndex < gameState.money.length; ++moneyIndex) {
    if (gameState.money[moneyIndex].status === MoneyStatus.FROZEN ||
        gameState.money[moneyIndex].status === MoneyStatus.DEPOSITED) {
      gameState.money.splice(moneyIndex, 1);
      --moneyIndex;
    }
  }
};

//------------------------------------------------------------------------------
// Move money from reserves to FUNDER node
this.moveMoneyFromReserves = function(gameState, amount) {
  for (var moneyToMove = 0; moneyToMove < amount; ++moneyToMove) {
    if (gameState.terroristPlayer.moneyReserve > 0) {
      --gameState.terroristPlayer.moneyReserve;
      var newMoney = { id: Util.getUniqueID(gameState), route: [], current: 0, amount: 1, status: MoneyStatus.NEW };
      gameState.money.push(newMoney);
    }
  }
};

//------------------------------------------------------------------------------
// Move money down the network one step
this.moveMoney = function (gameState, network) {
  if (network !== undefined) {
    moveMoneyDownRoutes(gameState, network);
    updateFakeMoney(gameState, network);
  }
  this.moveMoneyFromReserves(gameState, BalanceValues.TERRORIST_MONEY_PER_TURN);
};

//------------------------------------------------------------------------------
// Move money down routes
var moveMoneyDownRoutes = function(gameState, network) {
  for (var moneyIndex = 0; moneyIndex < gameState.money.length; ++moneyIndex) {
    var money = gameState.money[moneyIndex];
    // This is Fake money that has a chance to reveal the next node
    if (money.status === MoneyStatus.FAKE) {
      if (money.agent > -1) {
        ++gameState.followedFakeMoney;
        ++gameState.fakeMoneyFollowTrials;
        if (Util.shouldFollowFakeMoney(gameState.fakeMoneyFollowBits, gameState.fakeMoneyFollowTrials)) {
          ++gameState.movedFakedMoney;
          moveFakeMoneyDownChain(gameState, network, money);
        }
      }
    }
    // This is regular money and should move like regular money does
    else if (money.status != MoneyStatus.NEW){
      // First make sure it's at the end of its current chain
      moveMoneyDownRoute(gameState, network, money);
      // Then increase its wait time by one turn
      ++money.waitTime;
      // Now see if it moved down the chain at all
      moveMoneyDownRoute(gameState, network, money);
    }
  }
};

//------------------------------------------------------------------------------
// Move money down routes
var moveMoneyDownRoute = function(gameState, network, money) {
  // Reset any money that have finished their courier delays
  if (money.courierDelay > 0) {
    if (money.waitTime >= money.courierDelay) {
      money.waitTime = 0;
      money.courierDelay = 0;
    }
  }
  else {
    // We are currently traveling down a link
    if (money.status === MoneyStatus.MOVING) {
      var linkIndex = SharedUtil.getIndexFromID(network.links, money.current);
      if (linkIndex > -1) {
        if (money.courierDelay === 0 && money.waitTime >= network.links[linkIndex].travelTime) {
          // We reached the end of the link
          moveMoneyToDestinationNode(gameState, network, money);
        }
      }
    }
    // We are currently waiting on a node
    else if (money.status === MoneyStatus.WAITING) {
      var nodeIndex = SharedUtil.getIndexFromID(network.nodes, money.current);
      if (nodeIndex > -1) {
        if (money.waitTime >= network.nodes[nodeIndex].holdTime) {
          // We've waited long enough on this node, so move on
          moveMoneyToNextLink(gameState, network, money);
        }
      }
    }
  }
};

//------------------------------------------------------------------------------
// Move the money to the node at the end of the current link
var moveMoneyToDestinationNode = function(gameState, network, money) {
  // Move to the next node
  var previousLinkID = money.current;
  var previousLinkIndex = SharedUtil.getIndexFromID(network.links, previousLinkID);
  money.previousRoute.push(previousLinkID);
  money.current = network.links[previousLinkIndex].nodes.end;
  money.waitTime = 0;
  money.status = MoneyStatus.WAITING;
  money.courierHired = false;
  money.courierLocked = false;

  // If Agent is following it, move Agent with money
  var moneyDetectable = true;
  if (money.agent > -1) {
    // Check if the agent is actually following the money
    var agent = gameState.statePlayer.agents[SharedUtil.getIndexFromID(gameState.statePlayer.agents, money.agent)];
    if (agent.status === AgentStatus.FOLLOWING) {
      moneyDetectable = false;
      agent.location = money.current;
      // Reveal this link and node to the State if they didn't know about it
      if (!Util.isIndexInList(previousLinkID, gameState.statePlayer.knownLinks)) {
        gameState.statePlayer.knownLinks.push(previousLinkID);
        gameState.statePlayer.newlyDiscoveredLinks.push(previousLinkID);
      }
      if (!Util.isIndexInList(money.current, gameState.statePlayer.knownNodes)) {
        gameState.statePlayer.knownNodes.push(money.current);
        gameState.statePlayer.newlyDiscoveredNodes.push(money.current);
      }

      // If this money was previously on a Hawala node, then the agent stops
      // following it
      var previousNodeID = network.links[previousLinkIndex].nodes.start;
      var previousNodeIndex = SharedUtil.getIndexFromID(network.nodes, previousNodeID);
      if (network.nodes[previousNodeIndex].type === NodeTypes.HAWALA) {
        money.agent = -1;
        moneyDetectable = true;
      }
    }
  }

  // Check if the money was detected
  if (moneyDetectable && isMoneyDetected(gameState, network, money)) {
    money.status = MoneyStatus.SPOTTED;
  }

  // Try to move further down the route
  moveMoneyDownRoute(gameState, network, money);
};

//------------------------------------------------------------------------------
// Check to see if this money was detected
var isMoneyDetected = function(gameState, network, money) {
  // Money on an end node can't be spotted
  var node = network.nodes[SharedUtil.getIndexFromID(network.nodes, money.current)];
  if (node.type !== NodeTypes.LEADER && node.type !== NodeTypes.TERRORIST) {
    // This can only be spotted if there are agents focusing on finding finances
    for (var agentIndex = 0; agentIndex < gameState.statePlayer.agents.length; ++agentIndex) {
      if (gameState.statePlayer.agents[agentIndex].location === money.current &&
          gameState.statePlayer.agents[agentIndex].status === AgentStatus.FOCUSING) {
        return true;
      }
    }
  }
  return false;
};

//------------------------------------------------------------------------------
// Move the money to the next link on its route if one exists
var moveMoneyToNextLink = function(gameState, network, money) {
  if (money.route.length > 0) {
    money.current = money.route.splice(0, 1)[0];
    money.waitTime = 0;
    money.status = MoneyStatus.MOVING;
  }
  else {
    var nodeIndex = SharedUtil.getIndexFromID(network.nodes, money.current);
    if (gameState.terroristPlayer.balances[nodeIndex] !== null && gameState.terroristPlayer.balances[nodeIndex] >= 0) {
      gameState.terroristPlayer.balances[nodeIndex] += money.amount;
    }
    money.status = MoneyStatus.DEPOSITED;

    // If there is an agent on this node, then mark this money as tracked
    for (var agentIndex = 0; agentIndex < gameState.statePlayer.agents.length; ++agentIndex) {
      if (gameState.statePlayer.agents[agentIndex].location === money.current &&
          gameState.statePlayer.trackedMoney[money.current] !== null) {
        gameState.statePlayer.trackedMoney[money.current] += money.amount;
        gameState.statePlayer.newlyTrackedMoney[money.current] += money.amount;
        break;
      }
    }
  }

  // Try to move further down the route
  moveMoneyDownRoute(gameState, network, money);
};

//------------------------------------------------------------------------------
// Fake money is moving down the chain to the next node
var moveFakeMoneyDownChain = function(gameState, network, money) {
  // Pick a random link to travel down
  var currentNode = network.nodes[SharedUtil.getIndexFromID(network.nodes, money.current)];
  var linkIndex = Util.randRangeInt(0, currentNode.nextLinks.length - 1);
  var nextLink = network.links[SharedUtil.getIndexFromID(network.links, currentNode.nextLinks[linkIndex])];

  // Make sure we don't travel to an end node because Fake money should never
  // reveal the terrorist nodes
  var nextNode = network.nodes[SharedUtil.getIndexFromID(network.nodes, nextLink.nodes.end)];
  if (nextNode.type !== NodeTypes.LEADER && nextNode.type !== NodeTypes.TERRORIST) {
    money.current = nextLink.id;
    moveMoneyToDestinationNode(gameState, network, money);
    // Ensure this has the fake status so it gets removed after this
    money.status = MoneyStatus.FAKE;
  }
};

//------------------------------------------------------------------------------
// Update the fake money on the network
var updateFakeMoney = function(gameState, network) {
  // Remove all previously fake money objects
  for (var moneyIndex = 0; moneyIndex < gameState.money.length; ++moneyIndex) {
    if (gameState.money[moneyIndex].status === MoneyStatus.FAKE) {
      gameState.money.splice(moneyIndex, 1);
      --moneyIndex;
    }
  }

  // Create new fake money objects
  gameState.generatedFakeMoney = 0;
  for (var nodeIndex = 0; nodeIndex < network.nodes.length; ++nodeIndex) {
    var node = network.nodes[nodeIndex];
    // Check if the node has any agents focusing here if this isn't an end node
    if (node.type !== NodeTypes.LEADER && node.type !== NodeTypes.TERRORIST) {
      for (var agentIndex = 0; agentIndex < gameState.statePlayer.agents.length; ++agentIndex) {
        // If there is at least one agent focusing, then potentially add fake money here
        var agent = gameState.statePlayer.agents[agentIndex];
        if (agent.status === AgentStatus.FOCUSING && agent.location === node.id) {
          for (var moneyCount = 0; moneyCount < BalanceValues.FAKE_MONEY_MAX_AMOUNT; ++moneyCount) {
            // The node has a random chance to generate fake money a set number of times
            if (Util.randRangeInt(1, 100) <= node.fakeLeadProbability) {
              var id = Util.getUniqueID(gameState);
              gameState.money.push(createFakeMoney(id, network, node, gameState.currentTurnNumber));
              ++gameState.generatedFakeMoney;
              ++gameState.totalFakeMoney;
            }
          }
          break;
        }
      }
    }
  }
};

//------------------------------------------------------------------------------
// Create a fake money object
var createFakeMoney = function(id, network, node, turnNumber) {
  var money = { id: id, route: [], current: node.id };
  money.waitTime = node.holdTime;

  // Figure out if this is a small, medium, or large amount of money
  var sizeBucket = Util.randRangeInt(1, 100);
  if (sizeBucket <= BalanceValues.FAKE_MONEY_SMALL_MONEY_CHANCE) {
    // This is a small amount of money
    money.amount = Util.randRangeInt(BalanceValues.FAKE_MONEY_SMALL_AMOUNT_MIN, BalanceValues.FAKE_MONEY_SMALL_AMOUNT_MAX);
  }
  else if (sizeBucket <= BalanceValues.FAKE_MONEY_SMALL_MONEY_CHANCE + BalanceValues.FAKE_MONEY_MEDIUM_MONEY_CHANCE) {
    // This is a medium amount of money
    money.amount = Util.randRangeInt(BalanceValues.FAKE_MONEY_MEDIUM_AMOUNT_MIN, BalanceValues.FAKE_MONEY_MEDIUM_AMOUNT_MAX);
  }
  else {
    // This is a large amount of money
    money.amount = Util.randRangeInt(BalanceValues.FAKE_MONEY_LARGE_AMOUNT_MIN, BalanceValues.FAKE_MONEY_LARGE_AMOUNT_MAX);
  }
  money.amount = Math.min(money.amount, BalanceValues.TERRORIST_STARTING_BALANCE + (turnNumber - 1) * BalanceValues.TERRORIST_MONEY_PER_TURN);

  // Apply a chance of faking a courier transaction depending on the cluster group
  if (node.type === NodeTypes.BANK) {
    for (var courierChance = 0; money.amount > BalanceValues.TERRORIST_COURIER_COST && courierChance < node.cluster; ++courierChance) {
      if (Util.randRangeInt(1, 100) <= BalanceValues.FAKE_MONEY_COURIER_CHANCE) {
        money.amount -= BalanceValues.TERRORIST_COURIER_COST;
      }
    }
  }

  money.status = MoneyStatus.FAKE;
  money.previousRoute = generatePreviousRoute(network, node);
  return money;
};

//------------------------------------------------------------------------------
// Create a fake money object
var generatePreviousRoute = function(network, node) {
  var previousRoute = [];
  while (node.type !== NodeTypes.FUNDER) {
    var linkIndex = Util.randRangeInt(0, node.prevLinks.length - 1);
    var nextLink = network.links[SharedUtil.getIndexFromID(network.links, node.prevLinks[linkIndex])];
    previousRoute.unshift(nextLink.id);
    node = network.nodes[SharedUtil.getIndexFromID(network.nodes, nextLink.nodes.start)];
  }
  return previousRoute;
};
