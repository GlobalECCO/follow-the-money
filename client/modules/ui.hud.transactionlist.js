/*******************************************************************************
 * Controls behavior for the terrorist network
 ******************************************************************************/
Kernel.module.define('UITransactionList', {

  templates: [{ file:'ui.transactionlist.html', property:'templateTransactionList' },
              { file:'ui.transactionitem.pending.html', property:'templatePendingTransactions' },
              { file:'ui.transactionitem.intransit.html', property:'templateInTransitTransactions' },
              { file:'ui.transactionitem.pending.none.html', property:'templateNoPendingTransactions' },
              { file:'ui.transactionitem.intransit.metersegment.html', property:'templateMeterSegment' },
              { file:'ui.transactionitem.intransit.none.html', property:'templateNoInTransitTransactions' }],

  ui: null,
  $inTransitContainer: null,
  $pendingTransactionContainer: null,

  inTransitElementRootName: null,
  pendingElementRootName: null,

  disabled: false,

  // ---------------------------------------------------------------------------
  init: function () {
    this.hub.listen(this.hub.messages.NEW_GAME_STATE, this.onNewGameState);
    this.hub.listen(this.hub.messages.UPDATE_GAME_STATE, this.onUpdateGameState);
    this.hub.listen(this.hub.messages.DISABLE_ACTIONS, this.onDisableActions);
    this.hub.listen(this.hub.messages.ENABLE_ACTIONS, this.onEnableActions);
    this.hub.listen(this.hub.messages.TRANSFER_MOUSE_ENTER, this.onHighlightOn);
    this.hub.listen(this.hub.messages.TRANSFER_MOUSE_LEAVE, this.onHighlightOff);
    $(window).on('resize.transactionList', this.onWindowResized);

    this.show();
  },

  // ---------------------------------------------------------------------------
  kill: function() {
    $(window).off('resize.transactionList');
    this.hide();
  },

  //-----------------------------------------------------------------------------
  onNewGameState: function (data) {
    this.process(data.currentTurn.money);
  },

  //----------------------------------------------------------------------------
  onUpdateGameState: function (data) {
    this.process(data.money, data.oldMoney);
  },

  //----------------------------------------------------------------------------
  onDisableActions: function () {
    this.disabled = true;
    this.disableButtons(this.disabled);
  },

  //----------------------------------------------------------------------------
  onEnableActions: function () {
    this.disabled = false;
    this.disableButtons(this.disabled);
  },

  // ---------------------------------------------------------------------------
  show: function(details) {
    this.render(details);
  },

  // ---------------------------------------------------------------------------
  hide: function() {
    this.ui.remove();
    this.ui = null;
    this.$inTransitContainer = null;
    this.$pendingTransactionContainer = null;
  },

  // ---------------------------------------------------------------------------
  render: function(details) {
    this.ui = $(this.templateTransactionList);
    this.ui.jScrollPane({
      showArrows: true,
      maintainPosition: true,
      mouseWheelSpeed: 100,
      verticalGutter: 8,
      hideFocus: true,
      });
    this.$inTransitContainer = this.ui.find('.inTransitTransactionsContainer');
    this.$pendingTransactionContainer = this.ui.find('.pendingTransactionsContainer');

    this.inTransitElementRootName = "." + $(this.templateInTransitTransactions).get(0).className;
    this.pendingElementRootName = "." + $(this.templatePendingTransactions).get(0).className;

    $(this.renderTo).append(this.ui);
  },

  //---------------------------------------------------------------------------
  process: function(moneyList, oldMoneyList) {
    var haveMoneyInTransit = false;
    var havePendingMoney = false;

    this.dirtyExistingElements();

    var reserves = 0;
    var totalAmountPending = 0; //amount of money pending
    var totalAmountInTransit = 0; //amount of money in transit

    for (var moneyIdx = 0; moneyIdx < moneyList.length; moneyIdx++) {
      var money = moneyList[moneyIdx];
      var oldMoney = null;
      if (oldMoneyList) {
        oldMoney = oldMoneyList[moneyIdx];
      }

      if (isMoneyInTransit(money)){
        this.createInTransitElementIfNeeded(money, oldMoney);
        haveMoneyInTransit = true;
        totalAmountInTransit += money.amount;
      }
      else if (isMoneyPending(money)) {
        this.createPendingElementIfNeeded(money);
        havePendingMoney = true;
        totalAmountPending += money.amount;
      }
      else if (isMoneyAvailableToTransfer(money)) {
        ++reserves;
      }
    }

    if (!haveMoneyInTransit) {
      //show the "None" element if there are no in-transit transactions
      this.$inTransitContainer.append($(this.templateNoInTransitTransactions));
    }

    if (!havePendingMoney) {
      //show the "None" element if there are no pending transactions
      this.$pendingTransactionContainer.append($(this.templateNoPendingTransactions));
    }

    this.$pendingTransactionContainer.children('.total-pending').text(dollarify(totalAmountPending));
    this.$inTransitContainer.children('.total-intransit').text(dollarify(totalAmountInTransit));

    // Disable all our buttons if we were told to disable ourselves
    if (this.disabled) {
      this.disableButtons(this.disabled);
    }
    // Disable all + buttons on pending transactions if we have no more reserves
    else if (reserves === 0) {
      this.ui.find('.transactionsItem-option-plus').addClass('Button-disabled');
    }

    this.ui.data('jsp').reinitialise();
  },

  //----------------------------------------------------------------------------
  onTransactionMouseOut: function (event) {
    this.hub.broadcast(this.hub.messages.TRANSFER_MOUSE_LEAVE);
  },

  //----------------------------------------------------------------------------
  onTransactionMouseIn: function (event) {
    //highlight the transaction's route
    var moneyObj = $(event.currentTarget).data('moneyObj');
    this.hub.broadcast(this.hub.messages.TRANSFER_MOUSE_ENTER, moneyObj.id);
  },

  //----------------------------------------------------------------------------
  onHighlightOn: function(moneyID) {
    var $existing = this.$inTransitContainer.children(this.inTransitElementRootName + ", " + this.pendingElementRootName).filter(function () {
      var data = $.data(this, 'moneyObj');
      if (data) {
        return data.id === moneyID;
      }
      return false;
    });

    if ($existing.length) {
      $existing.children('.transactionsItem').addClass('transactionsItem-hover');
    }
  },

  //----------------------------------------------------------------------------
  onHighlightOff: function() {
    var $existing = this.$inTransitContainer.children(this.inTransitElementRootName + ", " + this.pendingElementRootName).filter(function () {
      return $.data(this, 'moneyObj') !== -1;
    });

    if ($existing.length) {
      $existing.children('.transactionsItem').removeClass('transactionsItem-hover');
    }
  },

  //----------------------------------------------------------------------------
  onTransactionClick: function (event) {
    //Pretend like the node where the transaction currently is was clicked, to
    //display the node's property window. Also highlight the transaction's route.
    var moneyObj = $(event.currentTarget).data('moneyObj');
    if (moneyObj.status !== MoneyStatus.MOVING) {
      this.hub.broadcast(this.hub.messages.NODE_SELECTED, moneyObj.current);
      this.hub.broadcast(this.hub.messages.TRANSFER_MOUSE_ENTER, moneyObj.id);
    }
    event.stopPropagation();
  },

  //----------------------------------------------------------------------------
  onTransactionPlusClick: function (event) {
    var $button = $(event.currentTarget);
    if (!$button.hasClass('Button-disabled')) {
      var moneyObj = $button.parents(".transactionItemContainer").data('moneyObj');
      this.hub.broadcast(this.hub.messages.TRANSFER_AMOUNT_CHANGED, { moneyID: moneyObj.id, amount: 1 });
      event.stopPropagation();
    }
  },

  //----------------------------------------------------------------------------
  onTransactionMinusClick: function (event) {
    var $button = $(event.currentTarget);
    if (!$button.hasClass('Button-disabled')) {
      var moneyObj = $button.parents(".transactionItemContainer").data('moneyObj');
      this.hub.broadcast(this.hub.messages.TRANSFER_AMOUNT_CHANGED, { moneyID: moneyObj.id, amount: -1 });
      event.stopPropagation();
    }
  },

  //----------------------------------------------------------------------------
  onTransactionEditClick: function (event) {
    var $button = $(event.currentTarget);
    if (!$button.hasClass('Button-disabled')) {
      //edit the route of this existing money object
      var moneyObj = $button.parents(".transactionItemContainer").data('moneyObj');
      this.hub.broadcast(this.hub.messages.MONEY_SELECTED, moneyObj);
      event.stopPropagation();
    }
  },

  //----------------------------------------------------------------------------
  onTransactionDeleteClick: function (event) {
    var $button = $(event.currentTarget);
    if (!$button.hasClass('Button-disabled')) {
      var moneyObj = $button.parents(".transactionItemContainer").data('moneyObj');
      this.hub.broadcast(this.hub.messages.TRANSFER_DELETED, moneyObj.id);
      this.hub.broadcast(this.hub.messages.CLEAR_HIGHLIGHTS);
      event.stopPropagation();
    }
  },

  //----------------------------------------------------------------------------
  onTransactionResetClick: function (event) {
    var $button = $(event.currentTarget);
    if (!$button.hasClass('Button-disabled')) {
      var moneyObj = $button.parents(".transactionItemContainer").data('moneyObj');
      this.hub.forwardTransferReset(moneyObj.id);
      event.stopPropagation();
    }
  },

  // ---------------------------------------------------------------------------
  onWindowResized: function() {
    this.ui.data('jsp').reinitialise();
  },

  //---------------------------------------------------------------------------
  //Little util to create the text for the transaction elements
  generateTextForElement: function (money) {
    var text = dollarify(money.amount) + ' to ' + money.destination;

    //make some indication if this money's route has been modified
    if (money.hasBeenModified) {
      text += "*";
    }
    return text;
  },

  //-----------------------------------------------------------------------------
  createInTransitElementIfNeeded: function (data, oldData) {
    //see if there are any elements in the cache we can use
    var $existing = this.$inTransitContainer.children(this.inTransitElementRootName).filter(function () {
      return $.data(this, 'moneyObj') == -1;
    });

    var $ui = null;
    if ($existing.length) {
      $ui = $existing.eq(0);
    }
    else {
      //no existing element was found, we need to create a new one
      $ui = $(this.templateInTransitTransactions);
      $ui.hover(this.onTransactionMouseIn, this.onTransactionMouseOut);
      var $deleteButton = $ui.find(".transactionsItem-option-delete");
      var $editButton = $ui.find(".transactionsItem-option-edit");

      $ui.click(this.onTransactionClick);
      $deleteButton.click(this.onTransactionResetClick);
      $editButton.click(this.onTransactionEditClick);

      new Opentip($deleteButton[0],Tooltips.TRANSFERS.RESET.TEXT, Tooltips.TRANSFERS.RESET.TITLE);
      new Opentip($editButton[0],  Tooltips.TRANSFERS.REROUTE.TEXT, Tooltips.TRANSFERS.REROUTE.TITLE);

      this.$inTransitContainer.append($ui);
    }

    //set the money data on this element
    $ui.data('moneyObj', data);
    $ui.data('oldMoneyObj', oldData);

    //set the text
    $ui.find('.transactionsItem-text').text(this.generateTextForElement(data));

    //toggle the is-being-couriered icon
    $ui.find('.transactionItem-courier').toggleClass('item-hidden', !data.courierHired);

    var $deleteButton = $ui.find(".transactionsItem-option-delete");
    if (oldData && !this.compareRoutes(data.route, oldData.route)) {
      $deleteButton.removeClass('Button-disabled');
      $deleteButton.removeClass('transactionsItem-option-delete-disabled');
    }

    this.drawTimeRemainingMeter($ui, data.totalTurnsOfRoute, data.turnsTraveledOnRoute);
  },

  //-----------------------------------------------------------------------------
  compareRoutes: function(routeA, routeB) {
    if (routeA.length != routeB.length) {
      return false;
    }

    for (var routeIndex = 0; routeIndex < routeA.length; ++routeIndex) {
      if (routeA[routeIndex] != routeB[routeIndex]) {
        return false;
      }
    }

    return true;
  },

  //-----------------------------------------------------------------------------
  createPendingElementIfNeeded: function (data) {
    var $existing = this.$pendingTransactionContainer.children(this.pendingElementRootName).filter(function () {
      return $.data(this, 'moneyObj') == -1;
    });

    var $ui = null;
    if ($existing.length) {
      $ui = $existing.eq(0);
    }
    else {
      //no existing element was found, we need to create a new one
      $ui = $(this.templatePendingTransactions);
      $ui.hover(this.onTransactionMouseIn, this.onTransactionMouseOut);
      var $minusButton = $ui.find(".transactionsItem-option-minus");
      var $plusButton = $ui.find(".transactionsItem-option-plus");
      var $deleteButton = $ui.find(".transactionsItem-option-delete");
      var $editButton = $ui.find(".transactionsItem-option-edit");

      $minusButton.click(this.onTransactionMinusClick);
      $plusButton.click(this.onTransactionPlusClick);
      $deleteButton.click(this.onTransactionDeleteClick);
      $editButton.click(this.onTransactionEditClick);

      new Opentip($minusButton[0], Tooltips.TRANSFERS.DECREASE_FUNDS.TEXT, Tooltips.TRANSFERS.DECREASE_FUNDS.TITLE);
      new Opentip($plusButton[0],  Tooltips.TRANSFERS.INCREASE_FUNDS.TEXT, Tooltips.TRANSFERS.INCREASE_FUNDS.TITLE);
      new Opentip($deleteButton[0],Tooltips.TRANSFERS.CANCEL.TEXT, Tooltips.TRANSFERS.CANCEL.TITLE);
      new Opentip($editButton[0],  Tooltips.TRANSFERS.REROUTE.TEXT, Tooltips.TRANSFERS.REROUTE.TITLE);

      this.$pendingTransactionContainer.append($ui);
    }

    if (data.amount <= 1) {
      $ui.find('.transactionsItem-option-minus').addClass('Button-disabled');
    }
    $ui.data('moneyObj', data);
    $ui.find('.transactionsItem-pending').text(this.generateTextForElement(data));
  },

  //----------------------------------------------------------------------------
  dirtyExistingElements: function() {
    //the existing in-transit elements
    var $existing = this.$inTransitContainer.children(this.inTransitElementRootName);

    //also add in the pending elements
    var $existing2 = this.$pendingTransactionContainer.children(this.pendingElementRootName);

    var $combined = $.merge($existing, $existing2);
    $combined.remove();
  },

  //-----------------------------------------------------------------------------
  disableButtons: function (disabled) {
    //disable all editing buttons in the pending transaction container
    this.$pendingTransactionContainer.find('.Button').toggleClass('Button-disabled', disabled);
    this.$pendingTransactionContainer.find('.transactionsItem-option-delete').toggleClass('transactionsItem-option-delete-disabled', disabled);
    this.$pendingTransactionContainer.find('.transactionsItem-option-edit').toggleClass('transactionsItem-option-edit-disabled', disabled);

    this.$inTransitContainer.find('.Button').toggleClass('Button-disabled', disabled);
    this.$inTransitContainer.find('.transactionsItem-option-delete').toggleClass('transactionsItem-option-delete-disabled', disabled);
    this.$inTransitContainer.find('.transactionsItem-option-edit').toggleClass('transactionsItem-option-edit-disabled', disabled);
  },

  //-----------------------------------------------------------------------------
  getPendingMoneyIndex: function (money, pendingMoneyList) {
    for (var pendingIndex = 0; pendingIndex < pendingMoneyList.length; ++pendingIndex) {
      // Go through the list of pending money seeing if the given money has the
      // same route as any other money
      var pendingMoney = pendingMoneyList[pendingIndex];
      if (money.route.length === pendingMoney.route.length) {
        var sameRoute = true;
        for (var routeIndex = 0; routeIndex < money.route.length; ++routeIndex) {
          if (money.route[routeIndex] !== pendingMoney.route[routeIndex]) {
            // This money does not have the same route
            sameRoute = false;
            break;
          }
        }
        // If it has the same route, return the index into the pending money list
        if (sameRoute) {
          return pendingIndex;
        }
      }
    }
    return -1;
  },

  //-----------------------------------------------------------------------------
  drawTimeRemainingMeter: function (transactionItem, totalTurns, turnsCompleted) {
    var width = (100 / totalTurns).toString() + "%";
    transactionItem.find('.transactionsItem-progressMeter').empty();

    for (var i = 0; i < totalTurns; i++) {
      var $currentSegment = $(this.templateMeterSegment);
      $currentSegment.toggleClass('transactionsItem-progressMeter-segment-full', i < turnsCompleted);
      transactionItem.find('.transactionsItem-progressMeter').append($currentSegment);
      $currentSegment.width(width);
    };

  },
});
