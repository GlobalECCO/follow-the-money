/*******************************************************************************
 * Displays and controls menu for finance nodes
 ******************************************************************************/
Kernel.module.define('UIFinanceMenu', {
  extend: 'UIBaseMenu',

  templates: [{ file: 'node.submenu.bank.html', property:'templateBankMenu' },
              { file: 'node.submenu.hawala.html', property:'templateHawalaMenu' },
              { file: 'playercard.blueagent.disabled.html', property:'incapacitatedAgentTemplate' },
              { file: 'playercard.blueagent.following.html', property: 'followingAgentTemplate' },
              { file: 'playercard.blueagent.frozen.html', property: 'freezingAgentTemplate' },
              { file: 'playercard.blueagent.lockdown.html', property: 'lockdownAgentTemplate' },
              { file: 'playercard.blueagent.monitoring.html', property: 'focusingAgentTemplate' },
              { file: 'node.submenu.transfer.state.html', property: 'spottedMoneyTemplate' },
              { file: 'node.submenu.transfer.state.frozen.html', property: 'frozenMoneyTemplate' },
              { file: 'node.submenu.transfer.state.followed.html', property: 'followedMoneyTemplate' },
              { file: 'node.submenu.transfer.state.ignored.html', property: 'ignoredMoneyTemplate' }],
  ui:null,
  actionsEnabled:true,

  // -------------------------------------------------------------------------
  init: function() {
    var self = this;
    var messageToHideOn = [this.hub.messages.HIDE_NODE_PROPERTIES,
                           this.hub.messages.SUBMIT_TURN,
                           this.hub.messages.CANCEL_CHANGES,
                           this.hub.messages.NEW_GAME_STATE];

    this.hub.listen([this.hub.messages.DISPLAY_NODE_PROPERTIES], this.onTrigger);
    this.hub.listen(messageToHideOn, this.onHideProperties);
    this.hub.listen(this.hub.messages.ENABLE_ACTIONS, function() { self.actionsEnabled = true; });
    this.hub.listen(this.hub.messages.DISABLE_ACTIONS, function() { self.actionsEnabled = false; });
    this.hub.listen(this.hub.messages.TRANSFER_SELECTED, this.onFadeProperties);
    this.hub.listen(this.hub.messages.CLEAR_HIGHLIGHTS, this.onStopFadeProperties);
  },

  // -------------------------------------------------------------------------
  drawInteractiveSection: function(node) {
    // Wipe out the previous interactive section stuff
    this.ui.find('.nodeViewAgentList').empty();
    var $transferList = this.ui.find('.nodeViewTransferList');
    // Remove the jScrollablePane if it exists
    if ($transferList.data('jsp')) {
      $transferList.data('jsp').destroy();
      // For some reason, we have to re-find our jquery object since the children changed
      $transferList = this.ui.find('.nodeViewTransferList');
    }
    $transferList.empty();

    // Draw the given state with the current data
    this.showAttributes(node);

    // Add the lock down button if this is a hawala node
    if ((node.type === NodeTypes.HAWALA)) {
      this.ui.find('#lockdown').remove();
      this.setupLockdown(node);
    }
  },

  //----------------------------------------------------------------------------
  showAttributes: function(node) {
    this.ui.find('.nodeViewHeading').text('Activity');
    this.showAgents(node);
    this.showTransfers(node);
  },

  //----------------------------------------------------------------------------
  showTransfers: function(node) {
    //add the money transfer UI, for each money parked in this Node
    var height = 0;
    var $transferList = this.ui.find('.nodeViewTransferList');
    for (var m = 0; m < node.money.length; m++) {
      var ui = null;
      var money = node.money[m];
      if (money.status === MoneyStatus.SPOTTED) {
        ui = $(this.spottedMoneyTemplate);
        this.setupSpottedMoneyUI(ui, node.money[m], node.agents, node.type);
      }
      else if (money.status === MoneyStatus.FREEZING) {
        ui = $(this.frozenMoneyTemplate);
        this.setupUndoButton(ui, node.money[m]);
      }
      else if (money.status === MoneyStatus.FROZEN) {
        ui = $(this.frozenMoneyTemplate);
        // We can't undo this so hide the button
        ui.find('.nodeSubMenuTransfer-UndoButton').css('display', 'none');
      }
      else if (money.agent > -1) {
        ui = $(this.followedMoneyTemplate);
        this.setupUndoButton(ui, node.money[m]);
      }
      else {
        ui = $(this.ignoredMoneyTemplate);
        this.setupUndoButton(ui, node.money[m]);
      }
      ui.data('money', node.money[m]);
      ui.hover(this.onTransferMouseIn, this.onTransferMouseOut);

      ui.children('.nodeSubMenuTransferHeading').text(dollarify(node.money[m].amount));
      $transferList.append(ui);
      height += ui.outerHeight(true);
    }

    // Display the confidence level of at least one real money at this node
    if (node.money.length > 0) {
      var $subHeading = this.ui.find('.nodeViewSubHeading');
      $subHeading.addClass(this.getConfidenceLevel(node));
    }

    // Hide the buttons if actions are disabled
    var buttonVisibility = (this.actionsEnabled) ? 'display': 'none';
    this.ui.find('.nodeSubMenuTransferButtons-follow').css('display', buttonVisibility);
    this.ui.find('.nodeSubMenuTransferButtons-freeze').css('display', buttonVisibility);
    this.ui.find('.nodeSubMenuTransferButtons-ignore').css('display', buttonVisibility);
    this.ui.find('.nodeSubMenuTransfer-UndoButton').css('display', buttonVisibility);

    // Setup a scrollable area for the transfers
    $transferList.jScrollPane({
      showArrows: true,
      maintainPosition: true,
      mouseWheelSpeed: 100,
      hideFocus: true,
    });
  },

  //----------------------------------------------------------------------------
  setupLockdown: function (node) {
    var $ui = $(this.templateHawalaMenu);
    var lockdownAgentID = this.getAgentIDForLockdown(node.agents);

    this.ui.find('.nodeSubMenuTransferButtons-freeze').css('display', 'none');

    if (lockdownAgentID > -1) {
      $ui.data('data', node);
      $ui.click(this.onHawalaLockdown);
      if (node.agents[getIndexFromID(node.agents, lockdownAgentID)].status === AgentStatus.LOCKDOWN) {
        this.ui.find('.nodeSubMenuTransferButtons-follow').css('display', 'none');
        this.ui.find('.nodeSubMenuTransferButtons-ignore').css('display', 'none');
        $ui.addClass('Button-depressed');
      }
    }
    else if (this.actionsEnabled) {
      $ui.addClass('Button-disabled');
    }
    else {
      $ui.css('display', 'none');
    }
    $(this.ui).find('.nodeViewInteractiveSection').prepend($ui);
  },

  //----------------------------------------------------------------------------
  setupSpottedMoneyUI: function (ui, money, agents, nodeType) {
    var $followButton = ui.find('.nodeSubMenuTransferButtons-follow');
    if (this.canAgentPerformAction(money, agents, AgentStatus.FOLLOWING)) {
      $followButton.data('agents', agents);
      $followButton.data('money', money);
      $followButton.click(this.onFollowMoneyClick);
    }
    else {
      $followButton.addClass('Button-disabled');
    }
    var $freezeButton = ui.find('.nodeSubMenuTransferButtons-freeze');
    if (nodeType === NodeTypes.BANK && this.canAgentPerformAction(money, agents, AgentStatus.FREEZING)) {
      $freezeButton.data('agents', agents);
      $freezeButton.data('money', money);
      $freezeButton.click(this.onFreezeMoneyClick);
    }
    else {
      $freezeButton.addClass('Button-disabled');
    }
    var $ignoreButton = ui.find('.nodeSubMenuTransferButtons-ignore');
    $ignoreButton.data('moneyID', money.id);
    $ignoreButton.click(this.onIgnoreMoneyClick);
  },

  //----------------------------------------------------------------------------
  setupUndoButton: function (ui, money) {
    var $undoButton = ui.find('.nodeSubMenuTransfer-UndoButton');
    $undoButton.data('moneyID', money.id);
    $undoButton.click(this.onResetMoney);
    $undoButton.css('display', '');
  },

  //----------------------------------------------------------------------------
  onHawalaLockdown: function (event) {
    if (this.actionsEnabled) {
      var $element = $(event.currentTarget);
      // Find the agent to lock this node down
      var agentPerformingAction = this.getAgentIDForLockdown($element.data('data').agents);
      if (agentPerformingAction > -1) {
        this.hub.forwardHawalaLockdown(agentPerformingAction);
        this.drawInteractiveSection(this.ui.data('data'));
      }
    }
    event.stopPropagation();
  },

  //----------------------------------------------------------------------------
  onAgentSelected: function (event) {
    if (this.actionsEnabled) {
      var $element = $(event.currentTarget);
      this.hub.broadcast(this.hub.messages.AGENT_SELECTED, $element.data('agent').id);
    }
    event.stopPropagation();
  },

  // -------------------------------------------------------------------------
  onFollowMoneyClick: function(event) {
    var $button = $(event.target);
    var agents = $button.data('agents');
    var money = $button.data('money');

    var followingAgentID = this.getAgentIDForActionPerformer(money, agents, AgentStatus.FOLLOWING);
    if (followingAgentID > -1) {
      this.hub.forwardMoneyFollow({ agentID: followingAgentID, moneyID: money.id });
      this.drawInteractiveSection(this.ui.data('data'));
      this.hub.broadcast(this.hub.messages.MENU_FOLLOWED);
    }
  },

  // -------------------------------------------------------------------------
  onFreezeMoneyClick: function(event) {
    var $button = $(event.target);
    var agents = $button.data('agents');
    var money = $button.data('money');

    var freezingAgentID = this.getAgentIDForActionPerformer(money, agents, AgentStatus.FREEZING);
    if (freezingAgentID > -1) {
      this.hub.forwardMoneyFreeze({ agentID: freezingAgentID, moneyID: money.id });
      this.drawInteractiveSection(this.ui.data('data'));
      this.hub.broadcast(this.hub.messages.MENU_FROZEN);
    }
  },

  // -------------------------------------------------------------------------
  onIgnoreMoneyClick: function(event) {
    var $button = $(event.target);
    var moneyID = $button.data('moneyID');
    this.hub.forwardMoneyIgnore(moneyID);
    this.drawInteractiveSection(this.ui.data('data'));
    this.hub.broadcast(this.hub.messages.MENU_IGNORED);
  },

  // -------------------------------------------------------------------------
  onResetMoney: function(event) {
    var $button = $(event.target);
    var moneyID = $button.data('moneyID');
    this.hub.forwardMoneyReset(moneyID);
    this.drawInteractiveSection(this.ui.data('data'));
    this.hub.broadcast(this.hub.messages.MENU_UNDONE);
  },

  //----------------------------------------------------------------------------
  // The mouse is hovering over a transaction element.
  onTransferMouseIn: function(event) {
    var money = $(event.target).closest('.nodeSubMenuTransferContainer').data('money');
    this.hub.broadcast(this.hub.messages.TRANSFER_MOUSE_ENTER, money.id);
  },

  //----------------------------------------------------------------------------
  // The mouse just left a transaction element
  onTransferMouseOut: function (event) {
    this.hub.broadcast(this.hub.messages.TRANSFER_MOUSE_LEAVE);
  },

  // -------------------------------------------------------------------------
  // See if an agent is able to perform this action
  getAgentIDForLockdown: function(agents) {
    var agentIndex;
    // First see if an agent is already locking down this node
    for (agentIndex = 0; agentIndex < agents.length; ++agentIndex) {
      if (agents[agentIndex].status === AgentStatus.LOCKDOWN) {
        return agents[agentIndex].id;
      }
    }

    // Then see if we have any agent able to lock down the node
    for (agentIndex = 0; agentIndex < agents.length; ++agentIndex) {
      if (agents[agentIndex].status !== AgentStatus.INCAPACITATED &&
          agents[agentIndex].status !== AgentStatus.LOCKDOWN) {
        return agents[agentIndex].id;
      }
    }

    // No agent is available
    return -1;
  },

  // -------------------------------------------------------------------------
  // See if an agent is able to perform this action
  canAgentPerformAction: function(money, agents, action) {
    return this.getAgentIDForActionPerformer(money, agents, action) > -1;
  },

  // -------------------------------------------------------------------------
  // Get the agent ID for the first agent able to perform the given action
  getAgentIDForActionPerformer: function(money, agents, action) {
    // If there is already an agent performing this action on this money,
    // then no other agent can perform this action on the given money
    if (!this.hasAgentPerformingAction(money, agents, action)) {
      var agentIndex;
      // First, look for an agent who is 'idle'
      for (agentIndex = 0; agentIndex < agents.length; ++agentIndex) {
        if (agents[agentIndex].status === AgentStatus.FOCUSING) {
          return agents[agentIndex].id;
        }
      }
      // Then, look for an agent performing the other action type and not incapacitated
      for (agentIndex = 0; agentIndex < agents.length; ++agentIndex) {
        if (agents[agentIndex].status !== AgentStatus.INCAPACITATED &&
            agents[agentIndex].status !== action) {
          return agents[agentIndex].id;
        }
      }
      // Then, look for an agent performing this action on some other money
      for (agentIndex = 0; agentIndex < agents.length; ++agentIndex) {
        if (agents[agentIndex].status === action) {
          return agents[agentIndex].id;
        }
      }
    }
    // If all of this failed, then there isn't an agent able to perform this action
    return -1;
  },

  // -------------------------------------------------------------------------
  // See if there is already any agent performing the given action on the money
  hasAgentPerformingAction: function(money, agents, action) {
    for (var a = 0; a < agents.length; ++a) {
      if (agents[a].id === money.agent && agents[a].status === action) {
        return true;
      }
    }
    return false;
  },

  // -------------------------------------------------------------------------
  // Gets the confidence level of there being real money given this money count
  // and the probability of fake money at this node
  getConfidenceLevel: function(node) {
    var moneyCount = node.money.length;
    var fakeMoneyChance = node.fakeLeadProbability
    if (node.followedMoney || moneyCount > BalanceValues.FAKE_MONEY_MAX_AMOUNT) {
      return 'nodeViewConfidenceGuaranteed';
    }
    // Calculate the odds of a set amount of fake money
    var realMoneyOdds = 0;
    for (var fakeMoneyCount = 0; fakeMoneyCount < moneyCount; ++fakeMoneyCount) {
      realMoneyOdds += this.getOdds(fakeMoneyCount, fakeMoneyChance);
    }
    if (realMoneyOdds <= 30) {
      return 'nodeViewConfidenceLow';
    }
    else if (realMoneyOdds <= 75) {
      return 'nodeViewConfidenceMedium';
    }
    return 'nodeViewConfidenceStrong';
  },

  // -------------------------------------------------------------------------
  // Get the percent chance (0-100) of this number of fake money items occuring
  getOdds: function(fakeMoneyCount, fakeMoneyChance) {
    var maxFakeMoney = BalanceValues.FAKE_MONEY_MAX_AMOUNT;
    // Calculate the odds of this case happening
    var odds = Math.pow(fakeMoneyChance / 100, fakeMoneyCount) * Math.pow((100 - fakeMoneyChance) / 100, maxFakeMoney - fakeMoneyCount);
    // Calculate the number of ways to get this case
    var numCases = this.factorial(maxFakeMoney) / (this.factorial(fakeMoneyCount) * this.factorial(maxFakeMoney - fakeMoneyCount));
    return odds * 100 * numCases;
  },

  // -------------------------------------------------------------------------
  // Get the percent chance (0-100) of this number of fake money items occuring
  factorial: function(n) {
    if (n <= 1) {
      return 1;
    }
    return n * this.factorial(n - 1);
  },
});
