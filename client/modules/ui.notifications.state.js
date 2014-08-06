/*******************************************************************************
 * Displays and controls chat functionality
 ******************************************************************************/

Kernel.module.define('UINotifications', {

  templates: [{ file: 'ui.notifications.html', property: 'templateNotifications' },
              { file: 'ui.notifications.icon.state.discoverednode.bank.html', property: 'templateDiscoveredBank' },
              { file: 'ui.notifications.icon.state.discoverednode.hawala.html', property: 'templateDiscoveredHawala' },
              { file: 'ui.notifications.icon.state.discoverednode.terrorist.html', property: 'templateDiscoveredTerrorist' },
              { file: 'ui.notifications.icon.state.discoveredlink.html', property: 'templateDiscoveredLinks' },
              { file: 'ui.notifications.icon.state.frozenmoney.html', property: 'templateFrozenMoney' },
              { file: 'ui.notifications.icon.state.lostleads.html', property: 'templateLostLeads' },
              { file: 'ui.notifications.icon.state.trackedmoney.html', property: 'templateTrackedMoney' }],
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
    this.setupDiscoveredNodesUI(notificationData.discoveredNodes, gameData.currentNetwork);
    this.setupDiscoveredLinksUI(notificationData.discoveredLinks);
    this.setupTrackedMoneyUI(notificationData.depositedTerrorists, gameData.currentNetwork);
    this.setupLostLeadsUI(notificationData.lostMoney, gameData.currentNetwork);
  },

  // ---------------------------------------------------------------------------
  getNotificationData: function(gameData) {
    var notificationData = {};

    // Tally up the frozen money objects
    notificationData.frozenMoney = [];
    notificationData.totalAmountFrozen = 0;
    for (var moneyIndex = 0; moneyIndex < gameData.currentTurn.money.length; ++moneyIndex) {
      var money = gameData.currentTurn.money[moneyIndex];
      if (money.status === MoneyStatus.FROZEN) {
        notificationData.frozenMoney.push(money.id);
        notificationData.totalAmountFrozen += money.amount;
      }
    }

    // Tally up any recently discovered nodes
    notificationData.discoveredNodes = gameData.currentTurn.statePlayer.newlyDiscoveredNodes;
    notificationData.discoveredLinks = gameData.currentTurn.statePlayer.newlyDiscoveredLinks;

    // Tally up the terrorists that just received money this turn
    notificationData.depositedTerrorists = [];
    for (var trackedMoneyIndex = 0; trackedMoneyIndex < gameData.currentTurn.statePlayer.newlyTrackedMoney.length; ++trackedMoneyIndex) {
      var balance = gameData.currentTurn.statePlayer.newlyTrackedMoney[trackedMoneyIndex];
      if (balance > 0) {
        notificationData.depositedTerrorists.push({ nodeID: trackedMoneyIndex, balance: balance});
      }
    }

    // Tally up all money that was followed, but is not being followed anymore
    notificationData.lostMoney = gameData.currentTurn.statePlayer.lostLeadNodes;

    // Determine whether the button should animate due to the data or not
    notificationData.animateButton = notificationData.totalAmountFrozen > 0 ||
      notificationData.discoveredNodes.length > 0 || notificationData.discoveredNodes.length > 0 ||
      notificationData.depositedTerrorists.length > 0 || notificationData.lostMoney > 0;

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
  setupDiscoveredNodesUI: function(discoveredNodes, network) {
    var discoveredBanks = [], discoveredHawalas = [], discoveredTerrorists = [];
    for (var i = 0; i < discoveredNodes.length; i++) {
      var currentNode = network.nodes[discoveredNodes[i]];
      switch (currentNode.type) {
        case NodeTypes.BANK: discoveredBanks.push(currentNode.id);
        break;
        case NodeTypes.HAWALA: discoveredHawalas.push(currentNode.id);
        break;
        case NodeTypes.TERRORIST: discoveredTerrorists.push(currentNode.id);
        break;
      };
    }
    if (discoveredTerrorists.length > 0) {
      var $discoveredTerrorist = $(this.templateDiscoveredTerrorist);
      $discoveredTerrorist.find('.count-value').text(discoveredTerrorists.length.toString());
      this.ui.append($discoveredTerrorist);
      this.reloadImage($discoveredTerrorist.find('.notification-alert-animation'));
      $discoveredTerrorist.data('nodes', discoveredTerrorists);
      $discoveredTerrorist.hover(this.onNodeMouseIn, this.onNodeMouseOut);
      new Opentip($discoveredTerrorist[0], Tooltips.NOTIFICATIONS.DISCOVERED_TERRORISTS.TEXT, Tooltips.NOTIFICATIONS.DISCOVERED_TERRORISTS.TITLE);
    }
    if (discoveredHawalas.length > 0) {
      var $discoveredHawala = $(this.templateDiscoveredHawala);
      $discoveredHawala.find('.count-value').text(discoveredHawalas.length.toString());
      this.ui.append($discoveredHawala);
      this.reloadImage($discoveredHawala.find('.notification-alert-animation'));
      $discoveredHawala.data('nodes', discoveredHawalas);
      $discoveredHawala.hover(this.onNodeMouseIn, this.onNodeMouseOut);
      new Opentip($discoveredHawala[0], Tooltips.NOTIFICATIONS.DISCOVERED_HAWALAS.TEXT, Tooltips.NOTIFICATIONS.DISCOVERED_HAWALAS.TITLE);
    }
    if (discoveredBanks.length > 0) {
      var $discoveredBank = $(this.templateDiscoveredBank);
      $discoveredBank.find('.count-value').text(discoveredBanks.length.toString());
      this.ui.append($discoveredBank);
      this.reloadImage($discoveredBank.find('.notification-alert-animation'));
      $discoveredBank.data('nodes', discoveredBanks);
      $discoveredBank.hover(this.onNodeMouseIn, this.onNodeMouseOut);
      new Opentip($discoveredBank[0], Tooltips.NOTIFICATIONS.DISCOVERED_BANKS.TEXT, Tooltips.NOTIFICATIONS.DISCOVERED_BANKS.TITLE);
    }
  },

  // ---------------------------------------------------------------------------
  setupDiscoveredLinksUI: function(discoveredLinks) {
    if (discoveredLinks.length > 0) {
      var $discoveredLink = $(this.templateDiscoveredLinks);
      $discoveredLink.find('.count-value').text(discoveredLinks.length.toString());
      this.ui.append($discoveredLink);
      this.reloadImage($discoveredLink.find('.notification-alert-animation'));
      $discoveredLink.data('links', discoveredLinks);
      $discoveredLink.hover(this.onLinkMouseIn, this.onLinkMouseOut);
      new Opentip($discoveredLink[0], Tooltips.NOTIFICATIONS.DISCOVERED_LINKS.TEXT, Tooltips.NOTIFICATIONS.DISCOVERED_LINKS.TITLE);
    }
  },

  // ---------------------------------------------------------------------------
  setupTrackedMoneyUI: function(depositedTerrorists, network) {
    for (var i = 0; i < depositedTerrorists.length; i++) {
      var $trackedMoneyNode = $(this.templateTrackedMoney);
      $trackedMoneyNode.find('.dollar-value').text(dollarify(depositedTerrorists[i].balance));
      this.ui.append($trackedMoneyNode);
      this.reloadImage($trackedMoneyNode.find('.notification-alert-animation'));
      $trackedMoneyNode.data('nodes', [depositedTerrorists[i].nodeID]);
      $trackedMoneyNode.hover(this.onNodeMouseIn, this.onNodeMouseOut);
      new Opentip($trackedMoneyNode[0], Tooltips.NOTIFICATIONS.TRACKED_MONEY.TEXT, Tooltips.NOTIFICATIONS.TRACKED_MONEY.TITLE);
    }
  },

  // ---------------------------------------------------------------------------
  setupLostLeadsUI: function(lostMoney, network) {
    if (lostMoney.length > 0) {
      var $lostLeadNode = $(this.templateLostLeads);
      $lostLeadNode.find('.count-value').text(lostMoney.length.toString());
      this.ui.append($lostLeadNode);
      this.reloadImage($lostLeadNode.find('.notification-alert-animation'));
      $lostLeadNode.data('nodes', lostMoney);
      $lostLeadNode.hover(this.onNodeMouseIn, this.onNodeMouseOut);
      new Opentip($lostLeadNode[0], Tooltips.NOTIFICATIONS.LOST_LEADS.TEXT, Tooltips.NOTIFICATIONS.LOST_LEADS.TITLE);
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
  onLinkMouseIn: function(event) {
    var linkIDs = $(event.currentTarget).data('links');
    this.hub.broadcast(this.hub.messages.NOTIFICATION_LINK_MOUSE_ENTER, linkIDs);
  },

  // ---------------------------------------------------------------------------
  onLinkMouseOut: function(event) {
    this.hub.broadcast(this.hub.messages.NOTIFICATION_LINK_MOUSE_LEAVE);
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
