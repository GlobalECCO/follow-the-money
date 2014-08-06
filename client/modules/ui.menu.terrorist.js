/*******************************************************************************
 * Displays and controls submenus for each node type
 ******************************************************************************/
Kernel.module.define('UITerroristMenu', {
  extend: 'UIBaseMenu',

  templates: [{ file:'node.submenu.terrorist.html', property:'templateTerroristMenu' }],
  ui:null,

  // -------------------------------------------------------------------------
  init: function() {
    var messageToHideOn = [this.hub.messages.HIDE_NODE_PROPERTIES,
                           this.hub.messages.SUBMIT_TURN,
                           this.hub.messages.CANCEL_CHANGES,
                           this.hub.messages.NEW_GAME_STATE];

    this.hub.listen([this.hub.messages.DISPLAY_NODE_PROPERTIES], this.onTrigger);

    this.hub.listen(messageToHideOn, this.onHideProperties);
  },

  // -------------------------------------------------------------------------
  onTrigger: function(node) {
    if (node.type === NodeTypes.TERRORIST || node.type === NodeTypes.LEADER) {
      this.show(node);
    }
  },

  // -------------------------------------------------------------------------
  render: function(node) {
    if (node.balance >= 0) {
      this.ui = $(this.templateTerroristMenu);
      this.ui.data('data', node);
      this.ui.children('.playerCardViewHeading').html(node.name);

      // this.ui.find('.playerCardViewSubHeadingAlt').html(dollarify(maintenanceDetails.cost) + ' / ' + maintenanceDetails.time.toString() + ' Turns');

      // var timeTillDeduct = maintenanceDetails.turnsLeft % maintenanceDetails.time;
      // if (timeTillDeduct === 0) {
      //   timeTillDeduct = maintenanceDetails.time;
      // }
      // var paymentMessage_Surplus = 'Will Deduct <strong>' + dollarify(maintenanceDetails.cost) + '</strong> from Reserves in <strong>' + (timeTillDeduct).toString() + '</strong> Turns';
      // var paymentMessage_Critical = 'Needs <strong>' + dollarify(maintenanceDetails.cost) + '</strong> In <strong>' + (timeTillDeduct).toString() + '</strong> Turns';

      // var paymentMessage = maintenanceDetails.turnsLeft <= maintenanceDetails.time ? paymentMessage_Critical : paymentMessage_Surplus;

      // this.ui.find('.playerCardViewMaintenanceCostHeader').html(paymentMessage);
      // this.ui.find('.playerCardViewMaintenanceCostMeter').html(getPaymentMeterDivs(maintenanceDetails.time));
      // this.ui.find('.playerCardViewMaintenanceCostLabelRight').html(dollarify(node.balance));

      // this.ui.find('.playerCardViewSubHeading-Reserves').toggleClass('playerCardViewSubHeading-Reserves-critical', maintenanceDetails.turnsLeft <= 5);
      // this.ui.find('.playerCardViewSubHeading-Reserves').toggleClass('playerCardViewSubHeading-Reserves-full', 5 < maintenanceDetails.turnsLeft && maintenanceDetails.turnsLeft < 10);
      // this.ui.find('.playerCardViewMaintenanceCostLabelRight').toggleClass('playerCardViewSubHeading-Reserves-critical', maintenanceDetails.turnsLeft <= 5);
      // this.ui.find('.playerCardViewMaintenanceCostLabelLeft').toggleClass('playerCardViewSubHeading-Reserves-critical', maintenanceDetails.turnsLeft <= 5);

      $(this.renderTo).append(this.ui);

      $(this.ui).click(function(e){ e.stopPropagation(); });  // Prevent UI from hiding when clicking within the property box.
      // setPaymentMeter(this.ui, maintenanceDetails.turnsLeft, maintenanceDetails.time);

      this.positionMenu(node);

      // Make sure we don't occlude the node
      this.hub.broadcast(this.hub.messages.CHANGE_NODE_LAYER, { id: node.id, layer: 5 });
    }
    else {
      // If this terrorist is broke, then he is not selectable
      this.hub.broadcast(this.hub.messages.CANCEL_ACTIONS);
    }
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
});
