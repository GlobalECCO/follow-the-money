/*******************************************************************************
 * Controls behavior for the terrorist network
 ******************************************************************************/
Kernel.module.define('UIStateHUD', {

  templates: [{ file:'ui.state.hud.html', property:'templateStateHUD' },
              { file:'ui.state.hud.agent.html', property:'templateStateHUDagent' },
              { file:'playercard.blueagent.disabled.html', property:'templateAgentIncapacitated' },
              { file:'playercard.blueagent.following.html', property:'templateAgentFollowing' },
              { file:'playercard.blueagent.frozen.html', property:'templateAgentFrozen' },
              { file:'playercard.blueagent.lockdown.html', property:'templateAgentLockdown' },
              { file:'playercard.blueagent.monitoring.html', property:'templateAgentMonitoring' },
              { file:'separator.vertical.html', property:'templateVerticalSeparator' }],
  ui:null,
  actionsEnabled:true,

  // ---------------------------------------------------------------------------
  init: function() {
    var self = this;

    this.hub.listen(this.hub.messages.NEW_GAME_STATE, this.onNewGameState);
    this.hub.listen(this.hub.messages.UPDATE_GAME_STATE, this.onUpdatedGameState);
    this.hub.listen(this.hub.messages.ENABLE_ACTIONS, function() { self.actionsEnabled = true; });
    this.hub.listen(this.hub.messages.DISABLE_ACTIONS, function() { self.actionsEnabled = false; });
    this.hub.listen(this.hub.messages.AGENT_ABOUT_TO_MOVE, this.onAboutToMoveAgent);
    this.hub.listen(this.hub.messages.CLEAR_HIGHLIGHTS, this.onClearHighlights);
    this.show();
  },

  // ---------------------------------------------------------------------------
  kill: function() {
    this.hide();
  },

  // ---------------------------------------------------------------------------
  show: function(details) {
    this.render();
  },

  // ---------------------------------------------------------------------------
  hide: function() {
    this.ui.remove();
    this.ui = null;
  },

  // ---------------------------------------------------------------------------
  onNewGameState: function(data) {
    this.setAgents(data.currentTurn.statePlayer.agents, data.prevTurn? data.prevTurn.statePlayer.agents: undefined);
    this.setAmountOfFrozenMoney(data.currentTurn.statePlayer.amountOfFrozenRealMoney,
                                data.currentTurn.statePlayer.amountOfFrozenFakeMoney);
  },

  // ---------------------------------------------------------------------------
  onUpdatedGameState: function(data) {
    this.setAgents(data.statePlayer.agents);
    this.setAmountOfFrozenMoney(data.statePlayer.amountOfFrozenRealMoney,
                                data.statePlayer.amountOfFrozenFakeMoney);
  },

  // ---------------------------------------------------------------------------
  setAgents: function (agents, prevAgents) {
    var self = this;
    self.ui.children(".stateAgentOverview-AgentsContainer").empty();

    // Sort the agents with the given compare function
    agents.sort(self.agentLocationCompare);

    var $agentsContainer = self.ui.children(".stateAgentOverview-AgentsContainer");
    var currentLocation = -1;

    agents.forEach(function (agent) {
      // Add a vertical separator for every new group
      if (agent.location !== currentLocation) {
        currentLocation = agent.location;
        $agentsContainer.append($(self.templateVerticalSeparator));
      }

      var $agentContainer = $(self.templateStateHUDagent);
      $agentContainer.data('agent', agent);
      $agentContainer.hover(self.onAgentMouseIn, self.onAgentMouseOut);
      $agentContainer.click(self.onAgentSelected);

      $agentsContainer.append($agentContainer);
      var agentDiv;
      var toolTipText = "";
      var toolTipTitle = "";
      switch (agent.status) {
        case AgentStatus.FOLLOWING:
          agentDiv = $(self.templateAgentFollowing);
          toolTipText = Tooltips.NODES.AGENT_ICON_FOLLOWING.TEXT;
          toolTipTitle = Tooltips.NODES.AGENT_ICON_FOLLOWING.TITLE;
        break;
        case AgentStatus.FOCUSING:
          agentDiv = $(self.templateAgentMonitoring);
          toolTipText = Tooltips.NODES.AGENT_ICON_FOCUSING.TEXT;
          toolTipTitle = Tooltips.NODES.AGENT_ICON_FOCUSING.TITLE;
        break;
        case AgentStatus.FREEZING:
          agentDiv = $(self.templateAgentFrozen);
          toolTipText = Tooltips.NODES.AGENT_ICON_FREEZING.TEXT;
          toolTipTitle = Tooltips.NODES.AGENT_ICON_FREEZING.TITLE;
        break;
        case AgentStatus.INCAPACITATED:
          agentDiv = $(self.templateAgentIncapacitated);
          toolTipText = Tooltips.NODES.AGENT_ICON_INCAPACITATED.TEXT;
          toolTipTitle = Tooltips.NODES.AGENT_ICON_INCAPACITATED.TITLE;
        break;
        case AgentStatus.LOCKDOWN:
          agentDiv = $(self.templateAgentLockdown);
          toolTipText = Tooltips.NODES.AGENT_ICON_LOCKDOWN.TEXT;
          toolTipTitle = Tooltips.NODES.AGENT_ICON_LOCKDOWN.TITLE;
        break;
      }
      agentDiv.find('.playerCardPortrait-agentID').text(agent.id.toString());
      $agentContainer.append(agentDiv);
      toolTipText = toolTipText.concat(' ' + Tooltips.NODES.AGENT_ICON.TEXT);
      toolTipTitle = toolTipTitle.concat(' ' + Tooltips.NODES.AGENT_ICON.TITLE);
      new Opentip(agentDiv[0], toolTipText, toolTipTitle);

      self.setAgentMiniIcon($agentContainer, agent.previousStatus);
    });

    $agentsContainer.append($(self.templateVerticalSeparator));
  },

  //----------------------------------------------------------------------------
  setAgentMiniIcon: function($container, status) {
    // var $miniIcon = $container.find('.playerCard-previousTask');
    // $miniIcon.removeClass();
    // $miniIcon.addClass('playerCard-previousTask');
    // $miniIcon.addClass(getAgentIconClassForStatus(status));
  },

  //----------------------------------------------------------------------------
  //Display the amount of real money that's been frozen
  setAmountOfFrozenMoney: function (realMoneyFrozen, fakeMoneyFrozen) {
    var txt_realMoneyFrozen = dollarify(realMoneyFrozen);
    var txt_fakeMoneyFrozen = dollarify(fakeMoneyFrozen);
    this.ui.find('.stateAgentOverview-StatsContainer-frozenTerrorist-amount').text(txt_realMoneyFrozen);
    this.ui.find('.stateAgentOverview-StatsContainer-frozenNonTerrorist-amount').text(txt_fakeMoneyFrozen);
  },

  // ---------------------------------------------------------------------------
  render: function(details) {
    if (!this.ui) {
      this.ui = $(this.templateStateHUD);
      $(this.renderTo).append(this.ui);
    }
  },

  // ---------------------------------------------------------------------------
  onAgentMouseIn: function (event) {
    var agentId = $(event.currentTarget).data('agent').id;
    this.hub.broadcast(this.hub.messages.AGENT_MOUSE_ENTER, agentId);
    event.stopPropagation();
  },

  // ---------------------------------------------------------------------------
  onAgentMouseOut: function (event) {
    var agentId = $(event.currentTarget).data('agent').id;
    this.hub.broadcast(this.hub.messages.AGENT_MOUSE_LEAVE, agentId);
    event.stopPropagation();
  },

  // ---------------------------------------------------------------------------
  onAgentSelected: function (event) {
    if (this.actionsEnabled) {
      var agentId = $(event.currentTarget).data('agent').id;
      this.hub.broadcast(this.hub.messages.AGENT_SELECTED, agentId);
    }
    event.stopPropagation();
  },

  // ---------------------------------------------------------------------------
  onAboutToMoveAgent: function (agentID) {
    var $existing = this.ui.find('.stateAgentOverview-Agent').filter(function () {
      var agent = $.data(this, 'agent');
      return agent.status !== AgentStatus.INCAPACITATED && agent.id === agentID;
    });
    $existing.find('.playerCard-color-blue').addClass('playerCard-color-blue-select');
  },

  // ---------------------------------------------------------------------------
  onClearHighlights: function () {
    this.ui.find('.playerCard-color-blue').removeClass('playerCard-color-blue-select');
  },

  // ---------------------------------------------------------------------------
  agentLocationCompare: function(agentA, agentB) {
    if (agentA.location < agentB.location) {
      return -1;
    }
    else if (agentA.location > agentB.location) {
      return 1;
    }
    return 0;
  }
});
