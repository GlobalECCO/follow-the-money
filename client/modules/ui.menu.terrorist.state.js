/*******************************************************************************
 * Displays and controls submenus for each node type
 ******************************************************************************/
Kernel.module.define('UITerroristForStateMenu', {
  extend: 'UIBaseMenu',
  templates: [{ file:'node.submenu.terrorist.state.html', property:'templateTerroristMenu' },
              { file: 'playercard.blueagent.disabled.html', property: 'incapacitatedAgentTemplate' },
              { file: 'playercard.blueagent.following.html', property: 'followingAgentTemplate' },
              { file: 'playercard.blueagent.frozen.html', property: 'freezingAgentTemplate' },
              { file: 'playercard.blueagent.lockdown.html', property: 'lockdownAgentTemplate' },
              { file: 'playercard.blueagent.monitoring.html', property: 'focusingAgentTemplate' }],
  ui:null,
  actionsEnabled:true,
  accusedNode:null,

  // -------------------------------------------------------------------------
  init: function () {
    var self = this;
    var messageToHideOn = [this.hub.messages.HIDE_NODE_PROPERTIES,
                           this.hub.messages.SUBMIT_TURN,
                           this.hub.messages.CANCEL_CHANGES,
                           this.hub.messages.NEW_GAME_STATE];

    this.hub.listen([this.hub.messages.DISPLAY_NODE_PROPERTIES], this.onTrigger);
    this.hub.listen(messageToHideOn, this.onHideProperties);
    this.hub.listen(this.hub.messages.ENABLE_ACTIONS, function() { self.actionsEnabled = true; });
    this.hub.listen(this.hub.messages.DISABLE_ACTIONS, function () { self.actionsEnabled = false; });
  },

  // -------------------------------------------------------------------------
  onTrigger: function(node) {
    if (node.type === NodeTypes.TERRORIST) {
      this.show(node);
    }
  },

  // -------------------------------------------------------------------------
  render: function(node) {

    this.ui = $(this.templateTerroristMenu);
    this.ui.data('data', node);
    this.ui.find('.playerCardViewHeading').html(node.name);
    $accuseButton = this.ui.find('#accuse');
    if (this.actionsEnabled) {
      $accuseButton.click(this.onAccuse);
      $accuseButton.toggleClass('Button-depressed', this.accusedNode === node.id);
      this.ui.find('#accuseWarning').toggleClass('playerCard-accuse-Warning', this.accusedNode === node.id);
    }
    else {
      $accuseButton.addClass('Button-disabled');
    }

    // Display how much money has been seen getting to this terrorist
    this.ui.find('#trackedMoney').html(dollarify(node.trackedMoney));

    this.showAgents();

    $(this.renderTo).append(this.ui);
    $(this.ui).click(function(e){e.stopPropagation();}); // Prevent UI from hiding when clicking within the property box.

    this.positionMenu(node);

    // Make sure we don't occlude the node
    this.hub.broadcast(this.hub.messages.CHANGE_NODE_LAYER, { id: node.id, layer: 5 });
  },

  // -------------------------------------------------------------------------
  positionMenu: function(node) {
    var width = parseInt(this.ui.css('width'), 10);
    var height = parseInt(this.ui.css('height'), 10);
    var xPos = node.position.x;
    var yPos = node.position.y;

    // Default top left corner.
    var marginLeft = -width - 75;
    var marginTop = -50;

    // middle height
    if (yPos >= 40 && yPos <= 70) {
      marginTop = -(height / 2) - 8;
      this.ui.find('.nodeViewPointer-before, .nodeViewPointer-after').each(function() {
        $(this).css('top', (height / 2) - 12 + "px");
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
  },

  //----------------------------------------------------------------------------
  onAgentSelected: function (event) {
    if (this.actionsEnabled) {
      var $element = $(event.currentTarget);
      this.hub.broadcast(this.hub.messages.AGENT_SELECTED, $element.data('agent').id);
    }
    event.stopPropagation();
  },

  //----------------------------------------------------------------------------
  onAccuse: function (event) {
    if (this.actionsEnabled) {
      var nodeID = this.ui.data('data').id;
      if (this.accusedNode === nodeID) {
        this.accusedNode = undefined;
      }
      else {
        this.accusedNode = nodeID;
      }

      this.ui.find('#accuse').toggleClass('Button-depressed', this.accusedNode !== undefined);
      this.ui.find('#accuseWarning').toggleClass('playerCard-accuse-Warning', this.accusedNode !== undefined);

      var $element = $(event.currentTarget);
      this.hub.forwardTerroristAccuse(this.accusedNode);
    }
    event.stopPropagation();
  }
});
