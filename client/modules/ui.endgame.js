/*******************************************************************************
 * Controls behavior for the terrorist network
 ******************************************************************************/
Kernel.module.define('UIEndGame', {

  templates: [{ file:'endgame.statewins.chosewisely.html', property:'templateStateWinsChoseWisely' },
              { file:'endgame.statewins.terroristbroke.html', property:'templateStateWinsTerroristBroke' },
              { file:'endgame.statewins.starvedminions.html', property:'templateStateWinsStarvedMinions' },
              { file:'endgame.statewins.starvedleader.html', property:'templateStateWinsStarvedLeader' },
              { file:'endgame.terroristwins.chosepoorly.html', property:'templateTerroristWinsChosePoorly' },
              { file:'endgame.bythenumbers.html', property:'templateByTheNumbers' },
              { file:'endgame.terroristwins.fundedsuccessfully.html', property:'templateTerroristWinsFunded' }],

  ui: null,

  // ---------------------------------------------------------------------------
  init: function() {
    this.hub.listen(this.hub.messages.NEW_GAME_STATE, this.show);
    $(window).on('resize.endgame', this.onWindowResized);
  },

  // -------------------------------------------------------------------------
  kill: function () {
    $(window).off('resize.endgame');
    this.hide();
  },

  // ---------------------------------------------------------------------------
  show: function(data) {
    // Make sure the the ui hides if it's already up
    this.hide();
    this.render(data);
  },

  // ---------------------------------------------------------------------------
  hide: function() {
    if (this.ui !== undefined) {
      this.ui.remove();
      this.ui = undefined;
    }
  },

  //--------------------------------------------------------------------------
  amountOfMoneyAvailable: function (moneys) {
    var moneyAvailable = 0;
    for (var mIdx = 0; mIdx < moneys.length; mIdx++) {
      if (isMoneyAvailableToTransfer(moneys[mIdx])) {
        moneyAvailable += moneys[mIdx].amount;
      }
    }
    return moneyAvailable;
  },

  //-----------------------------------------------------------------------------
  numSuspectsIdentified: function (data) {
    var numKnown = 0;
    for (var known = 0; known < data.currentTurn.statePlayer.knownNodes.length; known++) {
      var nodeIdx = getIndexFromID(data.currentNetwork.nodes, data.currentTurn.statePlayer.knownNodes[known]);
      if (data.currentNetwork.nodes[nodeIdx].type === NodeTypes.TERRORIST ||
        data.currentNetwork.nodes[nodeIdx].type === NodeTypes.LEADER) {
        numKnown++;
      }
    }
    return numKnown;
  },

  // ---------------------------------------------------------------------------
  render: function (data) {
    var currentTurn = data.currentTurn;
    switch (currentTurn.gameEndReason) {
      case GameEndReason.STATE_CHOSE_WISELY:
        this.ui = $(this.templateStateWinsChoseWisely);
        break;
      case GameEndReason.STATE_CHOSE_POORLY:
        this.ui = $(this.templateTerroristWinsChosePoorly);
        break;
      case GameEndReason.TERRORIST_FUNDED:
        this.ui = $(this.templateTerroristWinsFunded);
        break;
      case GameEndReason.TERRORIST_LEADER_BROKE:
        this.ui = $(this.templateStateWinsStarvedLeader);
        break;
      case GameEndReason.TERRORIST_MINIONS_BROKE:
        this.ui = $(this.templateStateWinsStarvedMinions);
        break;
      case GameEndReason.TERRORIST_RAN_OUT_OF_MONEY:
        this.ui = $(this.templateStateWinsTerroristBroke);
        break;
    }

    var moneyAvailable = this.amountOfMoneyAvailable(currentTurn.money); //<how much money the terrorist funder had available to spend
    var numTurns = currentTurn.currentTurnNumber
    var funderMoneyInHand = dollarify(moneyAvailable);
    var funderReservesRemaining = dollarify(currentTurn.terroristPlayer.moneyReserve);
    var frozenFakeMoney = dollarify(currentTurn.statePlayer.amountOfFrozenFakeMoney);
    var frozenRealMoney = dollarify(currentTurn.statePlayer.amountOfFrozenRealMoney);
    var percNodesStateDiscovered = Math.round((currentTurn.statePlayer.knownNodes.length /
                                    data.currentNetwork.nodes.length) * 100) + "%";
    var numberOfIdentifiedSuspects = this.numSuspectsIdentified(data);

    var $byTheNumbers = $(this.templateByTheNumbers);
        $byTheNumbers.find('#numberOfTurns').text(numTurns.toString());
        $byTheNumbers.find('#funderReserves').text(funderReservesRemaining.toString());
        $byTheNumbers.find('#funderAvailable').text(funderMoneyInHand.toString());
        $byTheNumbers.find('#frozenLegit').text(frozenFakeMoney.toString());
        $byTheNumbers.find('#frozenTerror').text(frozenRealMoney.toString());
        $byTheNumbers.find('#nodesDiscovered').text(percNodesStateDiscovered.toString());
        $byTheNumbers.find('#suspectsIDed').text(numberOfIdentifiedSuspects.toString());

    this.ui.find('.article-subsection-text').append($byTheNumbers);

    //this.ui.click(this.hide);
    this.ui.find('.endGame-close-button').click(this.hide);
    $(this.renderTo).append(this.ui);

    // Setup the article scrollpane
    $articleContainer = this.ui.find('.article-container');
    $articleContainer.click(function(e) { e.stopPropagation(); });
    $articleContainer.jScrollPane({
      showArrows: true,
      maintainPosition: true,
      mouseWheelSpeed: 100,
      hideFocus: true,
    });

    this.ui.hide();
    this.ui.delay(3000);
    this.ui.fadeIn(500);
  },

  // ---------------------------------------------------------------------------
  onWindowResized: function() {
    if (this.ui !== undefined) {
      this.ui.find('.article-container').data('jsp').reinitialise();
    }
  },
});
