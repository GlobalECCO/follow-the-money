/*******************************************************************************
 * Controls behavior for the terrorist network
 ******************************************************************************/
Kernel.module.define('GameController', {
  user: null,
  userRole: '',
  previousGameState: null,
  currentGameState: null,
  modifiedGameState: null,
  pendingGameState: null,
  previousNetwork: null,
  currentNetwork: null,
  removedMoney: null,

  // ---------------------------------------------------------------------------
  init: function() {
    this.hub.listen(this.hub.messages.CHANGE_GAME_STATE, this.changeGameState);
    this.hub.listen(this.hub.messages.OVERRIDE_GAME_STATE, this.overrideGameState);

    this.hub.listen(this.hub.messages.ACCEPT_ROUTE, this.changeMoneyRoutes);
    this.hub.listen(this.hub.messages.CHANGE_ROUTE_AMOUNT, this.changeMoneyAmount);
    this.hub.listen(this.hub.messages.DELETE_ROUTE, this.deleteRoute);
    this.hub.listen(this.hub.messages.MONEY_FOLLOWED, this.followMoney);
    this.hub.listen(this.hub.messages.MONEY_FREEZING, this.freezeMoney);
    this.hub.listen(this.hub.messages.MONEY_IGNORED, this.ignoreMoney);
    this.hub.listen(this.hub.messages.MONEY_COURIER, this.courierMoney);
    this.hub.listen(this.hub.messages.MONEY_RESET, this.resetMoney);
    this.hub.listen(this.hub.messages.MONEY_RESET_COURIER, this.resetCourierMoney);
    this.hub.listen(this.hub.messages.TRANSFER_RESET, this.onTransferReset);
    this.hub.listen(this.hub.messages.AGENT_MOVE, this.moveAgent);
    this.hub.listen(this.hub.messages.HAWALA_LOCKDOWN, this.hawalaLockdown);
    this.hub.listen(this.hub.messages.ACCUSE_TERRORIST, this.accuseTerrorist);
    this.hub.listen(this.hub.messages.CANCEL_CHANGES, this.cancelChanges);
    this.hub.listen(this.hub.messages.SUBMIT_TURN, this.submitTurn);
  },

  // ---------------------------------------------------------------------------
  changeGameState: function(data) {
    var self = this;

    self.user = data.user;
    self.userRole = data.userRole;
    self.previousGameState = data.prevTurn;
    self.currentGameState = data.currentTurn;
    self.latestTurnNumber = data.latestTurnNumber;
    self.latestPending = data.latestPending;
    self.isGameOver = data.isGameOver;
    self.isPlayback = data.isPlayback;
    self.removedMoney = [];

    // If this is the latest turn and we have stored turn data, restore it
    if (self.pendingGameState !== undefined && self.currentGameState.currentTurnNumber === data.latestTurnNumber) {
        self.modifiedGameState = copyTurn(self.pendingGameState);
        delete self.pendingGameState;
    }
    // Otherwise use the given turn data
    else {
      // If our modified game state is from the last turn, save the current turn data
      if (self.modifiedGameState !== undefined && self.modifiedGameState.currentTurnNumber == self.latestTurnNumber) {
        self.pendingGameState = copyTurn(self.modifiedGameState);
      }
      self.modifiedGameState = copyTurn(self.currentGameState);
    }

    // If the game is over, then get the full network first
    if (self.currentGameState.phase === GamePhase.ENDGAME) {
      self.hub.retrieveFullNetwork(function(networkData) {
        if (self.gameStateOverridden === undefined) {
          self.previousNetwork = null;
          self.currentNetwork = networkData;
          self.forwardNewGameState();
        }
      });
    }
    // If we are a Terrorist and we already have the network, then forward the
    // game data right now
    else if (self.userRole === PlayerRoles.TERRORIST) {
      // Request the terrorist's perspective of the network if we don't have it
      if (self.currentNetwork === undefined) {
        self.hub.retrieveFullNetwork(function(networkData) {
          if (self.gameStateOverridden === undefined) {
            self.previousNetwork = null;
            self.currentNetwork = networkData;
            self.forwardNewGameState();
          }
        });
      }
      else {
        self.forwardNewGameState();
      }
    }
    else {
      // Always get a new network from the state's view with a new game state
      self.hub.retrievePartialNetwork(
        data.currentTurn.currentTurnNumber,
        data.prevTurn ? data.prevTurn.currentTurnNumber: -1,
        function(networkData) {
          if (self.gameStateOverridden === undefined) {
            self.previousNetwork = networkData.previousNetwork;
            self.currentNetwork = networkData.currentNetwork;
            self.forwardNewGameState();
          }
        }
      );
    }

    self.modifiedGameState.oldMoney = self.currentGameState.money;
  },

  // ---------------------------------------------------------------------------
  overrideGameState: function(data) {
    this.gameStateOverridden = data.gameStateOverridden;
    this.previousNetwork = data.previousNetwork;
    this.currentNetwork = data.currentNetwork;
    this.previousGameState = data.prevTurn;
    this.currentGameState = data.currentTurn;
    this.modifiedGameState = copyTurn(this.currentGameState);
    this.latestTurnNumber = data.latestTurnNumber;
    this.latestPending = data.latestPending;
    this.forwardNewGameState();
  },

  // ---------------------------------------------------------------------------
  changeMoneyRoutes: function(newRouteData) {
    // We are changing the route of existing money
    if (newRouteData.moneyID > -1) {
      for (var moneyIndex = 0; moneyIndex < this.modifiedGameState.money.length; ++moneyIndex) {
        var money = this.modifiedGameState.money[moneyIndex];
        if (newRouteData.moneyID === money.id) {
          money.route = newRouteData.route;
          money.hasBeenModified = true;
        }
      }
    }
    // We are transfering new money
    else {
      var moneyToMove = newRouteData.moneyTransferred;
      var newMoney = null;
      for (var moneyIndex = 0; moneyToMove > 0 && moneyIndex < this.modifiedGameState.money.length; ++moneyIndex) {
        var money = this.modifiedGameState.money[moneyIndex];
        if (money.status === MoneyStatus.NEW && money.route.length === 0) {
          if (newMoney === null) {
            newMoney = money;
            money.route = newRouteData.route;
          }
          else {
            newMoney.amount += money.amount;
            this.removedMoney.push(this.modifiedGameState.money.splice(moneyIndex, 1)[0]);
            --moneyIndex;
          }
          moneyToMove -= money.amount;
        }
      }
    }
    this.forwardUpdatedGameState();
  },

  // ---------------------------------------------------------------------------
  changeMoneyAmount: function(data) {
    // Find the money whose amount is being edited
    for (var moneyIndex = 0; moneyIndex < this.modifiedGameState.money.length; ++moneyIndex) {
      var money = this.modifiedGameState.money[moneyIndex];
      if (data.moneyID === money.id) {
        if (data.amount > 0) {
          this.increaseMoneyAmount(money, data.amount);
        }
        else if (data.amount < 0) {
          this.decreaseMoneyAmount(money, data.amount);
        }
        money.amount += data.amount;
        break;
      }
    }
    this.forwardUpdatedGameState();
  },

  // ---------------------------------------------------------------------------
  deleteRoute: function(moneyID) {
    // Find the money object holding the entire transaction
    for (var moneyIndex = 0; moneyIndex < this.modifiedGameState.money.length; ++moneyIndex) {
      var money = this.modifiedGameState.money[moneyIndex];
      if (moneyID === money.id) {
        this.decreaseMoneyAmount(money, -(money.amount - 1));
        money.amount = 1;
        money.route = [];
        break;
      }
    }
    this.forwardUpdatedGameState();
  },

  // ---------------------------------------------------------------------------
  increaseMoneyAmount: function(money, amount) {
    // Return the number of money objects from the removed list to the game state list
    for (var moneyIndex = 0; amount > 0 && moneyIndex < this.modifiedGameState.money.length; ++moneyIndex) {
      var existingMoney = this.modifiedGameState.money[moneyIndex];
      if (existingMoney.status === MoneyStatus.NEW && existingMoney.route.length === 0) {
        amount -= existingMoney.amount;
        this.removedMoney.push(this.modifiedGameState.money.splice(moneyIndex, 1)[0]);
        --moneyIndex;
      }
    }
  },

  // ---------------------------------------------------------------------------
  decreaseMoneyAmount: function(money, amount) {
    // Return the number of money objects from the removed list to the game state list
    while (amount < 0) {
      var replacedMoney = this.removedMoney.splice(0, 1)[0];
      this.modifiedGameState.money.push(replacedMoney);
      amount += replacedMoney.amount;
    }
  },

  // ---------------------------------------------------------------------------
  followMoney: function(followData) {
    var moneyIndex = getIndexFromID(this.modifiedGameState.money, followData.moneyID);
    if (moneyIndex > -1) {
      var money = this.modifiedGameState.money[moneyIndex];

      // Update the attached agent
      this.resetAttachedAgent(money.agent);
      var agentIdx = getIndexFromID(this.modifiedGameState.statePlayer.agents, followData.agentID);
      if (agentIdx > -1) {
        this.resetAttachedMoney(agentIdx);
        this.modifiedGameState.statePlayer.agents[agentIdx].status = AgentStatus.FOLLOWING;
      }

      // Update the money
      money.agent = followData.agentID;
      money.status = MoneyStatus.WAITING;

      this.forwardUpdatedGameState();
    }
  },

  // ---------------------------------------------------------------------------
  freezeMoney: function(freezeData) {
    var moneyIndex = getIndexFromID(this.modifiedGameState.money, freezeData.moneyID);
    if (moneyIndex > -1) {
      var money = this.modifiedGameState.money[moneyIndex];

      // Update the attached agent
      this.resetAttachedAgent(money.agent);
      var agentIdx = getIndexFromID(this.modifiedGameState.statePlayer.agents, freezeData.agentID);
      if (agentIdx > -1) {
        this.resetAttachedMoney(agentIdx);
        this.modifiedGameState.statePlayer.agents[agentIdx].status = AgentStatus.FREEZING;
      }

      // Update the money
      money.agent = freezeData.agentID;
      money.status = MoneyStatus.FREEZING;

      this.forwardUpdatedGameState();
    }
  },

  // ---------------------------------------------------------------------------
  ignoreMoney: function(moneyID) {
    var moneyIndex = getIndexFromID(this.modifiedGameState.money, moneyID);
    if (moneyIndex > -1) {
      var money = this.modifiedGameState.money[moneyIndex];

      // Update the attached agent
      this.resetAttachedAgent(money.agent);

      // Update the money
      money.status = MoneyStatus.WAITING;
      money.agent = -1;

      this.forwardUpdatedGameState();
    }
  },

  // ---------------------------------------------------------------------------
  courierMoney: function(courierData) {
    var moneyIndex = getIndexFromID(this.modifiedGameState.money, courierData.moneyID);
    if (moneyIndex > -1) {
      var money = this.modifiedGameState.money[moneyIndex];

      money.courierHired = true;
      money.amount -= courierData.cost;
      money.courierDelay = courierData.delay;
      money.hasBeenModified = true;

      this.forwardUpdatedGameState();
    }
  },

  // ---------------------------------------------------------------------------
  resetMoney: function(moneyID) {
    var moneyIndex = getIndexFromID(this.modifiedGameState.money, moneyID);
    if (moneyIndex > -1) {
      var money = this.modifiedGameState.money[moneyIndex];
      // Update the attached agent
      this.resetAttachedAgent(money.agent);

      // Update the money
      money.status = MoneyStatus.SPOTTED;
      money.agent = -1;

      this.forwardUpdatedGameState();
    }
  },

  // ---------------------------------------------------------------------------
  resetCourierMoney: function(moneyID) {
    var moneyIndex = getIndexFromID(this.modifiedGameState.money, moneyID);
    if (moneyIndex > -1) {
      var money = this.modifiedGameState.money[moneyIndex];

      // Update the money
      money.courierHired = false;
      var originalMoney = this.currentGameState.money[getIndexFromID(this.currentGameState.money, moneyID)];
      money.amount = originalMoney.amount;
      money.courierDelay = originalMoney.courierDelay;

      this.forwardUpdatedGameState();
    }
  },

  //-----------------------------------------------------------------------------
  onTransferReset: function(moneyID) {
    var moneyIndex = getIndexFromID(this.modifiedGameState.money, moneyID);
    if (moneyIndex > -1) {
      var originalMoney = this.currentGameState.money[getIndexFromID(this.currentGameState.money, moneyID)];
      this.modifiedGameState.money[moneyIndex] = {
        id: originalMoney.id,
        route: [],
        previousRoute: [],
        current: originalMoney.current,
        amount: originalMoney.amount,
        waitTime: originalMoney.waitTime,
        courierDelay: originalMoney.courierDelay,
        agent: originalMoney.agent,
        status: originalMoney.status,
        courierHired: originalMoney.courierHired,
        courierLocked: originalMoney.courierLocked
      };

      for (var routeIndex = 0; routeIndex < originalMoney.route.length; ++routeIndex) {
        this.modifiedGameState.money[moneyIndex].route.push(originalMoney.route[routeIndex]);
      }
      for (var previousRouteIndex = 0; previousRouteIndex < originalMoney.previousRoute.length; ++previousRouteIndex) {
        this.modifiedGameState.money[moneyIndex].previousRoute.push(originalMoney.previousRoute[previousRouteIndex]);
      }

      this.forwardUpdatedGameState();
    }
  },

  //-----------------------------------------------------------------------------
  // Move the supplied agent to the supplied location
  moveAgent: function (data) {
    var agentIdx = getIndexFromID(this.modifiedGameState.statePlayer.agents, data.agentID);
    if (agentIdx > -1) {
      this.resetAttachedMoney(agentIdx);

      // Update the agent
      this.modifiedGameState.statePlayer.agents[agentIdx].status = AgentStatus.FOCUSING;
      this.modifiedGameState.statePlayer.agents[agentIdx].location = data.nodeID;
      this.forwardUpdatedGameState();
    }
  },

  //-----------------------------------------------------------------------------
  // Lockdown the given hawala node
  hawalaLockdown: function (agentID) {
    var agentIndex = getIndexFromID(this.modifiedGameState.statePlayer.agents, agentID);
    if (agentIndex > -1) {
      this.resetAttachedMoney(agentIndex);
      var agent = this.modifiedGameState.statePlayer.agents[agentIndex];
      // Toggle the agent between Lockdown and Focusing states
      var lockedDown = agent.status === AgentStatus.LOCKDOWN;
      if (!lockedDown) {
        agent.status = AgentStatus.LOCKDOWN;
      }
      else {
        agent.status = AgentStatus.FOCUSING;
      }
      this.lockdownMoney(agent.location, !lockedDown);
      this.forwardUpdatedGameState();
    }
  },

  //-----------------------------------------------------------------------------
  //Move the supplied agent to the supplied location
  accuseTerrorist: function (nodeID) {
    this.modifiedGameState.accusedNode = nodeID;
    this.forwardUpdatedGameState();
  },

  // ---------------------------------------------------------------------------
  cancelChanges: function() {
    delete this.pendingGameState;
    this.removedMoney = [];
    this.previousGameState = copyTurn(this.modifiedGameState);
    this.modifiedGameState = copyTurn(this.currentGameState);
    this.forwardNewGameState();
  },

  // ---------------------------------------------------------------------------
  submitTurn: function() {
    delete this.pendingGameState;
    this.hub.sendGameData(this.user, JSON.stringify(this.modifiedGameState), this.submitSuccess, this.submitFail);
  },

  // ---------------------------------------------------------------------------
  submitSuccess: function() {
    this.hub.broadcast(this.hub.messages.TURN_SUBMITTED);
  },

  // ---------------------------------------------------------------------------
  submitFail: function() {
    this.hub.forwardSubmitFailed();
  },

  // ---------------------------------------------------------------------------
  forwardNewGameState: function() {
    if (this.previousGameState !== null) {
      this.getMoneyDestinations(this.previousGameState, this.currentNetwork);
      this.calcMoneyRouteStatistics(this.previousGameState, this.currentNetwork);
    }

    this.getMoneyDestinations(this.modifiedGameState, this.currentNetwork);
    this.calcMoneyRouteStatistics(this.modifiedGameState, this.currentNetwork);
    this.hub.forwardNewGameState({
      userRole: this.userRole,
      prevTurn: this.previousGameState,
      currentTurn: this.modifiedGameState,
      previousNetwork: this.previousNetwork,
      currentNetwork: this.currentNetwork,
      latestTurnNumber: this.latestTurnNumber,
      latestPending: this.latestPending,
      isGameOver: this.isGameOver,
      isPlayback: this.isPlayback,
    });
  },

  // ---------------------------------------------------------------------------
  forwardUpdatedGameState: function() {
    this.getMoneyDestinations(this.modifiedGameState, this.currentNetwork);
    this.calcMoneyRouteStatistics(this.modifiedGameState, this.currentNetwork);
    this.hub.forwardUpdatedGameState(this.modifiedGameState);
  },

  // ---------------------------------------------------------------------------
  // Returns the name of the terrorist at the end of this route
  getMoneyDestinations: function (gameState, network) {
    for (var moneyIndex = 0; moneyIndex < gameState.money.length; ++moneyIndex) {
      var money = gameState.money[moneyIndex];
      if (money.route.length > 0) {
        // Get the last link ID in the route
        var lastLinkIndex = getIndexFromID(network.links, money.route[money.route.length - 1]);
        if (lastLinkIndex > -1) {
          // Get the node at the end of that link
          var endNodeIndex = getIndexFromID(network.nodes, network.links[lastLinkIndex].nodes.end);
          if (endNodeIndex > -1) {
            money.destination = network.nodes[endNodeIndex].name;
          }
        }
      }
    }
  },

  //----------------------------------------------------------------------------
  //Given the list of link id's, calculate how many turns this will take
  calcNumberOfTurnsForRoute: function (routeLinks, nodes, links) {
    var totalLength = 0;
    for (var prevLinkIdx = 0; prevLinkIdx < routeLinks.length; prevLinkIdx++) {
      var linkIdx = getIndexFromID(links, routeLinks[prevLinkIdx]);

      if (linkIdx > -1) {
        //travel time of links
        totalLength += links[linkIdx].travelTime;
        //plus the holdTime of the nodes
        var endNodeIdx = getIndexFromID(nodes, links[linkIdx].nodes.end);
        totalLength += nodes[endNodeIdx].holdTime;
      }
    }
    return totalLength;
  },

  //----------------------------------------------------------------------------
  //Calculate the number of turns this money has traveled, as well as the total
  //number of turns this money's route will take.
  calcMoneyRouteStatistics: function(gameState, network) {
    for (var moneyIndex = 0; moneyIndex < gameState.money.length; ++moneyIndex) {
      var money = gameState.money[moneyIndex];

      //the total number of turns for the route = previous links and nodes +
      //any future links and nodes + the current link or node.

      //calc the number of turns this money has already taken
      money.turnsTraveledOnRoute = this.calcNumberOfTurnsForRoute(money.previousRoute, network.nodes, network.links);

      //total number of turns of route is the all the previous links
      money.totalTurnsOfRoute = money.turnsTraveledOnRoute +
        this.calcNumberOfTurnsForRoute(money.route, network.nodes, network.links);

      money.turnsTraveledOnRoute += money.waitTime; //TODO is this how long we've been on this link and/or node?

      //...and don't forget to count the travel time if we're currently on a link
      if (money.status === MoneyStatus.MOVING) {
        var linkIdx = getIndexFromID(network.links, money.current);
        money.totalTurnsOfRoute += network.links[linkIdx].travelTime;
      }
    }
  },

  // ---------------------------------------------------------------------------
  // If the money already had an agent on it, reset that agent's status
  resetAttachedAgent: function(agentID) {
    if (agentID > -1) {
      var agentIdx = getIndexFromID(this.modifiedGameState.statePlayer.agents, agentID);
      if (agentIdx > -1) {
        this.modifiedGameState.statePlayer.agents[agentIdx].status = AgentStatus.FOCUSING;
      }
    }
  },

  // ---------------------------------------------------------------------------
  // If the agent was already following/freezing money, reset that money
  resetAttachedMoney: function(agentIndex) {
    var agent = this.modifiedGameState.statePlayer.agents[agentIndex];
    if (agent.status !== AgentStatus.FOCUSING) {
      // Find the money he's attached to and set it to SPOTTED status
      for (var moneyIndex = 0; moneyIndex < this.modifiedGameState.money.length; ++moneyIndex) {
        var money = this.modifiedGameState.money[moneyIndex];
        if (money.agent === agent.id) {
          money.agent = -1;
          money.status = MoneyStatus.SPOTTED;
        }
      }
    }
  },

  // ---------------------------------------------------------------------------
  // Lockdown (or undo a lockdown) on all money at the given node
  lockdownMoney: function(nodeID, lockedDown) {
    for (var moneyIndex = 0; moneyIndex < this.modifiedGameState.money.length; ++moneyIndex) {
      var money = this.modifiedGameState.money[moneyIndex];
      if (money.current === nodeID) {
        if (lockedDown) {
          money.status = MoneyStatus.FROZEN;
          this.resetAttachedAgent(money.agent);
        }
        else {
          money.status = this.currentGameState.money[getIndexFromID(this.currentGameState.money, money.id)].status;
        }
      }
    }
  }
});
