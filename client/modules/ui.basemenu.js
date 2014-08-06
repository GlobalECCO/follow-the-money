//The shared code that is used for all ui.menu.* files
Kernel.module.define('UIBaseMenu', {

  templates: [{ file: 'playercard.blueagent.disabled.html', property: 'incapacitatedAgentTemplate' },
              { file: 'playercard.blueagent.following.html', property: 'followingAgentTemplate' },
              { file: 'playercard.blueagent.frozen.html', property: 'freezingAgentTemplate' },
              { file: 'playercard.blueagent.lockdown.html', property: 'lockdownAgentTemplate' },
              { file: 'playercard.blueagent.monitoring.html', property: 'focusingAgentTemplate' }],

  // -------------------------------------------------------------------------
  init: function () {
  },

  // -------------------------------------------------------------------------
  kill: function () {
    this.hide();
  },

  // -------------------------------------------------------------------------
  onTrigger: function (node) {
    if (node.type === NodeTypes.BANK ||
        node.type === NodeTypes.HAWALA) {
      this.show(node);
    }
  },
  // -------------------------------------------------------------------------
  onHideProperties: function () {
    if (this.ui) {
      this.hide();
    }
  },
  //----------------------------------------------------------------------------
  onFadeProperties: function () {
    $('.nodeViewContainer').addClass('nodeViewContainer-faded');
    $('.nodeViewPointer-after').addClass('nodeViewPointer-after-faded');
    $('.nodeViewPointer-before').addClass('nodeViewPointer-before-faded');
  },

  //-----------------------------------------------------------------------------
  onStopFadeProperties: function () {
    $('.nodeViewContainer').removeClass('nodeViewContainer-faded');
    $('.nodeViewPointer-after').removeClass('nodeViewPointer-after-faded');
    $('.nodeViewPointer-before').removeClass('nodeViewPointer-before-faded');
  },

  // -------------------------------------------------------------------------
  show: function (node) {
    this.render(node);
    this.hub.broadcast(this.hub.messages.MENU_OPENED);
  },

  // -------------------------------------------------------------------------
  hide: function () {
    if (this.ui) {
      // Undo our changes for the purposes of this submenu
      var nodeID = this.ui.data('data').id;
      this.hub.broadcast(this.hub.messages.RESET_NODE_LAYER, { id: nodeID });

      this.ui.remove();
      this.ui = null;

      this.hub.broadcast(this.hub.messages.MENU_CLOSED);
    }
  },

  // -------------------------------------------------------------------------
  render: function (node) {
    var self = this;

    this.ui = $(this.templateBankMenu);
    this.ui.data('data', node);
    this.ui.children('.playerCardViewHeading').html(node.name);
    //this.ui.css('z-index', 1000);

    $(this.renderTo).append(this.ui);

    // current state/page
    this.drawInteractiveSection(node);

    // Prevent UI from hiding when clicking within the property box.
    this.ui.click(function (e) { e.stopPropagation(); });

    var width = parseInt(this.ui.css('width'), 10);
    var height = parseInt(this.ui.css('height'), 10);
    var xPos = node.position.x;
    var yPos = node.position.y;

    // Default top left corner.
    var marginLeft = 80;
    var marginTop = -50;

    // right side
    if (xPos > 55) {
      marginLeft = -width - 80;
      this.ui.find('.nodeViewPointer-before-left').removeClass('nodeViewPointer-before-left').addClass('nodeViewPointer-before-right');
      this.ui.find('.nodeViewPointer-after-left').removeClass('nodeViewPointer-after-left').addClass('nodeViewPointer-after-right');
    }

    // middle height
    if (yPos >= 40 && yPos <= 70) {
      marginTop = -(height / 2);
      this.ui.find('.nodeViewPointer-before, .nodeViewPointer-after').each(function() {
        $(this).css('top', (height / 2) - 20 + "px");
      });
    }

    // bottom height
    if (yPos > 70) {
      marginTop = -height + 40;
      this.ui.find('.nodeViewPointer-before, .nodeViewPointer-after').each(function() {
        $(this).css('top', height - 60 + "px");
      });
    }

    setPosition(this.ui, xPos, yPos, marginLeft, marginTop);

    // Make sure we don't occlude the node
    this.hub.broadcast(this.hub.messages.CHANGE_NODE_LAYER, { id: node.id, layer: 5 });
  },

  //----------------------------------------------------------------------------
  showAgents: function () {
    var node = this.ui.data('data');
    for (var a = 0; a < node.agents.length; a++) {
      var $ui;
      var toolTipText = "";
      var toolTipTitle = "";
      switch (node.agents[a].status) {
        case AgentStatus.FOCUSING:
          $ui = $(this.focusingAgentTemplate);
          toolTipText = Tooltips.NODES.AGENT_ICON_FOCUSING.TEXT;
          toolTipTitle = Tooltips.NODES.AGENT_ICON_FOCUSING.TITLE;
          break;
        case AgentStatus.FOLLOWING:
          $ui = $(this.followingAgentTemplate);
          toolTipText = Tooltips.NODES.AGENT_ICON_FOLLOWING.TEXT;
          toolTipTitle = Tooltips.NODES.AGENT_ICON_FOLLOWING.TITLE;
          break;
        case AgentStatus.FREEZING:
          $ui = $(this.freezingAgentTemplate);
          toolTipText = Tooltips.NODES.AGENT_ICON_FREEZING.TEXT;
          toolTipTitle = Tooltips.NODES.AGENT_ICON_FREEZING.TITLE;
          break;
        case AgentStatus.INCAPACITATED:
          $ui = $(this.incapacitatedAgentTemplate);
          toolTipText = Tooltips.NODES.AGENT_ICON_INCAPACITATED.TEXT;
          toolTipTitle = Tooltips.NODES.AGENT_ICON_INCAPACITATED.TITLE;
          break;
        case AgentStatus.LOCKDOWN:
          $ui = $(this.lockdownAgentTemplate);
          toolTipText = Tooltips.NODES.AGENT_ICON_LOCKDOWN.TEXT;
          toolTipTitle = Tooltips.NODES.AGENT_ICON_LOCKDOWN.TITLE;
          break;
      }

      var $miniIcon = $ui.find('.playerCard-previousTask');
      $miniIcon.removeClass();
      $miniIcon.addClass('playerCard-previousTask');
      $miniIcon.addClass(getAgentIconClassForStatus(node.agents[a].previousStatus));

      $ui.data('agent', node.agents[a]); //<referenced by classes that extend this
      $ui.click(this.onAgentSelected); //<implemented in classes that extend this
      $ui.find('.playerCardPortrait-agentID').text(node.agents[a].id.toString());
      toolTipText = toolTipText.concat(' ' + Tooltips.NODES.AGENT_ICON.TEXT);
      toolTipTitle = toolTipTitle.concat(' ' + Tooltips.NODES.AGENT_ICON.TITLE);
      new Opentip($ui[0], toolTipText, toolTipTitle);
      this.ui.find('.nodeViewAgentList').append($ui);
    }
  },
});
