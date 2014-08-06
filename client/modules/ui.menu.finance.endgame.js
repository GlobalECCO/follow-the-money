/*******************************************************************************
 * Displays and controls menu for finance nodes
 ******************************************************************************/
Kernel.module.define('UIFinanceMenu', {
  extend: 'UIBaseMenu',

  templates: [{ file: 'node.submenu.bank.html', property:'templateBankMenu' },
              { file: 'playercard.blueagent.disabled.html', property: 'incapacitatedAgentTemplate' },
              { file: 'playercard.blueagent.following.html', property: 'followingAgentTemplate' },
              { file: 'playercard.blueagent.frozen.html', property: 'freezingAgentTemplate' },
              { file: 'playercard.blueagent.lockdown.html', property: 'lockdownAgentTemplate' },
              { file: 'playercard.blueagent.monitoring.html', property: 'focusingAgentTemplate' },
              { file: 'node.submenu.transfer.state.frozen.html', property: 'frozenMoneyTemplate' },
              { file: 'node.submenu.transfer.state.followed.html', property: 'followedMoneyTemplate' },
              { file: 'node.submenu.transfer.terrorist.html', property: 'moneyTemplate' },
              { file: 'node.submenu.transfer.terrorist.courier.html', property: 'courierMoneyTemplate' }],
  ui:null,
  viewState:-1,
  actionsEnabled:true,

  // -------------------------------------------------------------------------
  init: function() {
    var self = this;
    var messagesToHideOn = [this.hub.messages.HIDE_NODE_PROPERTIES,
                           this.hub.messages.SUBMIT_TURN,
                           this.hub.messages.CANCEL_CHANGES,
                           this.hub.messages.NEW_GAME_STATE];

    this.hub.listen([this.hub.messages.DISPLAY_NODE_PROPERTIES], this.onTrigger);
    this.hub.listen(messagesToHideOn, this.onHideProperties);
    this.hub.listen(this.hub.messages.ENABLE_ACTIONS, function() { self.actionsEnabled = true; });
    this.hub.listen(this.hub.messages.DISABLE_ACTIONS, function () { self.actionsEnabled = false; });
    this.hub.listen(this.hub.messages.TRANSFER_SELECTED, this.onFadeProperties);
    this.hub.listen(this.hub.messages.CLEAR_HIGHLIGHTS, this.onStopFadeProperties);
  },

  // -------------------------------------------------------------------------
  drawInteractiveSection: function() {
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
    this.showAttributes();
  },

  //----------------------------------------------------------------------------
  showAttributes: function () {
    this.ui.find('.nodeViewHeading').text('Activity');
    this.showAgents();
    this.showTransfers();
  },

  //----------------------------------------------------------------------------
  showTransfers: function () {
    //add the money transfer UI, for each money parked in this Node
    var $transferList = this.ui.find('.nodeViewTransferList');
    var node = this.ui.data('data');
    for (var m = 0; m < node.money.length; m++) {
      var ui = null;
      var money = node.money[m];
      if (money.status === MoneyStatus.FREEZING ||
          money.status === MoneyStatus.FROZEN) {
        ui = $(this.frozenMoneyTemplate);
      }
      else if (money.courierHired === true) {
        ui = $(this.courierMoneyTemplate);
      }
      else if (money.agent > -1) {
        ui = $(this.followedMoneyTemplate);
      }
      else {
        ui = $(this.moneyTemplate);
        ui.find('.nodeSubMenuTransferSubHeading').text('to ' + money.destination);
      }
      this.hideButtons(ui);

      ui.data('money', money);
      ui.hover(this.onTransferMouseIn, this.onTransferMouseOut);

      ui.children('.nodeSubMenuTransferHeading').text(dollarify(money.amount));
      ui.children('.nodeSubMenuTransferSubHeading').text("to " + money.destination);
      $transferList.append(ui);
    }

    // Setup a scrollable area for the transfers
    $transferList.jScrollPane({
      showArrows: true,
      maintainPosition: true,
      mouseWheelSpeed: 100,
      hideFocus: true,
    });
  },

  //----------------------------------------------------------------------------
  hideButtons: function (ui) {
    ui.find('.nodeSubMenuTransfer-UndoButton').css('display', 'none');
    ui.find('.nodeSubMenuTransferButtons-reroute').css('display', 'none');
    ui.find('.nodeSubMenuTransferButtons-courier').css('display', 'none');
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
});
