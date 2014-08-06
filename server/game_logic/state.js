/*******************************************************************************
 * All game logic related to updating State related game state
 ******************************************************************************/
var AgentStatus = require('../../shared/agent_status.js').AgentStatus;
var BalanceValues = require('../../shared/balance_values.js').BalanceValues;
var MoneyStatus = require('../../shared/money_status.js').MoneyStatus;
var NodeTypes = require('../../shared/node_types.js').NodeTypes;
var SharedUtil = require('../../shared/util_functions.js');
var Util = require('./util.js');
var log = require('../log').log;

//------------------------------------------------------------------------------
// Setup the State player
this.initializePlayer = function (gameState, network) {
  initializePartialNetwork(gameState, network);
  var startingLocation = 0;

  //little function to get the next valid node, from the given knownNodes
  var getNextValidKnownNode = function (knownNodes, nodes) {
    while (true) {
      startingLocation++;
      if (startingLocation >= knownNodes.length) {
        startingLocation = 0;
      }
      var nodeIdx = SharedUtil.getIndexFromID(nodes, knownNodes[startingLocation]);

      if (nodes[nodeIdx].type === NodeTypes.BANK ||
          nodes[nodeIdx].type === NodeTypes.HAWALA) {
        return nodes[nodeIdx].id;
      }
    }
  };

  // Setup the initial list of agents the State player gets
  for (var agentCount = 0; agentCount < BalanceValues.STATE_AGENT_COUNT; ++agentCount) {
    gameState.statePlayer.agents.push({
      id: Util.getUniqueID(gameState),
      //randomly assign agents to Nodes
      location: getNextValidKnownNode(gameState.statePlayer.knownNodes, network.nodes)
    });
  }

  for (var nodeIndex = 0; nodeIndex < network.nodes.length; ++nodeIndex) {
    var node = network.nodes[nodeIndex];
    if (node.type === NodeTypes.LEADER || node.type === NodeTypes.TERRORIST) {
      gameState.statePlayer.trackedMoney[nodeIndex] = 0;
    }
  }

  // Automatically set the state player's first turn as pending
  gameState.statePlayer.pendingTurn = JSON.stringify(gameState);
};

//------------------------------------------------------------------------------
// Reset the State based stat values for this turn
this.resetStatValues = function (gameState, network) {
  gameState.statePlayer.lostLeadNodes = [];
  gameState.statePlayer.newlyTrackedMoney = [];
  for (var nodeIndex = 0; nodeIndex < network.nodes.length; ++nodeIndex) {
    gameState.statePlayer.newlyTrackedMoney[nodeIndex] = 0;
  }
  gameState.statePlayer.newlyDiscoveredNodes = [];
  gameState.statePlayer.newlyDiscoveredLinks = [];
}

//------------------------------------------------------------------------------
// Modify the game state for what the State can see
this.modifyGameState = function (gameState, network) {
  // Wipe out any Terrorist Data that we shouldn't see
  if (gameState.terroristPlayer.pendingTurn !== null) {
    gameState.terroristPlayer.pendingTurn = '';
  }
  gameState.terroristPlayer.moneyReserve = -1;
  gameState.terroristPlayer.maintenanceTime = -1;
  for (var balanceIndex = 0; balanceIndex < gameState.terroristPlayer.balances.length; ++balanceIndex) {
    if (gameState.terroristPlayer.balances[balanceIndex] < 0) {
      gameState.terroristPlayer.balances[balanceIndex] = -1;
    }
    else {
      gameState.terroristPlayer.balances[balanceIndex] = undefined;
    }
  }

  // Remove money and links the State player doesn't know about yet
  disguiseMoney(gameState.money, network, gameState.statePlayer.knownLinks);
};

//------------------------------------------------------------------------------
// Setup the State player
this.getPartialNetwork = function (statePlayer, network) {
  var partialNetwork = { nodes: [], links: [] };

  // Add the known nodes and nulls for unknown nodes
  for (var nodeIndex = 0; nodeIndex < network.nodes.length; ++nodeIndex) {

    //copy previously known nodes
    if (Util.isIndexInList(nodeIndex, statePlayer.knownNodes)) {
      partialNetwork.nodes[nodeIndex] = network.nodes[nodeIndex].toJSON(); //"deep" copy the node

      //Mask the type if it's the LEADER
      if (partialNetwork.nodes[nodeIndex].type === NodeTypes.LEADER) {
        partialNetwork.nodes[nodeIndex].type = NodeTypes.TERRORIST;
      }
    }
    // If we don't know about the LEADER or TERRORIST, add them in to the partial network too
    else if (network.nodes[nodeIndex].type === NodeTypes.LEADER ||
             network.nodes[nodeIndex].type === NodeTypes.TERRORIST) {
      partialNetwork.nodes[nodeIndex] = network.nodes[nodeIndex].toJSON(); //"deep" copy the node

      //change the node type to show that it's not known yet
      partialNetwork.nodes[nodeIndex].type = NodeTypes.UNSUB;
    }
  }

  // Add the known links and nulls for unknown links
  for (var linkIndex = 0; linkIndex < network.links.length; ++linkIndex) {
    if (Util.isIndexInList(linkIndex, statePlayer.knownLinks)) {
      partialNetwork.links[linkIndex] = network.links[linkIndex];
    }
  }
  return partialNetwork;
};

//------------------------------------------------------------------------------
// Update the state of the game based on what the State did
this.synchronizeGameState = function (gameState) {
  // Get the JSON representing what the State thinks the game state is
  var stateGameState = JSON.parse(gameState.statePlayer.pendingTurn);

  // Process all money the State interacted with
  for (var moneyIndex = 0; moneyIndex < stateGameState.money.length; ++moneyIndex) {
    var money = SharedUtil.getIndexFromID(gameState.money, stateGameState.money[moneyIndex].id);
    if (money > -1) {
      // If this was fake money, then set any agent on the money
      if (gameState.money[money].status === MoneyStatus.FAKE) {
        gameState.money[money].agent = stateGameState.money[moneyIndex].agent;

        //Keep track of how much fake money the State is freezing
        if (stateGameState.money[moneyIndex].status === MoneyStatus.FREEZING) {
          gameState.statePlayer.amountOfFrozenFakeMoney += gameState.money[money].amount;
        }
      }
      // If the money was spotted, then the State player had to take action,
      // so synchronize the money state
      else if (gameState.money[money].status === MoneyStatus.SPOTTED) {
        gameState.money[money].agent = stateGameState.money[moneyIndex].agent;
        gameState.money[money].status = stateGameState.money[moneyIndex].status;

        // If the money is still spotted, then the State player gave up their
        // chance to deal with the money, so just send it on its way
        if (gameState.money[money].status === MoneyStatus.SPOTTED) {
          gameState.money[money].status = MoneyStatus.WAITING;
        }
      }
      // If the state had an agent following it and now they froze it, synchronize it
      else if (gameState.money[money].agent > -1 && stateGameState.money[moneyIndex].status === MoneyStatus.FREEZING) {
        gameState.money[money].current = stateGameState.money[moneyIndex].current;
        gameState.money[money].status = stateGameState.money[moneyIndex].status;
      }
      // If the state had an agent following it and now they don't, synchronize it
      else if (gameState.money[money].agent > -1 && stateGameState.money[moneyIndex].agent === -1) {
        gameState.money[money].agent = stateGameState.money[moneyIndex].agent;
      }

      // If the State froze the money, then make sure it's frozen
      if (gameState.money[money].status === MoneyStatus.FREEZING) {
        Util.freezeRealMoneyObj(gameState.money[money], gameState.statePlayer);
      }
    }
  }

  // Synchronize the agent information
  for (var agentIndex = 0; agentIndex < stateGameState.statePlayer.agents.length; ++agentIndex) {
    var selectedAgent = stateGameState.statePlayer.agents[agentIndex];
    var selectedAgentIndex = SharedUtil.getIndexFromID(gameState.statePlayer.agents, selectedAgent.id);
    if (selectedAgentIndex > -1) {
      var agent = gameState.statePlayer.agents[selectedAgentIndex];
      // If the agent was moved client side, then move it
      agent.location = selectedAgent.location;
      // If he just started freezing money, then change him to frozen
      if (selectedAgent.status === AgentStatus.FREEZING) {
        agent.status = AgentStatus.INCAPACITATED;
      }
      // Otherwise just set his status to whatever the client said it is
      else if (agent.status !== selectedAgent.status) {
        agent.status = selectedAgent.status;
        // If the agent is locking the node down, then freeze any money at this
        // node or its subsequent links
        if (agent.status === AgentStatus.LOCKDOWN) {
          for (var moneyIndex = 0; moneyIndex < stateGameState.money.length; ++moneyIndex) {
            if (stateGameState.money[moneyIndex].current === agent.location) {
              var lockedMoneyIndex = SharedUtil.getIndexFromID(gameState.money, stateGameState.money[moneyIndex].id);
              if (lockedMoneyIndex > -1) {
                if (gameState.money[lockedMoneyIndex].status !== MoneyStatus.FAKE) {
                  Util.freezeRealMoneyObj(gameState.money[lockedMoneyIndex], gameState.statePlayer);
                }
                else {
                  gameState.statePlayer.amountOfFrozenFakeMoney += gameState.money[lockedMoneyIndex].amount;
                }
              }
            }
          }
        }
      }
    }
  }

  // If the State accused anyone, remember it
  gameState.accusedNode = stateGameState.accusedNode;
};

//------------------------------------------------------------------------------
// Update any agent statuses that need updating
this.updateAgents = function (gameState) {
  for (var agentIndex = 0; agentIndex < gameState.statePlayer.agents.length; ++agentIndex) {
    var agent = gameState.statePlayer.agents[agentIndex];
    // Incapactitate any agents who were locking down a node
    if (agent.status === AgentStatus.LOCKDOWN) {
      agent.status = AgentStatus.INCAPACITATED;
    }
    // Reset any agents who were freezing money
    if (agent.status === AgentStatus.INCAPACITATED) {
      ++agent.timeFreezing;
      if (agent.timeFreezing > BalanceValues.STATE_AGENT_TURN_TO_FREEZE) {
        agent.timeFreezing = 0;
        agent.status = AgentStatus.FOCUSING;
      }
    }
    // Make sure agents following money still have money to follow
    else if (agent.status === AgentStatus.FOLLOWING) {
      var foundMoney = -1;
      for (var moneyIndex = 0; moneyIndex < gameState.money.length; ++moneyIndex) {
        if (gameState.money[moneyIndex].agent === agent.id) {
          foundMoney = moneyIndex;
          break;
        }
      }

      // If an agent was following money that is gone now, reset him to focusing
      if (foundMoney === -1 || gameState.money[foundMoney].status === MoneyStatus.DEPOSITED) {
        agent.status = AgentStatus.FOCUSING;
        // Mark this location as one where a lead was lost
        if (foundMoney === -1 && !Util.isIndexInList(agent.location, gameState.statePlayer.lostLeadNodes)) {
          gameState.statePlayer.lostLeadNodes.push(agent.location);
        }
      }
    }
  }
};

//------------------------------------------------------------------------------
// Setup the initial nodes/links the State player knows about
var initializePartialNetwork = function (gameState, network) {
  if (network.nodes.length > 0) {
    gameState.statePlayer.knownNodes.push(0);
    for (var linkIndex = 0; linkIndex < network.nodes[0].nextLinks.length; ++linkIndex) {
      var link = network.nodes[0].nextLinks[linkIndex];
      gameState.statePlayer.knownLinks.push(link);
      gameState.statePlayer.knownNodes.push(network.links[link].nodes.end);
    }
  }
};

//------------------------------------------------------------------------------
// Remove any money from the list that the State player shouldn't see and
// make fake money appear like it is real money
var disguiseMoney = function (moneyList, network, knownLinks) {
  for (var moneyIndex = 0; moneyIndex < moneyList.length; ++moneyIndex) {
    var money = moneyList[moneyIndex];
    if (money.agent > -1) {
      // If the State is following it and it's on a link, move it back to
      // its previous Node
      if (money.status === MoneyStatus.MOVING) {
        money.status = MoneyStatus.WAITING;
        money.current = network.links[SharedUtil.getIndexFromID(network.links, money.current)].nodes.start;
      }
    }
    // If it's fake, disguise it as real money
    else if (money.status === MoneyStatus.FAKE) {
      money.status = MoneyStatus.SPOTTED;
    }
    // Otherwise remove it from the list if it hasn't been spotted or frozen
    else if (money.status !== MoneyStatus.SPOTTED &&
             money.status !== MoneyStatus.FROZEN) {
      moneyList.splice(moneyIndex, 1);
      --moneyIndex;
    }
    // Edit the routes so the State player can't see where the money is going
    money.route = [];

    var isKnownLink = function(linkIdx, knownLinks) {
      for (var knownLinkIdx = 0; knownLinkIdx < knownLinks.length; knownLinkIdx++) {
        if (linkIdx === knownLinks[knownLinkIdx]) {
          return true;
        }
      }
      return false;
    };

    //Cull out the Money's previousRoute to prevent the State player seeing
    //undiscovered upstream links.
    for (var linkIdx = money.previousRoute.length - 1; linkIdx > 0; linkIdx--) {
      if (!isKnownLink(money.previousRoute[linkIdx], knownLinks)) {
        //We don't know about this link so throw away everything in the array from
        //this link's index to the beginning of the array
        money.previousRoute = money.previousRoute.slice(linkIdx+1);
        break;
      }
    }
  }

  // Shuffle the money so the real money isn't always above the fake money
  Util.shuffleArray(moneyList);
};
