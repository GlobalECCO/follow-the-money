/*******************************************************************************
 * Responsible for UI logic used to build routes and display node properties
 ******************************************************************************/
Kernel.module.define('NetworkController', {
  // ---------------------------------------------------------------------------
  network: undefined,
  agentList: null,
  reserves: -1,

  // ---------------------------------------------------------------------------
  init: function() {
    this.hub.listen(this.hub.messages.NEW_GAME_STATE, this.onNewGameState);
    this.hub.listen(this.hub.messages.UPDATE_GAME_STATE, this.onUpdateGameState);
    this.hub.listen(this.hub.messages.ALERT_AT_NODE, this.onAlertAtNode);
    this.hub.listen(this.hub.messages.TRANSFER_SELECTED, this.onHighlightMoneyRoute);
    this.hub.listen(this.hub.messages.AGENT_ABOUT_TO_MOVE, this.onAboutToMoveAgent);
    this.hub.listen(this.hub.messages.UPDATE_ROUTE, this.onRouteUpdated);
    this.hub.listen(this.hub.messages.CLEAR_HIGHLIGHTS, this.onClearHighlights);
  },

  // ---------------------------------------------------------------------------
  onNewGameState: function(gameData) {
    var self = this;

    // Store the network data
    this.network = gameData.currentNetwork;
    this.agentList = gameData.currentTurn.statePlayer.agents;

    var ui = this.getUIModule();

    // Animate from previous network to the current
    ui.createNetworkElements({
      previousNetwork: gameData.previousNetwork,
      currentNetwork: gameData.currentNetwork,
      performFade: !gameData.isPlayback,
      userRole: gameData.userRole,
    });

    // Mark the nodes that someone followed money to
    for (var agentIndex = 0; agentIndex < gameData.currentTurn.statePlayer.agents.length; ++agentIndex) {
      var agent = gameData.currentTurn.statePlayer.agents[agentIndex];
      if (agent.status === AgentStatus.FOLLOWING) {
        var currentNode = this.network.nodes[getIndexFromID(this.network.nodes, agent.location)];
        currentNode.followedMoney = true;
      }
    }

    if (gameData.prevTurn) {
      this.setDefaultNetworkDecorations(gameData.prevTurn, gameData.previousNetwork || gameData.currentNetwork);
      this.setNodeMoneyData(gameData.prevTurn.money, gameData.previousNetwork || gameData.currentNetwork, false);
      this.setNodeAgentData(gameData.prevTurn.statePlayer.agents, gameData.previousNetwork || gameData.currentNetwork);
      this.setupNetworkNodeIcons(gameData.previousNetwork || gameData.currentNetwork, false);
      this.setDefaultNetworkDecorations(gameData.prevTurn, gameData.previousNetwork || gameData.currentNetwork);
      this.setNodeMoneyDataToMatches(gameData.prevTurn.money, gameData.currentTurn.money, gameData.previousNetwork || gameData.currentNetwork);
      this.setNodeAgentDataToMatches(gameData.prevTurn.statePlayer.agents, gameData.currentTurn.statePlayer.agents, gameData.previousNetwork || gameData.currentNetwork);
      this.setupNetworkNodeIcons(gameData.previousNetwork || gameData.currentNetwork, true);
    }

    var finishedAgents = false;
    var finishedMoney  = false;

    // Animate agent movement
    ui.animateAgentMovements(this.getAgentMovementDataForUI(gameData), function () {
      finishedAgents = true;
      if (finishedMoney) {
        self.onUpdateGameState(gameData.currentTurn);
      }
    });

    //Animate money along links. When finished animating, update the network with
    //the new game state.
    ui.animateMoneyMovements(this.getMoneyDataForUI(gameData), function () {
      finishedMoney = true;
      if (finishedAgents) {
        self.onUpdateGameState(gameData.currentTurn);
      }
    });

    ui.executeClusterQueues();
  },

  // ---------------------------------------------------------------------------
  onUpdateGameState: function(gameData) {
    this.setDefaultNetworkDecorations(gameData, this.network);
    this.setNodeMoneyData(gameData.money, this.network, true);
    this.setNodeAgentData(gameData.statePlayer.agents, this.network);
    this.setAgentAccused(gameData, this.network);

    this.setupNetworkNodeIcons(this.network, true);
  },

  // ---------------------------------------------------------------------------
  onAlertAtNode: function(nodeID) {
    this.network.nodes[getIndexFromID(this.network.nodes, nodeID)].shouldDisplayAlert = true;
  },

  //-----------------------------------------------------------------------------
  // highlight the route that this money is on
  onHighlightMoneyRoute: function(moneyID) {
    //get the previous and route from this moneyID
    var money = this.getMoneyByIdFromNetwork(moneyID);
    if (money) {
      for (var linkIdx = 0; linkIdx < this.network.links.length; linkIdx++) {
        var link = this.network.links[linkIdx];
        if (link) {
          //previously traveled on links
          for (var prevIdx = 0; prevIdx < money.previousRoute.length; prevIdx++) {
            var linkId = money.previousRoute[prevIdx];
            if (linkId === link.id) {
              link.selected = true;
              break;
            }
          }

          //next links to travel on
          for (var nextIdx = 0; nextIdx < money.route.length; nextIdx++) {
            var linkId = money.route[nextIdx];
            if (linkId === link.id) {
              link.selected = true;
              break;
            }
          }
        }
      }

      //show where this money currently is on it's route (a node or a link)
      if (money.status === MoneyStatus.MOVING) {
        this.network.links[getIndexFromID(this.network.links, money.current)].selected = true;
      } else {
        this.network.nodes[getIndexFromID(this.network.nodes, money.current)].selected = true;
      }

      this.renderNetworkDecorations(this.network); //refresh the ui
    }
  },

  //-----------------------------------------------------------------------------
  onAboutToMoveAgent: function (agentID) {
    // Find the agent about to move and see if he can move
    if (this.getAgentByID(agentID).status !== AgentStatus.INCAPACITATED) {
      this.highlightNodeWhereAgentIs(agentID);
      this.highlightNodesToMoveAgentTo(agentID);
    }
    else {
      this.hub.broadcast(this.hub.messages.CANCEL_ACTIONS);
    }
  },

  // ---------------------------------------------------------------------------
  onRouteUpdated: function (data) {
    var self = this;
    self.onClearHighlightsAndDarken();
    data.routeNodes.forEach(function (nodeId) {
      self.network.nodes[getIndexFromID(self.network.nodes, nodeId)].selected = true;
      self.network.nodes[getIndexFromID(self.network.nodes, nodeId)].darken = false;
    });

    data.routeLinks.forEach(function (linkId) {
      self.network.links[getIndexFromID(self.network.links, linkId)].selected = true;
      self.network.links[getIndexFromID(self.network.links, linkId)].darken = false;
    });

    data.nextNodes.forEach(function (nodeId) {
      self.network.nodes[getIndexFromID(self.network.nodes, nodeId)].highlight = true;
      self.network.nodes[getIndexFromID(self.network.nodes, nodeId)].darken = false;
    });

    data.nextLinks.forEach(function (linkId) {
      self.network.links[getIndexFromID(self.network.links, linkId)].highlight = true;
      self.network.links[getIndexFromID(self.network.links, linkId)].darken = false;
    });

    this.renderNetworkDecorations(this.network);
  },

  // ---------------------------------------------------------------------------
  onHighlightLeader: function(highlight) {
    for (var nodeIndex = 0; nodeIndex < this.network.nodes.length; ++nodeIndex) {
      if (this.network.nodes[nodeIndex].type === NodeTypes.LEADER) {
        this.network.nodes[nodeIndex].selected = highlight;
        this.renderNetworkDecorations(this.network);
        return;
      }
    }
  },

  // ---------------------------------------------------------------------------
  onHighlightNodeLinks: function(nodeID) {
    var node = this.network.nodes[getIndexFromID(this.network.nodes, nodeID)];
    // Highlight the node itself
    node.highlight = true;
    // Highlight the previous links
    for (var prevLinkIndex = 0; prevLinkIndex < node.prevLinks.length; ++prevLinkIndex) {
      var prevLink = getIndexFromID(this.network.links, node.prevLinks[prevLinkIndex]);
      if (prevLink > -1) {
        this.network.links[prevLink].highlight = true;
      }
    }
    // Highlight the next links
    for (var nextLinkIndex = 0; nextLinkIndex < node.nextLinks.length; ++nextLinkIndex) {
      var nextLink = getIndexFromID(this.network.links, node.nextLinks[nextLinkIndex]);
      if (nextLink > -1) {
        this.network.links[nextLink].highlight = true;
      }
    }
    this.renderNetworkDecorations(this.network);
  },

  // ---------------------------------------------------------------------------
  onHighlightAgentNode: function(agentID) {
    // Highlight the node this agent is currently at
    this.highlightNodeWhereAgentIs(agentID);
  },

  // ---------------------------------------------------------------------------
  onHighlightMoneyLocations: function(moneyIDs) {
    for (var moneyIndex = 0; moneyIndex < moneyIDs.length; ++moneyIndex) {
      var money = this.getMoneyByIdFromNetwork(moneyIDs[moneyIndex]);
      this.network.nodes[getIndexFromID(this.network.nodes, money.current)].selected = true;
    }
    this.renderNetworkDecorations(this.network);
  },

  // ---------------------------------------------------------------------------
  onHighlightNodes: function(nodeIDs) {
    for (var nodeIndex = 0; nodeIndex < nodeIDs.length; ++nodeIndex) {
      this.network.nodes[getIndexFromID(this.network.nodes, nodeIDs[nodeIndex])].selected = true;
    }
    this.renderNetworkDecorations(this.network);
  },

  // ---------------------------------------------------------------------------
  onHighlightLinks: function(linkIDs) {
    for (var linkIndex = 0; linkIndex < linkIDs.length; ++linkIndex) {
      this.network.links[getIndexFromID(this.network.links, linkIDs[linkIndex])].selected = true;
    }
    this.renderNetworkDecorations(this.network);
  },

  // ---------------------------------------------------------------------------
  onClearHighlights: function() {
    for (var nodeIndex = 0; nodeIndex < this.network.nodes.length; ++nodeIndex) {
      var node = this.network.nodes[nodeIndex];
      if (node !== null) {
        node.darken = false;
        node.highlight = false;
        node.selected = false;
      }
    }
    for (var linkIdx = 0; linkIdx < this.network.links.length; ++linkIdx) {
      var link = this.network.links[linkIdx];
      if (link !== null) {
        link.darken = false;
        link.highlight = false;
        link.selected = false;
      }
    }
    this.renderNetworkDecorations(this.network);
  },

  // ---------------------------------------------------------------------------
  onClearHighlightsAndDarken: function() {
    for (var nodeIndex = 0; nodeIndex < this.network.nodes.length; ++nodeIndex) {
      var node = this.network.nodes[nodeIndex];
      if (node !== null) {
        node.darken = true;
        node.highlight = false;
        node.selected = false;
      }
    }
    for (var linkIdx = 0; linkIdx < this.network.links.length; ++linkIdx) {
      var link = this.network.links[linkIdx];
      if (link !== null) {
        link.darken = true;
        link.highlight = false;
        link.selected = false;
      }
    }
    this.renderNetworkDecorations(this.network);
  },

  // ---------------------------------------------------------------------------
  setDefaultNetworkDecorations: function(gameData, network) {
    // Setup the money arrays on our nodes
    for (var nodeIndex = 0; nodeIndex < network.nodes.length; ++nodeIndex) {
      var node = network.nodes[nodeIndex];
      if (node !== null) {
        node.highlight = false;
        node.selected = false;
        node.shouldDisplayAlert = false;
        node.agents = [];
        node.money = [];
        if (node.type === NodeTypes.TERRORIST || node.type === NodeTypes.LEADER) {
          node.maintenanceTime = gameData.terroristPlayer.maintenanceTime;
          node.trackedMoney = gameData.statePlayer.trackedMoney[nodeIndex];
          node.balance = gameData.terroristPlayer.balances[nodeIndex];
          this.getUIModule().onBalanceAtNode(node, gameData);
          this.hub.broadcast(this.hub.messages.BALANCE_AT_NODE, { balance: node.balance, node: node });
        }
      }
    }

    for (var linkIdx = 0; linkIdx < network.links.length; ++linkIdx) {
      var link = network.links[linkIdx];
      if (link !== null) {
        link.highlight = false;
        link.selected = false;
        link.money = []; //init link money[]
      }
    }
  },

  // ---------------------------------------------------------------------------
  setNodeMoneyData: function(moneyList, network, broadcast) {
    // Iterate through the money setting the nodes' money and calculating reserves
    this.reserves = 0;
    for (var moneyIndex = 0; moneyIndex < moneyList.length; ++moneyIndex) {
      var money = moneyList[moneyIndex];
      // If the money is currently on a node, send the appropriate signal
      if (money.status === MoneyStatus.NEW || money.status === MoneyStatus.WAITING ||
          money.status === MoneyStatus.SPOTTED || money.status === MoneyStatus.FREEZING ||
          money.status === MoneyStatus.FROZEN || money.status === MoneyStatus.DEPOSITED) {
        // If the money is at the funder
        if (money.current === 0 && money.status === MoneyStatus.NEW && money.route.length === 0) {
          ++this.reserves;
        }
        this.setMoneyAtNode(money, money.current, network, broadcast);
      }
      // If the money is traveling along a link, send the appropriate signal
      else if (money.status === MoneyStatus.MOVING) {
        // This money is somewhere on the link, so let the UI know about it
        var link = network.links[money.current];
        link.money.push(money); //store the money on this Link for the UI to use
      }
    }
  },

  // ---------------------------------------------------------------------------
  setNodeMoneyDataToMatches: function(prevMoney, currentMoney, network) {
    for (var moneyIndex = 0; moneyIndex < prevMoney.length; ++moneyIndex) {
      var money = prevMoney[moneyIndex];

      for (var matchIndex = 0; matchIndex < currentMoney.length; ++matchIndex) {
        if (currentMoney[matchIndex].id === money.id) {
          if (currentMoney[matchIndex].current === money.current) {
            // If the money is currently on a node, send the appropriate signal
            if (money.status === MoneyStatus.NEW || money.status === MoneyStatus.WAITING ||
                money.status === MoneyStatus.SPOTTED || money.status === MoneyStatus.FREEZING ||
                money.status === MoneyStatus.FROZEN || money.status === MoneyStatus.DEPOSITED) {
              this.setMoneyAtNode(money, money.current, network, false);
            }
            // If the money is traveling along a link, send the appropriate signal
            else if (money.status === MoneyStatus.MOVING) {
              // This money is somewhere on the link, so let the UI know about it
              var link = network.links[money.current];
              link.money.push(money); //store the money on this Link for the UI to use
            }
          }
          break;
        }
      }
    }
  },


  // ---------------------------------------------------------------------------
  setAgentAccused: function(gameData, network) {
    // Set agent to show he is accused

    if (gameData.accusedNode) {
      $('#network-root').children('.playerCard').find('.terrorist-accused').toggleClass('toggle-hidden',true);
      //$('#network-root').children('.playerCard').find('.terrorist-accused').toggleClass('toggle-hidden',true);
      var temp = $('#network-root').children('#Node-'+ gameData.accusedNode.toString() + '.playerCard').find('.terrorist-accused').toggleClass('toggle-hidden',false);
      //$('#network-root').children('.playerCard #node-'+ gameData.accusedNode.toString()).find('.terrorist-accused').toggleClass('toggle-hidden',false);
      console.log();
    }
  },


  // ---------------------------------------------------------------------------
  setNodeAgentData: function(agents, network) {
    // Iterate through the agents, telling their nodes that they have an agent
    for (var agentIndex = 0; agentIndex < agents.length; ++agentIndex) {
      var agent = agents[agentIndex];
      var location = agent.location;
      if (location > -1) {
        this.setAgentAtNode(agent, location, network);
      }
    }
  },

  // ---------------------------------------------------------------------------
  setNodeAgentDataToMatches: function(prevAgents, currentAgents, network) {
    for (var agentIndex = 0; agentIndex < prevAgents.length; ++agentIndex) {
      var agent = prevAgents[agentIndex];

      for (var matchIndex = 0; matchIndex < currentAgents.length; ++matchIndex) {
        if (currentAgents[matchIndex].id === agent.id) {
          if (currentAgents[matchIndex].location === agent.location && agent.location > -1) {
            this.setAgentAtNode(agent, agent.location, network);
          }
          break;
        }
      }
    }
  },

  // ---------------------------------------------------------------------------
  setMoneyAtNode: function(money, nodeID, network, broadcast) {
    var node = network.nodes[getIndexFromID(network.nodes, nodeID)];
    if (node) {
      node.money.push(money);

      // Tell the world there's money here
      if (broadcast) {
        this.hub.broadcast(this.hub.messages.MONEY_AT_NODE, { money: money, node: node });
      }
    }
  },

  // ---------------------------------------------------------------------------
  // Render the agent locations in the network Node
  // @param agents The list of State agent data
  setAgentAtNode: function (agent, nodeID, network) {
    var node = network.nodes[getIndexFromID(network.nodes, nodeID)];
    if (node) {
      node.agents.push(agent);
    }
  },

  // ---------------------------------------------------------------------------
  displayNodeProperties: function(nodeID) {
    var node = this.network.nodes[getIndexFromID(this.network.nodes, nodeID)];
    if (node) {
      this.hub.broadcast(this.hub.messages.DISPLAY_NODE_PROPERTIES, node);
    }
  },

  //----------------------------------------------------------------------------
  getMoneyByIdFromNetwork: function(moneyID) {
    for (var nodeIdx = 0; nodeIdx < this.network.nodes.length; nodeIdx++) {
      if (this.network.nodes[nodeIdx] && this.network.nodes[nodeIdx].money) {
        for (var moneyIdx = 0; moneyIdx < this.network.nodes[nodeIdx].money.length; moneyIdx++) {
          if (this.network.nodes[nodeIdx].money[moneyIdx]) {
            if (this.network.nodes[nodeIdx].money[moneyIdx].id === moneyID) {
              return (this.network.nodes[nodeIdx].money[moneyIdx]);
            }
          }
        }
      }
    }

    for (var linkIdx = 0; linkIdx < this.network.links.length; linkIdx++) {
      if (this.network.links[linkIdx] && this.network.links[linkIdx].money) {
        for (var moneyIdx = 0; moneyIdx < this.network.links[linkIdx].money.length; moneyIdx++) {
          if (this.network.links[linkIdx].money[moneyIdx]) {
            if (this.network.links[linkIdx].money[moneyIdx].id === moneyID) {
              return (this.network.links[linkIdx].money[moneyIdx]);
            }
          }
        }
      }
    }

    return null;
  },

  // ---------------------------------------------------------------------------
  getRouteBuilder: function() {
    return Kernel.module.get('routeBuilder');
  },

  // ---------------------------------------------------------------------------
  hasReserves: function() {
    return this.reserves > 0;
  },

  // ---------------------------------------------------------------------------
  startRoute: function(money) {
    if (money !== undefined) {
      this.getRouteBuilder().startRoute(this.network, this.reserves, money.current, money);
    }
    else if (this.reserves > 0) {
      this.getRouteBuilder().startRoute(this.network, this.reserves, 0);
    }
    else {
      this.hub.broadcast(this.hub.messages.CANCEL_ACTIONS);
      this.hub.broadcast(this.hub.messages.DISPLAY_INFO_TEXT, { text: "No funds left to transfer!", color:'#ff0000', autoRemove:true });
    }
  },

  // ---------------------------------------------------------------------------
  addNodeToRoute: function(nodeID) {
    this.getRouteBuilder().addNodeToRoute(this.network, this.reserves, nodeID);
  },

  //----------------------------------------------------------------------------
  highlightNodeWhereAgentIs: function (agentID) {
    //find the node where this agent is and 'select' it.
    var nodeIndex = getIndexFromID(this.network.nodes, this.getAgentByID(agentID).location);
    this.network.nodes[nodeIndex].selected = true;
    this.renderNetworkDecorations(this.network);
  },

  //----------------------------------------------------------------------------
  //Can the supplied agent
  validNodeToMoveTo: function (node, agentID) {
    var valid = ((node.type !== NodeTypes.FUNDER) &&
                 (node.type !== NodeTypes.UNSUB) &&
                 (this.getAgentByID(agentID).location !== node.id));

    return valid;
  },

  // ---------------------------------------------------------------------------
  highlightNodesToMoveAgentTo: function (agentID) {
    for (var nodeIdx = 0; nodeIdx < this.network.nodes.length; nodeIdx++) {
      if (this.network.nodes[nodeIdx]) {
        this.network.nodes[nodeIdx].highlight =
          this.validNodeToMoveTo(this.network.nodes[nodeIdx], agentID);
      }
    }

    this.renderNetworkDecorations(this.network);
  },

  // ---------------------------------------------------------------------------
  moveAgent: function(agentID, nodeID) {
    // Check to see if the agent can be moved to the supplied node
    var node = this.network.nodes[getIndexFromID(this.network.nodes, nodeID)];
    var canMove = this.validNodeToMoveTo(node, agentID);

    if (canMove) {
      // Let the ui know about this so it can visualize it
      this.getUIModule().onAgentMove(this.getAgentByID(agentID).location, nodeID, 750);
      this.hub.broadcast(this.hub.messages.AGENT_MOVED);

      // Now that the ui has had a chance to see the source, we can safely change it
      this.hub.forwardAgentMove({ agentID: agentID, nodeID: nodeID });
    }
    else {
      //this is an invalid move; tell the world to cancel this action
      this.hub.broadcast(this.hub.messages.CANCEL_ACTIONS);
    }
  },

  // ---------------------------------------------------------------------------
  setupNetworkNodeIcons: function(network, animate) {
    this.getUIModule().setupNetworkNodeIcons(network, animate);
  },

  // ---------------------------------------------------------------------------
  renderNetworkDecorations: function(network) {
    this.getUIModule().decorateNetwork(network);
  },

  // ---------------------------------------------------------------------------
  // Handles processing in 3 parts: previous turn, current turn, and post process
  getMoneyDataForUI: function(gameData) {
    // Convenience vars
    var curTurnNumber  = gameData.currentTurn.currentTurnNumber * 2 + (gameData.currentTurn.viewingPending? 1: 0);
    var prevTurnNumber = gameData.prevTurn? gameData.prevTurn.currentTurnNumber * 2 + (gameData.prevTurn.viewingPending? 1: 0): curTurnNumber;

    var reverse = prevTurnNumber > curTurnNumber;
    var network = gameData.previousNetwork && reverse? gameData.previousNetwork: gameData.currentNetwork;
    var currentMoney = reverse? (gameData.prevTurn? gameData.prevTurn.money: null): gameData.currentTurn.money;
    var previousMoney = reverse? gameData.currentTurn.money: (gameData.prevTurn? gameData.prevTurn.money: null);

    var viewingHalfTurn = Math.abs(prevTurnNumber - curTurnNumber) > 1? false: !reverse? curTurnNumber % 2 > 0: curTurnNumber % 2 === 0;
    //var viewingHalfTurn = false;

    var start = reverse?'end': 'start';
    var end   = reverse?'start': 'end';
    var current =  reverse?'previous': 'current';
    var previous = reverse? 'current': 'previous';

    // Will store id-data pairs so each previous and next can easily be referenced
    var bakedMoney = {};

    if (prevTurnNumber - curTurnNumber > 3) {
      return bakedMoney;
    }

    ////////////////////////////////////
    // If the money was around in the previous turn, bake its data
    if (previousMoney) {
      for (var i = 0; i < previousMoney.length; ++i) {
        var money = previousMoney[i];

        if (!network.links[money.current]) {
          continue;
        }

        if (money.status === MoneyStatus.MOVING) {
          var percent = money.waitTime / network.links[money.current].travelTime;
          if (reverse) {
            percent = 1.0 - percent;
          }
          bakedMoney[money.id] = {};
          bakedMoney[money.id][previous] = {
            link: money.current,
            startNode: network.links[money.current].nodes[start],
            endNode: network.links[money.current].nodes[end],
            percent: percent,
            status: money.status,
            reachedEnd: false,
          };
        } else if (money.status === MoneyStatus.WAITING ||
                   money.status === MoneyStatus.DEPOSITED ||
                   money.status === MoneyStatus.FREEZING) {

          // On the state side, we might not know where the money
          // came from so don't try to animate itt
          if (money.previousRoute.length > 0) {
            var prevIndex = money.previousRoute.length - 1;
            var prevLink = money.previousRoute[prevIndex];

            if (reverse) {
              if (money.route.length) {
                prevLink = money.route[0];
              } else {
                continue;
              }
            }
            var percent = viewingHalfTurn? 0.0: 1.0;
            bakedMoney[money.id] = {};
            bakedMoney[money.id][previous] = {
              link: prevLink,
              startNode: network.links[prevLink].nodes[start],
              endNode: network.links[prevLink].nodes[end],
              percent: percent,
              status: money.status,
              end: true
            };
          }
        }
      }
    }

    ////////////////////////////////////
    // Current turn money
    for (var i = 0; i < currentMoney.length; ++i) {
      var money = currentMoney[i];

      // Moving to a link
      if (money.status === MoneyStatus.MOVING) {
        // Default values
        var link = money.current;
        var reachedEnd = false;
        var percent  = money.waitTime / network.links[money.current].travelTime;
        if (reverse) {
          percent = 1.0 - percent;
          reachedEnd = true;
        }

         // If there is no previous, create the property for the current (happens on first move)
        if (!bakedMoney.hasOwnProperty(money.id)) {
          if (!network.links[money.current]) {
            continue;
          }
          bakedMoney[money.id] = {};
          bakedMoney[money.id][previous] = {
            link: money.current,
            startNode: network.links[money.current].nodes[start],
            endNode: network.links[money.current].nodes[end],
            percent: (reverse? (money.waitTime + 1): (money.waitTime - 1)) / network.links[money.current].travelTime,
            status: money.status,
            reachedEnd: false,
            end: reachedEnd
          };
        }

        // bakedMoney[money.id][previous].end = reachedEnd;

        bakedMoney[money.id][current] = {
            link: link,
            startNode: network.links[money.current].nodes[start],
            endNode: network.links[money.current].nodes[end],
            percent: percent,
            status: money.status,
            end: reachedEnd
        };
      }

      var prevIndex = money.previousRoute.length - 1;
      if (money.waitTime > 0 && !bakedMoney.hasOwnProperty(money.id)) {
        prevIndex = money.current;
      }
      var previousLink = money.previousRoute[prevIndex];

      if (!network.links[previousLink]) {
        continue;
      }

      // Moving to a node
      if (money.status === MoneyStatus.WAITING ||
          money.status === MoneyStatus.DEPOSITED ||
          money.status === MoneyStatus.FREEZING ||
          money.status === MoneyStatus.FROZEN ||
          money.status === MoneyStatus.SPOTTED) {
        if (!bakedMoney.hasOwnProperty(money.id)) {
          var percent = 0.0;
          if (reverse) {
            percent = 1.0 - percent;
          }
          bakedMoney[money.id] = {};
          bakedMoney[money.id][previous] = {
            startNode: network.links[previousLink].nodes[start],
            endNode: network.links[previousLink].nodes[end],
            link:money.previousRoute[prevIndex],
            percent: percent,
            status: money.status,
            end: true
          };
        } else {
          // Ignore money that was and remains deposited
          if (bakedMoney[money.id][previous].status === MoneyStatus.DEPOSITED) {
            delete bakedMoney[money.id];
            continue;
          }
        }


        var percent = viewingHalfTurn? 0.0: 1.0;
        if (reverse) {
          percent = 1.0 - percent;
        }
        //bakedMoney[money.id][previous].end = true;
        bakedMoney[money.id][current] = {
          link: money.previousRoute[prevIndex],
          startNode: network.links[previousLink].nodes[start],
          endNode: network.links[previousLink].nodes[end],
          percent: percent,
          status: money.status,
          end: true
        };
      }
    }

    ////////////////////////////////////
    // Post process cleanup
    // Remove baked money that was previously frozen and now gone
    // Having a 'current' property is required for rendering.
    for (var m in bakedMoney) {
      if (bakedMoney[m].hasOwnProperty('previous')) {
        if (!bakedMoney[m].hasOwnProperty('current')) {
          delete bakedMoney[m];
          continue;
        }

        if ((bakedMoney[m]['current'].percent === 0.0 || bakedMoney[m]['current'].percent === 1.0) &&
            bakedMoney[m]['current'].link === bakedMoney[m]['previous'].link &&
            bakedMoney[m]['current'].percent === bakedMoney[m]['previous'].percent) {
          delete bakedMoney[m];
          continue;
        }

        if (reverse && bakedMoney[m]['current'].link !== bakedMoney[m]['previous'].link &&
            bakedMoney[m]['current'].percent !== bakedMoney[m]['previous'].percent) {
          delete bakedMoney[m];
          continue;
        }
      }
    }

    return bakedMoney;
  },

  // ---------------------------------------------------------------------------
  getAgentMovementDataForUI: function(gameData) {
    var result = [];

    if (gameData.prevTurn) {
      var agentCount = gameData.prevTurn.statePlayer.agents.length;

      // Add a result for each agent starting position.
      for (var agentIndex = 0; agentIndex < agentCount; ++agentIndex) {
        var agentID = gameData.prevTurn.statePlayer.agents[agentIndex].id;
        var start   = gameData.prevTurn.statePlayer.agents[agentIndex].location;

        result[agentID] = {start: start};
      }

      // Apply the ending location to each agent.
      for (var agentIndex = 0; agentIndex < agentCount; ++agentIndex) {
        var agentID = gameData.currentTurn.statePlayer.agents[agentIndex].id;
        var end     = gameData.currentTurn.statePlayer.agents[agentIndex].location;

        result[agentID].end = end;
      }

      // remove agents that did not move.
      for (var agentIndex = 0; agentIndex < result.length; ++agentIndex) {
        if (result[agentIndex].start === result[agentIndex].end) {
          delete result[agentIndex];
        }
      }
    }

    return result;
  },

  // ---------------------------------------------------------------------------
  getAgentByID: function(agentID) {
    var agentIdx = getIndexFromID(this.agentList, agentID);
    if (agentIdx > -1) {
      return this.agentList[agentIdx];
    } else {
      return null;
    }
  },

  // ---------------------------------------------------------------------------
  getUIModule: function() {
    return Kernel.module.get('uiNetwork');
  }
});
