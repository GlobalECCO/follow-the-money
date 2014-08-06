/*******************************************************************************
 * Displays and controls chat functionality
 ******************************************************************************/

Kernel.module.define('UINotifications', {

  templates: [{ file: 'ui.notifications.html', property: 'templateNotifications' },
              { file: 'ui.notifications.icon.terrorist.followedmoney.bank.html', property: 'templateFollowedMoneyBank' },
              { file: 'ui.notifications.icon.terrorist.followedmoney.hawala.html', property: 'templateFollowedMoneyHawala' },
              { file: 'ui.notifications.icon.terrorist.frozenmoney.html', property: 'templateFrozenMoney' },
              { file: 'ui.notifications.icon.terrorist.poorterrorists.html', property: 'templatePoorTerrorists' },
              { file: 'ui.notifications.icon.terrorist.spottedmoney.bank.html', property: 'templateSpottedMoneyBank' },
              { file: 'ui.notifications.icon.terrorist.spottedmoney.hawala.html', property: 'templateSpottedMoneyHawala' },
              { file: 'ui.notifications.icon.terrorist.successfultransfers.html', property: 'templateSuccessfulTransfers' }],
  ui: null,

  // ---------------------------------------------------------------------------
  init: function() {
    this.hub.listen(this.hub.messages.NEW_GAME_STATE, this.onNewGameState);
  },

  // ---------------------------------------------------------------------------
  kill: function() {
    if (this.ui) {
      this.ui.remove();
      this.ui = null;
    }
  },

  // ---------------------------------------------------------------------------
  onNewGameState: function(gameData) {
    if (this.ui) {
      this.ui.remove();
      this.ui = null;
    }
    this.ui = $(this.templateNotifications);
    $(this.renderTo).append(this.ui);

    var notificationData = this.getNotificationData(gameData);
    this.setupFrozenMoneyUI(notificationData.frozenMoney, notificationData.totalAmountFrozen);
    this.setupPoorTerroristsUI(notificationData.poorTerrorists, gameData.currentNetwork);
    this.setupDepositsUI(notificationData.depositedMoney, gameData.currentNetwork);
    this.setupSpottedMoneyUI(notificationData.spottedMoney, gameData.currentNetwork);
    this.setupFollowedMoneyUI(notificationData.followedMoney, gameData.currentNetwork);
  },

  // ---------------------------------------------------------------------------
  getNotificationData: function(gameData) {
    var notificationData = {};

    // Tally up the frozen, spotted, and deposited money objects
    notificationData.frozenMoney = [];
    notificationData.totalAmountFrozen = 0;
    notificationData.spottedMoney = [];
    notificationData.depositedMoney = [];
    notificationData.followedMoney = [];
    for (var moneyIndex = 0; moneyIndex < gameData.currentTurn.money.length; ++moneyIndex) {
      var money = gameData.currentTurn.money[moneyIndex];
      if (money.status === MoneyStatus.FROZEN) {
        notificationData.frozenMoney.push(money.id);
        notificationData.totalAmountFrozen += money.amount;
      }
      else if (money.status === MoneyStatus.SPOTTED) {
        if (getIndexFromID(notificationData.spottedMoney, money.current) === -1) {
          notificationData.spottedMoney.push(money.current);
        }
      }
      else if (money.status === MoneyStatus.DEPOSITED) {
        var previouslyDepositedIndex = this.getMatchingLocationIndex(money.current, notificationData.depositedMoney);
        if (previouslyDepositedIndex === -1) {
          notificationData.depositedMoney.push({ current: money.current, amount: money.amount });
        }
        else {
          notificationData.depositedMoney[previouslyDepositedIndex].amount += money.amount;
        }
      }
      else if (money.agent > -1) {
        var moneyLocation = money.current;
        if (money.status === MoneyStatus.MOVING) {
          moneyLocation = gameData.currentNetwork.links[moneyLocation].nodes.start;
        }
        if (getIndexFromID(notificationData.followedMoney, moneyLocation) === -1) {
          notificationData.followedMoney.push(moneyLocation);
        }
      }
    }

    // Tally up the terrorists with a low balance
    notificationData.poorTerrorists = [];
    for (var balanceIndex = 0; balanceIndex < gameData.currentTurn.terroristPlayer.balances.length; ++balanceIndex) {
      var balance = gameData.currentTurn.terroristPlayer.balances[balanceIndex];
      if (balance !== null && 0 <= balance && balance < 5) {
        notificationData.poorTerrorists.push(balanceIndex);
      }
    }

    // Determine whether the button should animate due to the data or not
    notificationData.animateButton = notificationData.totalAmountFrozen > 0 ||
      notificationData.spottedMoney.length > 0 || notificationData.depositedMoney.length > 0 ||
      notificationData.poorTerrorists.length > 0;

    return notificationData;
  },

  // ---------------------------------------------------------------------------
  setupFrozenMoneyUI: function(frozenMoney, totalAmountFrozen) {
    if (frozenMoney.length > 0) {
      var $frozenMoneyInsert = $(this.templateFrozenMoney);
      $frozenMoneyInsert.find('.dollar-value').text(dollarify(totalAmountFrozen));
      this.ui.append($frozenMoneyInsert);
      this.reloadImage($frozenMoneyInsert.find('.notification-alert-animation'));
      $frozenMoneyInsert.data('money', frozenMoney);
      $frozenMoneyInsert.hover(this.onMoneyMouseIn, this.onMoneyMouseOut);
      new Opentip($frozenMoneyInsert[0], Tooltips.NOTIFICATIONS.FROZEN_MONEY.TEXT, Tooltips.NOTIFICATIONS.FROZEN_MONEY.TITLE);
    }
  },

  // ---------------------------------------------------------------------------
  setupPoorTerroristsUI: function(poorTerrorists, network) {
    if (poorTerrorists.length > 0) {
      var $poorTerroristsInsert = $(this.templatePoorTerrorists);
      $poorTerroristsInsert.find('.count-value').text(poorTerrorists.length.toString());
      this.ui.append($poorTerroristsInsert);
      this.reloadImage($poorTerroristsInsert.find('.notification-alert-animation'));
      $poorTerroristsInsert.data('nodes', poorTerrorists);
      $poorTerroristsInsert.hover(this.onNodeMouseIn, this.onNodeMouseOut);
      new Opentip($poorTerroristsInsert[0], Tooltips.NOTIFICATIONS.POOR_TERRORISTS.TEXT, Tooltips.NOTIFICATIONS.POOR_TERRORISTS.TITLE);
    }
  },

  // ---------------------------------------------------------------------------
  setupDepositsUI: function(depositedMoney, network) {
    for (var i = 0; i < depositedMoney.length; i++) {
      var $depositedMoneyNode = $(this.templateSuccessfulTransfers);
      $depositedMoneyNode.find('.dollar-value').text(dollarify(depositedMoney[i].amount));
      this.ui.append($depositedMoneyNode);
      this.reloadImage($depositedMoneyNode.find('.notification-alert-animation'));
      $depositedMoneyNode.data('nodes', [depositedMoney[i].current]);
      $depositedMoneyNode.hover(this.onNodeMouseIn, this.onNodeMouseOut);
      new Opentip($depositedMoneyNode[0], Tooltips.NOTIFICATIONS.DEPOSITED_MONEY.TEXT, Tooltips.NOTIFICATIONS.DEPOSITED_MONEY.TITLE);
    }
  },

  // ---------------------------------------------------------------------------
  setupSpottedMoneyUI: function(spottedMoney, network) {
    var spottedBanks = [], spottedHawalas = [];
    for (var i = 0; i < spottedMoney.length; i++) {
      var currentNode = network.nodes[spottedMoney[i]];
      switch (currentNode.type) {
        case NodeTypes.BANK: spottedBanks.push(currentNode.id);
        break;
        case NodeTypes.HAWALA: spottedHawalas.push(currentNode.id);
        break;
      };
    }
    if (spottedHawalas.length > 0) {
      $spottedMoneyHawala = $(this.templateSpottedMoneyHawala);
      $spottedMoneyHawala.find('.count-value').text(spottedHawalas.length.toString());
      this.ui.append($spottedMoneyHawala);
      this.reloadImage($spottedMoneyHawala.find('.notification-alert-animation'));
      $spottedMoneyHawala.data('nodes', spottedHawalas);
      $spottedMoneyHawala.hover(this.onNodeMouseIn, this.onNodeMouseOut);
      new Opentip($spottedMoneyHawala[0], Tooltips.NOTIFICATIONS.SPOTTED_HAWALA_MONEY.TEXT, Tooltips.NOTIFICATIONS.SPOTTED_HAWALA_MONEY.TITLE);
    }
    if (spottedBanks.length > 0) {
      var $spottedMoneyBank = $(this.templateSpottedMoneyBank);
      $spottedMoneyBank.find('.count-value').text(spottedBanks.length.toString());
      this.ui.append($spottedMoneyBank);
      this.reloadImage($spottedMoneyBank.find('.notification-alert-animation'));
      $spottedMoneyBank.data('nodes', spottedBanks);
      $spottedMoneyBank.hover(this.onNodeMouseIn, this.onNodeMouseOut);
      new Opentip($spottedMoneyBank[0], Tooltips.NOTIFICATIONS.SPOTTED_BANK_MONEY.TEXT, Tooltips.NOTIFICATIONS.SPOTTED_BANK_MONEY.TITLE);
    }
  },

  // ---------------------------------------------------------------------------
  setupFollowedMoneyUI: function(followedMoney, network) {
    if (followedMoney.length > 0) {
      var $followedMoney = $(this.templateFollowedMoneyBank);
      $followedMoney.find('.count-value').text(followedMoney.length.toString());
      this.ui.append($followedMoney);
      this.reloadImage($followedMoney.find('.notification-alert-animation'));
      $followedMoney.data('nodes', followedMoney);
      $followedMoney.hover(this.onNodeMouseIn, this.onNodeMouseOut);
      new Opentip($followedMoney[0], Tooltips.NOTIFICATIONS.FOLLOWED_MONEY.TEXT, Tooltips.NOTIFICATIONS.FOLLOWED_MONEY.TITLE);
    }
  },

  // ---------------------------------------------------------------------------
  onMoneyMouseIn: function(event) {
    var moneyIDs = $(event.currentTarget).data('money');
    this.hub.broadcast(this.hub.messages.NOTIFICATION_MONEY_MOUSE_ENTER, moneyIDs);
  },

  // ---------------------------------------------------------------------------
  onMoneyMouseOut: function(event) {
    this.hub.broadcast(this.hub.messages.NOTIFICATION_MONEY_MOUSE_LEAVE);
  },

  // ---------------------------------------------------------------------------
  onNodeMouseIn: function(event) {
    var nodeIDs = $(event.currentTarget).data('nodes');
    this.hub.broadcast(this.hub.messages.NOTIFICATION_NODE_MOUSE_ENTER, nodeIDs);
  },

  // ---------------------------------------------------------------------------
  onNodeMouseOut: function(event) {
    this.hub.broadcast(this.hub.messages.NOTIFICATION_NODE_MOUSE_LEAVE);
  },

  // ---------------------------------------------------------------------------
  // Get the index into the array of any object with the same current location
  // -1 if there isn't one
  getMatchingLocationIndex: function(nodeID, moneyList) {
    for (var moneyIndex = 0; moneyIndex < moneyList.length; ++moneyIndex) {
      if (moneyList[moneyIndex].current === nodeID) {
        return moneyIndex;
      }
    }
    return -1;
  },

  // ---------------------------------------------------------------------------
  reloadImage: function($div) {
    $div.toggleClass('notification-alert-animation-image');
    if ($div.hasClass('notification-alert-animation-image')) {

        /* Create an <img> element and give it the animated gif as a src.  To
           force a reload we add a date parameter to the URL */
        var img = document.createElement('img');
        img.src = "images/notification_alert_animation.gif?p" + new Date().getTime();

        /* Once the image has loaded, set it as the background-image */
        $(img).load(function(){
            $div.css({backgroundImage: "url("+img.src+")"});
            $div.css({backgroundColor: "transparent"});
        });

    /* Remove the background-image */
    } else {
       $div.css({backgroundImage: "none"});
    }
  },
});
