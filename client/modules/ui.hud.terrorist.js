/*******************************************************************************
 * Controls behavior for the terrorist network
 ******************************************************************************/
Kernel.module.define('UITerroristHUD', {

  templates: [{ file:'ui.terrorist.hud.html', property:'templateTerroristHUD' }],
  lowWarning: 25,
  criticalWarning: 25,
  ui:null,

  // ---------------------------------------------------------------------------
  init: function() {
    this.hub.listen(this.hub.messages.NEW_GAME_STATE, this.show);
    this.hub.listen(this.hub.messages.UPDATE_GAME_STATE, this.onUpdateGameState);
    this.hub.listen(this.hub.messages.BALANCE_AT_NODE, this.onBalanceAtNode);
    this.render({
      progress:0,
      reserves:BalanceValues.TERRORIST_MONEY_RESERVES
    });
  },

  // ---------------------------------------------------------------------------
  kill: function() {
    this.hide();
  },

  // ---------------------------------------------------------------------------
  show: function(data) {
    this.setReserves(data.currentTurn.terroristPlayer.moneyReserve);
    this.setAvailable(data.currentTurn.money);
  },

  // ---------------------------------------------------------------------------
  onUpdateGameState : function (data) {
    this.setAvailable(data.money);
  },

  // ---------------------------------------------------------------------------
  onBalanceAtNode : function (data) {
    if (data.node.type === NodeTypes.LEADER) {
      this.setProgress(data.balance);
    }
  },

  // ---------------------------------------------------------------------------
  setAvailable : function (money) {
    var amount = 0;
    money.forEach(function(moneyInstance) {
      if (moneyInstance.status === MoneyStatus.NEW && moneyInstance.route.length === 0) {
        amount += moneyInstance.amount;
      }
    });

    $availableFill = this.ui.find('.terroristMainMeter-CurrentFunds-fill');
    $availableFill.width(((amount / BalanceValues.TERRORIST_MONEY_RESERVES) * 100.0).toString() + '%' );
    this.ui.find('.terroristMainMeter-CurrentFunds-text').text(dollarify(amount));
  },

  // ---------------------------------------------------------------------------
  setProgress : function (amount) {
    var self = this;
    $progressFill = this.ui.find('.terroristMainMeter-TransferredFunds-fill');
    $progressFill.width(((amount / BalanceValues.TERRORIST_MONEY_GOAL) * 100.0).toString() + '%' );
    this.ui.find('.terroristMainMeter-TransferredFunds-text').text(dollarify(amount));

    var $progress = this.ui.find('.terroristMainMeter-TransferredFunds');
    $progress.hover(function(obj) {
        self.hub.broadcast(self.hub.messages.FUNDS_HIGHLIGHTED, true);
    }, function(obj) {
        self.hub.broadcast(self.hub.messages.FUNDS_HIGHLIGHTED, false);
    });
  },

  // ---------------------------------------------------------------------------
  setReserves : function (amount) {
    var widthPct = (amount / BalanceValues.TERRORIST_MONEY_RESERVES) * 100.0;
    var fillMeterStyle = '';

    //var fillMeterStyle = widthPct < this.lowWarning ? 'terroristMainMeter-AvailableFunds-fill-low' : '';
    var fillMeterStyle = widthPct < this.criticalWarning ? 'terroristMainMeter-AvailableFunds-fill-critical' : fillMeterStyle;

    $reserveFill = this.ui.find('.terroristMainMeter-AvailableFunds-fill');
    $reserveText = this.ui.find('.terroristMainMeter-AvailableFunds-text');

    $reserveFill.width((widthPct).toString() + '%' );
    //$reserveFill.toggleClass('terroristMainMeter-AvailableFunds-fill-low', widthPct < this.lowWarning && widthPct >= this.criticalWarning);
    $reserveFill.toggleClass('terroristMainMeter-AvailableFunds-fill-critical', widthPct < this.criticalWarning);
    $reserveText.text(dollarify(amount));

    if (amount < 1) {
      $reserveText.hide();
    }
    else {
      $reserveText.show();
    }
  },

  // ---------------------------------------------------------------------------
  hide: function() {
    this.ui.remove();
    this.ui = null;
  },

  // ---------------------------------------------------------------------------
  render: function(data) {
    if (!this.ui) {
      this.ui = $(this.templateTerroristHUD);
      $(this.renderTo).append(this.ui);
      this.setProgress(data.progress);
      this.setReserves(data.reserves);
      this.setAvailable([]);
      this.ui.find('.terroristMainMeter-GoalFunds-text').text(dollarify(BalanceValues.TERRORIST_MONEY_GOAL));

      // These values never changes, set them here (needs moneybag conversion before display)
      //BalanceValues.TERRORIST_MONEY_RESERVES
      //BalanceValues.TERRORIST_MONEY_GOAL
    }
  }

});
