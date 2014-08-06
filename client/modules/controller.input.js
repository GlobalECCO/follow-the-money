/*******************************************************************************
 * Responsible for determining what happens when UI is interacted with
 ******************************************************************************/
Kernel.module.define('InputController', {

  InputStates: {
    NONE: -1,
    PROPERTIES: 0,
    ROUTES: 1,
    AGENT: 2
  },

  inputState: -1,

  selectedNode: -1,
  selectedAgent: -1,

  newTransactions: 0,

  // ---------------------------------------------------------------------------
  init: function() {
    this.inputState = this.InputStates.NONE;

    this.hub.listen(this.hub.messages.NEW_GAME_STATE, this.onNewGameState);
    this.hub.listen(this.hub.messages.FUNDS_HIGHLIGHTED, this.onFundsHighlighted);
    this.hub.listen(this.hub.messages.NODE_SELECTED, this.onNodeClicked);
    this.hub.listen(this.hub.messages.START_ROUTE, this.onStartRoute);
    this.hub.listen(this.hub.messages.TRANSFER_SUBMITTED, this.onEndRoute);
    this.hub.listen(this.hub.messages.TRANSFER_AMOUNT_CHANGED, this.onTransferAmountChanged);
    this.hub.listen(this.hub.messages.TRANSFER_DELETED, this.onTransferDeleted);
    this.hub.listen(this.hub.messages.MONEY_SELECTED, this.onMoneySelected);
    this.hub.listen(this.hub.messages.AGENT_SELECTED, this.onAgentSelected);
    this.hub.listen(this.hub.messages.NODE_MOUSE_ENTER, this.onNodeMouseEnter);
    this.hub.listen(this.hub.messages.NODE_MOUSE_LEAVE, this.onNodeMouseLeave);
    this.hub.listen(this.hub.messages.AGENT_MOUSE_ENTER, this.onAgentMouseEnter);
    this.hub.listen(this.hub.messages.AGENT_MOUSE_LEAVE, this.onAgentMouseLeave);
    this.hub.listen(this.hub.messages.TRANSFER_MOUSE_ENTER, this.onTransferMouseEnter);
    this.hub.listen(this.hub.messages.TRANSFER_MOUSE_LEAVE, this.onTransferMouseLeave);
    this.hub.listen(this.hub.messages.NOTIFICATION_MONEY_MOUSE_ENTER, this.onNotificationMoneyMouseEnter);
    this.hub.listen(this.hub.messages.NOTIFICATION_MONEY_MOUSE_LEAVE, this.onNotificationMoneyMouseLeave);
    this.hub.listen(this.hub.messages.NOTIFICATION_NODE_MOUSE_ENTER, this.onNotificationNodeMouseEnter);
    this.hub.listen(this.hub.messages.NOTIFICATION_NODE_MOUSE_LEAVE, this.onNotificationNodeMouseLeave);
    this.hub.listen(this.hub.messages.NOTIFICATION_LINK_MOUSE_ENTER, this.onNotificationLinkMouseEnter);
    this.hub.listen(this.hub.messages.NOTIFICATION_LINK_MOUSE_LEAVE, this.onNotificationLinkMouseLeave);
    this.hub.listen(this.hub.messages.CANCEL_ACTIONS, this.onCancelChanges);
    this.hub.listen(this.hub.messages.SUBMIT_TURN, this.onTurnSubmitted);
    this.hub.listen(this.hub.messages.CANCEL_CHANGES, this.onTurnCancelled);

    $(document).on('click.cancelActions', this.onBackgroundClicked);
  },

  // ---------------------------------------------------------------------------
  kill: function() {
    $(document).off('click.cancelActions');
  },

  // ---------------------------------------------------------------------------
  onNewGameState: function(gameState) {
    var enableActions = !hasPlayerTakenTurn(gameState);
    this.enableDisableActions(enableActions);
    this.newTransactions = 0;

    for (var moneyIndex = 0; moneyIndex < gameState.currentTurn.money.length; ++moneyIndex) {
      var money = gameState.currentTurn.money[moneyIndex];
      if (money.status === MoneyStatus.NEW && money.totalTurnsOfRoute > 0) {
        this.newTransactions++;
      }
    }

    var self = this;
    this.updateTransferStatus();
    setTimeout(function() {self.updateTransferStatus();}, 3000);
  },

  // ---------------------------------------------------------------------------
  onFundsHighlighted: function(highlighted) {
    if (this.inputState === this.InputStates.NONE) {
      this.getNetworkController().onHighlightLeader(highlighted);
    }
  },

  // ---------------------------------------------------------------------------
  onNodeClicked: function(nodeID) {
    this.hub.broadcast(this.hub.messages.HIDE_NOTIFICATIONS);

    switch (this.inputState) {
      case this.InputStates.NONE:
        this.inputState = this.InputStates.PROPERTIES;
        this.hub.broadcast(this.hub.messages.CLEAR_HIGHLIGHTS);
        this.getNetworkController().displayNodeProperties(nodeID);
        break;
      case this.InputStates.PROPERTIES:
        //If the data is the same, then hide the property window (like a toggle button).
        //Otherwise, re-display the window using the new data
        this.hub.broadcast(this.hub.messages.HIDE_NODE_PROPERTIES);
        if (nodeID === this.selectedNode) {
          this.inputState = this.InputStates.NONE;
        }
        else {
          this.inputState = this.InputStates.PROPERTIES;
          this.getNetworkController().displayNodeProperties(nodeID);
        }
        break;
      case this.InputStates.ROUTES:
        this.getNetworkController().addNodeToRoute(nodeID);
        break;
      case this.InputStates.AGENT:
        //move the agent
        this.getNetworkController().moveAgent(this.selectedAgent, nodeID);
        this.hub.broadcast(this.hub.messages.DISPLAY_INFO_TEXT, {text:''});
        this.inputState = this.InputStates.NONE;
        break;
    }

    this.selectedNode = nodeID;
  },

  // ---------------------------------------------------------------------------
  onBackgroundClicked: function() {
    this.hub.broadcast(this.hub.messages.CANCEL_ACTIONS);
  },

  // ---------------------------------------------------------------------------
  onStartRoute: function() {
    if (this.newTransactions < BalanceValues.TERRORIST_MAX_TRANSACTIONS_PER_TURN) {
      this.inputState = this.InputStates.ROUTES;
      this.hub.broadcast(this.hub.messages.DISPLAY_INFO_TEXT, { text: 'Click on nodes to build the route' });
      this.getNetworkController().startRoute();
    }
    else {
      this.hub.broadcast(this.hub.messages.CANCEL_ACTIONS);
      this.hub.broadcast(this.hub.messages.DISPLAY_INFO_TEXT, { text: "Only 5 transactions allowed per turn.", color:'#ff0000' });
    }
  },

  // ---------------------------------------------------------------------------
  onEndRoute: function(data) {
    this.inputState = this.InputStates.NONE;
    this.hub.broadcast(this.hub.messages.DISPLAY_INFO_TEXT, { text:'' });
    // If this was a new transfer, increase our new transfer count
    if (data.newTransfer) {
      ++this.newTransactions;

      this.updateTransferStatus();
    }
  },

  // ---------------------------------------------------------------------------
  onTransferAmountChanged: function(data) {
    if (data != undefined) {
      this.hub.forwardRouteAmountChange(data);

      this.updateTransferStatus();
    }
  },

  // ---------------------------------------------------------------------------
  onTransferDeleted: function(moneyID) {
    --this.newTransactions;

    this.hub.forwardRouteDelete(moneyID);
    this.updateTransferStatus();
  },

  // ---------------------------------------------------------------------------
  onMoneySelected: function(money) {
    if (money.route.length > 0) {
      // If we click on money with a route, we can change the money's route
      this.inputState = this.InputStates.ROUTES;
      this.hub.broadcast(this.hub.messages.HIDE_NODE_PROPERTIES);
      this.hub.broadcast(this.hub.messages.DISPLAY_INFO_TEXT, { text:'Click on nodes to build a new route for this money' });
      this.getNetworkController().startRoute(money);
    }
  },

  // ---------------------------------------------------------------------------
  onAgentSelected: function(agentID) {
    if (this.inputState !== this.InputStates.ROUTES) {
      this.selectedAgent = agentID;
      this.inputState = this.InputStates.AGENT;
      this.hub.broadcast(this.hub.messages.CLEAR_HIGHLIGHTS);
      this.hub.broadcast(this.hub.messages.HIDE_NODE_PROPERTIES);
      this.hub.broadcast(this.hub.messages.HIDE_NOTIFICATIONS);
      this.hub.broadcast(this.hub.messages.DISPLAY_INFO_TEXT, { text:'Click on a node to move the agent to' });
      this.hub.broadcast(this.hub.messages.AGENT_ABOUT_TO_MOVE, agentID);
    }
  },

  // ---------------------------------------------------------------------------
  onNodeMouseEnter: function(nodeID) {
    if (this.inputState === this.InputStates.NONE) {
      this.getNetworkController().onHighlightNodeLinks(nodeID);
    }
  },

  // ---------------------------------------------------------------------------
  onNodeMouseLeave: function(nodeID) {
    if (this.inputState === this.InputStates.NONE) {
      this.hub.broadcast(this.hub.messages.CLEAR_HIGHLIGHTS);
    }
  },

  // ---------------------------------------------------------------------------
  onAgentMouseEnter: function(agentID) {
    if (this.inputState === this.InputStates.NONE) {
      this.getNetworkController().onHighlightAgentNode(agentID);
    }
  },

  // ---------------------------------------------------------------------------
  onAgentMouseLeave: function(agentID) {
    if (this.inputState === this.InputStates.NONE) {
      this.hub.broadcast(this.hub.messages.CLEAR_HIGHLIGHTS);
    }
  },

  //----------------------------------------------------------------------------
  onTransferMouseEnter: function (moneyId) {
    //A money transfer element is being moused over
    if (this.inputState === this.InputStates.NONE ||
        this.inputState === this.InputStates.PROPERTIES) {
      this.hub.broadcast(this.hub.messages.TRANSFER_SELECTED, moneyId);
    }
  },

  //----------------------------------------------------------------------------
  onTransferMouseLeave: function () {
    //A money transfer element was moused over
    if (this.inputState === this.InputStates.NONE ||
        this.inputState === this.InputStates.PROPERTIES) {
      this.hub.broadcast(this.hub.messages.CLEAR_HIGHLIGHTS);
    }
  },

  // ---------------------------------------------------------------------------
  onNotificationMoneyMouseEnter: function(moneyIDs) {
    if (this.inputState === this.InputStates.NONE) {
      this.getNetworkController().onHighlightMoneyLocations(moneyIDs);
    }
  },

  // ---------------------------------------------------------------------------
  onNotificationMoneyMouseLeave: function() {
    if (this.inputState === this.InputStates.NONE) {
      this.hub.broadcast(this.hub.messages.CLEAR_HIGHLIGHTS);
    }
  },

  // ---------------------------------------------------------------------------
  onNotificationNodeMouseEnter: function(nodeIDs) {
    if (this.inputState === this.InputStates.NONE) {
      this.getNetworkController().onHighlightNodes(nodeIDs);
    }
  },

  // ---------------------------------------------------------------------------
  onNotificationNodeMouseLeave: function() {
    if (this.inputState === this.InputStates.NONE) {
      this.hub.broadcast(this.hub.messages.CLEAR_HIGHLIGHTS);
    }
  },

  // ---------------------------------------------------------------------------
  onNotificationLinkMouseEnter: function(linkIDs) {
    if (this.inputState === this.InputStates.NONE) {
      this.getNetworkController().onHighlightLinks(linkIDs);
    }
  },

  // ---------------------------------------------------------------------------
  onNotificationLinkMouseLeave: function() {
    if (this.inputState === this.InputStates.NONE) {
      this.hub.broadcast(this.hub.messages.CLEAR_HIGHLIGHTS);
    }
  },

  // ---------------------------------------------------------------------------
  onCancelChanges: function(agentID) {
    switch (this.inputState) {
      case this.InputStates.PROPERTIES:
        this.hub.broadcast(this.hub.messages.CANCEL_NODE_PROPERTIES);
        this.hub.broadcast(this.hub.messages.HIDE_NODE_PROPERTIES);
        break;
      case this.InputStates.ROUTES:
        this.hub.broadcast(this.hub.messages.CANCEL_ROUTE);
        break;
      case this.InputStates.AGENT:
        this.hub.broadcast(this.hub.messages.CANCEL_AGENT_MOVE);
        break;
    }

    if (this.inputState !== this.InputStates.NONE) {
      this.hub.broadcast(this.hub.messages.DISPLAY_INFO_TEXT, { text:'' });
      this.hub.broadcast(this.hub.messages.CLEAR_HIGHLIGHTS);
      this.inputState = this.InputStates.NONE;
    }
  },

  //----------------------------------------------------------------------------
  onTurnSubmitted: function() {
    this.enableDisableActions(false);
    this.newTransactions = 0;
    this.inputState = this.InputStates.NONE;
  },

  //----------------------------------------------------------------------------
  onTurnCancelled: function() {
    this.newTransactions = 0;
    this.inputState = this.InputStates.NONE;
  },

  //----------------------------------------------------------------------------
  enableDisableActions: function(enabled) {
    if (enabled) {
      this.hub.broadcast(this.hub.messages.ENABLE_ACTIONS);
    } else {
      this.hub.broadcast(this.hub.messages.DISABLE_ACTIONS);
    }
  },

  // ---------------------------------------------------------------------------
  updateTransferStatus: function() {
    var self = this;
    setTimeout(function() {
      if (self.newTransactions < BalanceValues.TERRORIST_MAX_TRANSACTIONS_PER_TURN &&
          self.getNetworkController().hasReserves()) {
        self.hub.broadcast(self.hub.messages.ENABLE_TRANSFERS);
      } else {
        self.hub.broadcast(self.hub.messages.DISABLE_TRANSFERS);
      }
    }, 100);
  },

  // ---------------------------------------------------------------------------
  getNetworkController: function() {
    return Kernel.module.get('controller-network');
  }
});
