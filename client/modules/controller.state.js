/*******************************************************************************
 * Handles any state specific game logic
 ******************************************************************************/
Kernel.module.define('StateController', {

  // ---------------------------------------------------------------------------
  init: function() {
    this.hub.listen(this.hub.messages.MONEY_AT_NODE, this.onMoneyAtNode);
  },

  // ---------------------------------------------------------------------------
  onMoneyAtNode: function(moneyData) {
    if (this.shouldDisplayAlert(moneyData)) {
      this.hub.broadcast(this.hub.messages.ALERT_AT_NODE, moneyData.node.id);
    }
  },

  //----------------------------------------------------------------------------
  shouldDisplayAlert: function (moneyData) {
    if (moneyData.money.status === MoneyStatus.SPOTTED) {
      return true;
    }
    return false;
  }
});
