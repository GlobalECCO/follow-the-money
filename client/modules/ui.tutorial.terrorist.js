/*******************************************************************************
 * Displays and controls menu for finance nodes
 ******************************************************************************/
Kernel.module.define('UITutorialTerrorist', {
  extend: 'UITutorial',

  // -------------------------------------------------------------------------
  init: function() {
    this.hub.listen(this.hub.messages.CHANGE_GAME_STATE, this.onNewGameState);
    this.hub.listen(this.hub.messages.TUTORIAL_RESTART, this.onTutorialRestart);
    this.hub.listen(this.hub.messages.TUTORIAL_FINISHED, this.onTutorialFinished);

    this.startTutorialTurnOne();
  },

  // -------------------------------------------------------------------------
  startTutorialTurnOne: function() {
    this.tutorialSteps = [
      // Step 1: Goals
      [{
        el: '.terroristMainMeter-AvailableFunds-fill',
        tip: {
          title: 'Future Funds',
          content: 'This is the total money you have to fund the attack.  You lose if this and your available funds run out before the attack is funded.',
          tipJoint: 'top',
          offset: [-50, 0]
        },
        action: null,
        delay: 1000,
      },

      {
        el: '.terroristMainMeter-CurrentFunds-fill',
        tip: {
          title: 'Available Funds',
          content: 'This is how much money you can transfer this turn.  Each turn, $6,000 will be added to this from the remaining future funds.',
          tipJoint: 'top'
        },
        action: null,
        delay: 2000,
      },

      {
        el: '.terroristMainMeter-TransferredFunds',
        tip: {
          title: 'Goal Funds',
          content: 'This is how much money the terrorist leader currently has.  You win if this reaches $25,000.',
          tipJoint: 'top right',
          offset: [120, -20],
          stemLength: 220
        },
        action: null,
        delay: 2000,
      },

      {
        el: '#Node-9, #Node-10, #Node-11',
        tip: {
          title: 'Terrorists',
          content: 'These are the terrorists you are funding.  If any of them run out of money, you lose.',
          tipJoint: 'right'
        },
        action: null,
        grouped: true,
        delay: 2000,
      },

      {
        el: '#Node-11',
        tip: {
          title: 'Leader',
          content: 'This is the terrorist leader.  If the State arrests him, you lose.',
          tipJoint: 'right',
          offset: [10, 0]
        },
        action: null,
        delay: 2000,
      },

      {
        el: '#Node-0',
        tip: {
          title: 'Funder',
          content: 'This is the funder, the source of all transactions.  <b>Click</b> on him to start making a transaction.',
          tipJoint: 'left'
        },
        delay: 3000,
      }],

      // Step 2: Start Route
      [{
        el: '#Node-1, #Node-5',
        tip: {
          title: 'Hawala Network',
          content: 'The top half of the network is made up of Hawalas.  State agents will automatically stop following transactions after one transfer.  However, a single agent can freeze all transactions here.',
          tipJoint: 'left'
        },
        action: null,
        grouped: true,
      },

      {
        el: '#Node-2, #Node-3, #Node-4, #Node-6, #Node-7, #Node-8',
        tip: {
          title: 'Bank Network',
          content: 'The bottom half of the network is made up of Banks.  State agents will follow transactions all the way to the terrorist it\'s heading to unless you hire a courier.  However, a state agent can only freeze a single transaction at a time.',
          tipJoint: 'left'
        },
        action: null,
        grouped: true,
        delay: 2000,
      },

       {
        el: '#Node-2',
        tip: {
          content: '<b>Click</b> on this Bank to start the route for your transaction.',
          tipJoint: 'right'
        },
        delay: 3000,
      }],

      // Step 3: Continue Route
      [{
        el: '#Link-5',
        tip: {
          title: 'Solid Link',
          content: 'A transaction will take one turn to travel on a solid line.',
          tipJoint: 'bottom'
        },
        action: null,
      },

      {
        el: '[id=Link-6]', // Both lines of the dashed link have the same id, so we can't use #Link-6
        action: null,
        delay: 1500,
      },

       {
        el: '#Tween-6',
        tip: {
          title: 'Dashed Link',
          content: 'A transaction will take two turns to travel on a dashed line.',
          tipJoint: 'top right'
        },
        action: null,
      },

       {
        el: '#Node-6, #Node-7',
        tip: {
          content: '<b>Click</b> on a valid Bank to continue building your route.',
          tipJoint: 'left'
        },
        delay: 3000,
      }],

      // Step 4: Finish Route
      [{
        el: '.playerCard-fundsOverview:eq(1)',
        tip: {
          title: 'Terrorist Maintenance',
          content: 'Each terrorists\' funds will drop by $1,000 each turn, so make sure to send some money to each of them so they don\'t run out.',
          tipJoint: 'right'
        },
        action: null,
      },

       {
        el: '.chart-balance:eq(1)',
        tip: {
          title: 'Funds Graph',
          content: 'This graph shows an estimate of the funds a terrorist will have in future turns based on pending and in-transit transactions.',
          tipJoint: 'bottom right'
        },
        action: null,
        delay: 2000,
      },

      {
        el: '#Node-11',
        tip: {
          content: '<b>Click</b> on the leader to finish creating the route.',
          tipJoint: 'right'
        },
        delay: 3000,
      }],

      // Step 5: Finish Transaction
      [{
        el: '.makeTransferContainer',
        action: null,
      },

      {
        el: '.makeTransferLineItem-buttonLess, makeTransferLineItem-buttonMore',
        tip: {
          title: 'Set Amount',
          content: 'You can change the amount of the transaction using these buttons.',
          tipJoint: 'bottom',
          offset: [12, 10],
          stemLength: 70
        },
        action: null,
      },

      {
        el: '.makeTransferSubmitButton',
        tip: {
          content: '<b>Click</b> here to finish creating your transaction.',
          tipJoint: 'right'
        },
        delay: 3000,
      }],

      // Step 6: Finish Turn
      [{
        el: '.pendingTransactionsContainer',
        tip: {
          title: 'Pending Transactions',
          content: 'Transactions created this turn appear here.  Up to five new transactions can be created per turn.  <br>' +
            '<br><span class="staticButton transactionsItem-optionButtons transactionsItem-option-delete-static" style="width:14px; height:20px"></span>&nbsp;&nbsp;&nbsp;Remove' +
            '<br><span class="staticButton transactionsItem-optionButtons transactionsItem-option-edit-static" style="width:14px; height:20px"></span>&nbsp;&nbsp;&nbsp;Reroute' +
            '<br><span class="staticButton transactionsItem-optionButtons transactionsItem-option-minus" style="width:14px; height:20px">-</span>&nbsp;&nbsp;&nbsp;Reduce Amount' +
            '<br><span class="staticButton transactionsItem-optionButtons transactionsItem-option-plus" style="width:14px; height:20px">+</span>&nbsp;&nbsp;&nbsp;Increase Amount',
          tipJoint: 'left',
          offset: [-20, 0]
        },
        action: null,
      },

      {
        el: '.inTransitTransactionsContainer',
        tip: {
          title: 'In-Transit Transactions',
          content: 'Transactions made on previous turns appear here.',
          tipJoint: 'left',
          offset: [-20, 20]
        },
        action: null,
        delay: 2000,
      },

      {
        el: '.playerStatus',
        tip: {
          title: 'Game Turns',
          content: 'Both players take turns simultaneously in this game.  You can see which player has taken their turn and is waiting for the other player to finish their turn here.',
          offset: [30, -15]
        },
        action: null,
        delay: 2000,
      },

      {
        el: '.submitButton',
        tip: {
              content: '<b>Click</b> here to finish your turn.'
        },
        shallowCopy: true,
        callback: this.startTutorialTurnTwo,
        delay: 3000,
      }]
    ];
  },

  // -------------------------------------------------------------------------
  startTutorialTurnTwo: function() {
    this.tutorialSteps = [
      // Step 7: Money Spotted
      [{
        el: '.notifications-icon',
        tip: {
          title: 'Notifications',
          content: 'At the beginning of every turn, notifications for significant events appear here.<br>' +
                   '<br><div class="notifications-icon notifications-icon-image-hawala"><div class="count-value" style="width: 14px; height:14px; line-height:10px">X</div><div class="notifications-icon-sub notifications-icon-spotted" style="width: 18px; height:18px;"></div></div> Hawala Transaction(s) Spotted' +
                   '<br><div class="notifications-icon notifications-icon-image-bank"><div class="count-value" style="width: 14px; height:14px; line-height:10px">X</div><div class="notifications-icon-sub notifications-icon-spotted" style="width: 18px; height:18px;"></div></div> Bank Transaction(s) Spotted' +
                   '<br><div class="notifications-icon notifications-icon-image-bank"><div class="count-value" style="width: 14px; height:14px; line-height:10px">X</div><div class="notifications-icon-sub notifications-icon-followed" style="width: 18px; height:18px;"></div></div> Bank Transaction(s) Followed' +
                   '<br><div class="notifications-icon notifications-icon-image-icecube"><div class="dollar-value">$X,000</div></div> $X,000 Frozen' +
                   '<br><div class="notifications-icon notifications-icon-image-terrorist"><div class="dollar-value">$X,000</div></div> Terrorist Received $X,000' +
                   '<br><div class="notifications-icon notifications-icon-image-terrorist-poor"><div class="count-value" style="width: 14px; height:14px; line-height:10px">X</div></div> Terrorist(s) With Low Funds',
        },
        action: null,
        delay: 500,
      },

      {
        el: '#Node-2 .networkNodeIconAgents',
        tip: {
          title: 'Agent Tracker',
          content: 'This icon indicates how many agents are at this location.  These agents will try to follow your transactions to your terrorists or freeze them so they never reach their destination.',
          tipJoint: 'bottom right',
          offset: [12, 12]
        },
        action: null,
        delay: 2000,
      },

      {
        el: '#Node-2 .networkNodeIconTransfers',
        tip: {
          title: 'Transaction Tracker',
          content: 'This icon indicates how many transactions are at this location.',
          tipJoint: 'bottom left',
          offset: [-12, 12]
        },
        action: null,
        delay: 2000,
      },

      {
        el: '#Node-2',
        tip: {
          content: '<b>Click</b> on this Bank to check on your in-transit transaction.',
          tipJoint: 'top left'
        },
        delay: 3000,
      }],

      // Step 8: En Route Actions
      [{
        el: '.nodeViewContainer',
        action: null,
      },

      {
        el: '.nodeSubMenuTransferButtons-reroute',
        tip: {
          title: 'Reroute',
          content: 'The State doesn\'t see the entire network at first, so you can reroute transactions to try to control which locations and terrorists they discover.',
          tipJoint: 'bottom',
          offset: [0, 5]
        },
        action: null,
      },

      {
        el: '.nodeSubMenuTransferButtons-courier',
        tip: {
          title: 'Courier',
          content: 'You can hire a courier to prevent an agent from following the transaction.  This will reduce the transaction amount by $500 and add a one turn delay before it reaches the next location.',
          tipJoint: 'top',
          offset: [0, -5]
        },
        action: null,
        delay: 2000,
      },

      //{
      //  el: '.option-toolTipToggle',
      //  tip: {
      //    title: 'Advanced Help',
      //    content: 'For more detailed rules and advanced strategies, click here during the game.',
      //  },
      //  action: null,
      //  delay: 2000,
      //},

      {
        el: '.endTutorialButton',
        tip: {
          content: '<b>Click</b> here to start the game.',
          tipJoint: 'bottom',
        },
        delay: 3000,
      }],
    ];

    this.setGameState(this.getSecondGameState());
    var self = this;
    setTimeout(function() {
      self.startTutorial();
    }, 0);
  },

  // -------------------------------------------------------------------------
  getInitialGameState: function() {
    return {
      gameStateOverridden: true,
      prevTurn: null,
      currentTurn: {
        currentTurnNumber: 1,
        isGameOver: false,
        isPlayback: false,
        money: this.getInitialMoney(),
        phase: this.startingGameStateData.currentTurn.phase,
        statePlayer: {
          agents: this.getInitialAgents(),
          amountOfFrozenFakeMoney: 0,
          amountOfFrozenRealMoney: 0,
          knownLinks: [],
          knownNodes: [],
          lostLeadNodes: [],
          newlyDiscoveredLinks: [],
          newlyDiscoveredNodes: [],
          newlyTrackedMoney: [],
          pendingTurn: null,
          trackedMoney: [],
        },
        terroristPlayer: {
          balances: [null, null, null, null, null, null, null, null, null, 10, 10, 10],
          lastTurn: [],
          maintenanceTime: 0,
          moneyReserve: 95,
          pendingTurn: null,
        },
        viewingPending: false,
      },
      previousNetwork: null,
      currentNetwork: this.getNetwork(),
      latestPending: false,
      latestTurnNumber: 1,
      statePlayer: this.startingGameStateData.statePlayer,
      terroristPlayer: this.startingGameStateData.terroristPlayer,
      userRole: this.startingGameStateData.userRole,
      isGameOver: false,
      isPlayerback: false,
    };
  },

  // -------------------------------------------------------------------------
  getInitialMoney: function() {
    return [
      {agent: -1, amount: 1, courierDelay: 0, courierHired: false, courierLocked: false, current: 0, id: 0,
        previousRoute: [], route: [], status: MoneyStatus.NEW, totalTurnsOfRoute: 0, turnsTraveledOnRoute: 0, waitTime: 0},
      {agent: -1, amount: 1, courierDelay: 0, courierHired: false, courierLocked: false, current: 0, id: 1,
        previousRoute: [], route: [], status: MoneyStatus.NEW, totalTurnsOfRoute: 0, turnsTraveledOnRoute: 0, waitTime: 0},
      {agent: -1, amount: 1, courierDelay: 0, courierHired: false, courierLocked: false, current: 0, id: 2,
        previousRoute: [], route: [], status: MoneyStatus.NEW, totalTurnsOfRoute: 0, turnsTraveledOnRoute: 0, waitTime: 0},
      {agent: -1, amount: 1, courierDelay: 0, courierHired: false, courierLocked: false, current: 0, id: 3,
        previousRoute: [], route: [], status: MoneyStatus.NEW, totalTurnsOfRoute: 0, turnsTraveledOnRoute: 0, waitTime: 0},
      {agent: -1, amount: 1, courierDelay: 0, courierHired: false, courierLocked: false, current: 0, id: 4,
        previousRoute: [], route: [], status: MoneyStatus.NEW, totalTurnsOfRoute: 0, turnsTraveledOnRoute: 0, waitTime: 0},
    ];
  },

  // -------------------------------------------------------------------------
  getInitialAgents: function() {
    return [
      {id: 0, location: 1, status: AgentStatus.FOCUSING, timeFreezing: 0},
      {id: 1, location: 1, status: AgentStatus.FOCUSING, timeFreezing: 0},
      {id: 2, location: 1, status: AgentStatus.FOCUSING, timeFreezing: 0},
      {id: 3, location: 1, status: AgentStatus.FOCUSING, timeFreezing: 0},
      {id: 4, location: 2, status: AgentStatus.FOCUSING, timeFreezing: 0},
      {id: 5, location: 2, status: AgentStatus.FOCUSING, timeFreezing: 0},
      {id: 6, location: 2, status: AgentStatus.FOCUSING, timeFreezing: 0},
      {id: 7, location: 3, status: AgentStatus.FOCUSING, timeFreezing: 0},
      {id: 8, location: 3, status: AgentStatus.FOCUSING, timeFreezing: 0},
      {id: 9, location: 3, status: AgentStatus.FOCUSING, timeFreezing: 0},
    ];
  },

  // -------------------------------------------------------------------------
  getSecondGameState: function() {
    return {
      gameStateOverridden: true,
      prevTurn: this.getInitialGameState().currentTurn,
      currentTurn: {
        currentTurnNumber: 2,
        isGameOver: false,
        isPlayback: false,
        money: this.getSecondTurnMoney(),
        phase: this.startingGameStateData.currentTurn.phase,
        statePlayer: {
          agents: this.getInitialAgents(),
          amountOfFrozenFakeMoney: 0,
          amountOfFrozenRealMoney: 0,
          knownLinks: [],
          knownNodes: [],
          lostLeadNodes: [],
          newlyDiscoveredLinks: [],
          newlyDiscoveredNodes: [],
          newlyTrackedMoney: [],
          pendingTurn: null,
          trackedMoney: [],
        },
        terroristPlayer: {
          balances: [null, null, null, null, null, null, null, null, null, 9, 9, 9],
          lastTurn: [],
          maintenanceTime: 0,
          moneyReserve: 89,
          pendingTurn: null,
        },
        viewingPending: false,
      },
      previousNetwork: null,
      currentNetwork: this.getNetwork(),
      latestPending: false,
      latestTurnNumber: 2,
      statePlayer: this.startingGameStateData.statePlayer,
      terroristPlayer: this.startingGameStateData.terroristPlayer,
      userRole: this.startingGameStateData.userRole,
      isGameOver: false,
      isPlayerback: false,
    };
  },

  // -------------------------------------------------------------------------
  getSecondTurnMoney: function() {
    return [
      {agent: -1, amount: 1, courierDelay: 0, courierHired: false, courierLocked: false, current: 2, id: 0,
        previousRoute: [1], route: [5, 17], status: MoneyStatus.SPOTTED, totalTurnsOfRoute: 0, turnsTraveledOnRoute: 0, waitTime: 0},
      {agent: -1, amount: 1, courierDelay: 0, courierHired: false, courierLocked: false, current: 0, id: 1,
        previousRoute: [], route: [], status: MoneyStatus.NEW, totalTurnsOfRoute: 0, turnsTraveledOnRoute: 0, waitTime: 0},
      {agent: -1, amount: 1, courierDelay: 0, courierHired: false, courierLocked: false, current: 0, id: 2,
        previousRoute: [], route: [], status: MoneyStatus.NEW, totalTurnsOfRoute: 0, turnsTraveledOnRoute: 0, waitTime: 0},
      {agent: -1, amount: 1, courierDelay: 0, courierHired: false, courierLocked: false, current: 0, id: 3,
        previousRoute: [], route: [], status: MoneyStatus.NEW, totalTurnsOfRoute: 0, turnsTraveledOnRoute: 0, waitTime: 0},
      {agent: -1, amount: 1, courierDelay: 0, courierHired: false, courierLocked: false, current: 0, id: 4,
        previousRoute: [], route: [], status: MoneyStatus.NEW, totalTurnsOfRoute: 0, turnsTraveledOnRoute: 0, waitTime: 0},
      {agent: -1, amount: 1, courierDelay: 0, courierHired: false, courierLocked: false, current: 0, id: 5,
        previousRoute: [], route: [], status: MoneyStatus.NEW, totalTurnsOfRoute: 0, turnsTraveledOnRoute: 0, waitTime: 0},
      {agent: -1, amount: 1, courierDelay: 0, courierHired: false, courierLocked: false, current: 0, id: 6,
        previousRoute: [], route: [], status: MoneyStatus.NEW, totalTurnsOfRoute: 0, turnsTraveledOnRoute: 0, waitTime: 0},
      {agent: -1, amount: 1, courierDelay: 0, courierHired: false, courierLocked: false, current: 0, id: 7,
        previousRoute: [], route: [], status: MoneyStatus.NEW, totalTurnsOfRoute: 0, turnsTraveledOnRoute: 0, waitTime: 0},
      {agent: -1, amount: 1, courierDelay: 0, courierHired: false, courierLocked: false, current: 0, id: 8,
        previousRoute: [], route: [], status: MoneyStatus.NEW, totalTurnsOfRoute: 0, turnsTraveledOnRoute: 0, waitTime: 0},
      {agent: -1, amount: 1, courierDelay: 0, courierHired: false, courierLocked: false, current: 0, id: 9,
        previousRoute: [], route: [], status: MoneyStatus.NEW, totalTurnsOfRoute: 0, turnsTraveledOnRoute: 0, waitTime: 0},
      {agent: -1, amount: 1, courierDelay: 0, courierHired: false, courierLocked: false, current: 0, id: 10,
        previousRoute: [], route: [], status: MoneyStatus.NEW, totalTurnsOfRoute: 0, turnsTraveledOnRoute: 0, waitTime: 0},
    ];
  },

  // -------------------------------------------------------------------------
  getNetwork: function() {
    return {
      links: [
              // Cluster 0->1
              {id: 0,  nodes: {end: 1,  start: 0}, travelTime: 1},
              {id: 1,  nodes: {end: 2,  start: 0}, travelTime: 1},
              {id: 2,  nodes: {end: 3,  start: 0}, travelTime: 1},
              {id: 3,  nodes: {end: 4,  start: 0}, travelTime: 1},
              // Cluster 1->2
              {id: 4,  nodes: {end: 5,  start: 1}, travelTime: 1},
              {id: 5,  nodes: {end: 6,  start: 2}, travelTime: 1},
              {id: 6,  nodes: {end: 7,  start: 2}, travelTime: 2},
              {id: 7,  nodes: {end: 7,  start: 3}, travelTime: 2},
              {id: 8,  nodes: {end: 8,  start: 3}, travelTime: 1},
              {id: 9,  nodes: {end: 6,  start: 4}, travelTime: 1},
              {id: 10, nodes: {end: 7,  start: 4}, travelTime: 2},
              {id: 11, nodes: {end: 8,  start: 4}, travelTime: 1},
              // Cluster 2->3
              {id: 12, nodes: {end: 9,  start: 5}, travelTime: 1},
              {id: 13, nodes: {end: 10, start: 5}, travelTime: 1},
              {id: 14, nodes: {end: 11, start: 5}, travelTime: 1},
              {id: 15, nodes: {end: 9,  start: 6}, travelTime: 1},
              {id: 16, nodes: {end: 10, start: 6}, travelTime: 1},
              {id: 17, nodes: {end: 11, start: 6}, travelTime: 1},
              {id: 18, nodes: {end: 10, start: 7}, travelTime: 1},
              {id: 19, nodes: {end: 11, start: 7}, travelTime: 1},
              {id: 20, nodes: {end: 9,  start: 8}, travelTime: 1},
              {id: 21, nodes: {end: 11, start: 8}, travelTime: 1},
      ],

      nodes: [
              // Cluster 0
              {cluster: -1, holdTime: 0, id: 0, name: 'Funder', nextLinks: [0, 1, 2], position: {x: 12.5, y: 50}, prevLinks: [], type: NodeTypes.FUNDER},
              // Cluster 1
              {cluster: 0, holdTime: 0, id: 1,  name: 'Hawala 1', nextLinks: [4], position: {x: 37.5, y: 0}, prevLinks: [0], type: NodeTypes.HAWALA},
              {cluster: 0, holdTime: 0, id: 2,  name: 'Bank 1', nextLinks: [5, 6], position: {x: 37.5, y: 33}, prevLinks: [1], type: NodeTypes.BANK},
              {cluster: 0, holdTime: 0, id: 3,  name: 'Bank 2', nextLinks: [7, 8], position: {x: 37.5, y: 66}, prevLinks: [2], type: NodeTypes.BANK},
              {cluster: 0, holdTime: 0, id: 4,  name: 'Bank 3', nextLinks: [9, 10, 11], position: {x: 37.5, y: 100}, prevLinks: [3], type: NodeTypes.BANK},
              // Cluster 2
              {cluster: 1, holdTime: 0, id: 5,  name: 'Hawala 2', nextLinks: [12, 13, 14], position: {x: 62.5, y: 0}, prevLinks: [4], type: NodeTypes.HAWALA},
              {cluster: 1, holdTime: 0, id: 6,  name: 'Bank 4', nextLinks: [15, 16, 17], position: {x: 62.5, y: 33}, prevLinks: [5, 9], type: NodeTypes.BANK},
              {cluster: 1, holdTime: 0, id: 7,  name: 'Bank 5', nextLinks: [18, 19], position: {x: 62.5, y: 66}, prevLinks: [6, 7, 10], type: NodeTypes.BANK},
              {cluster: 1, holdTime: 0, id: 8,  name: 'Bank 6', nextLinks: [20, 21], position: {x: 62.5, y: 100}, prevLinks: [8, 11], type: NodeTypes.BANK},
              // Cluster 3
              {cluster: 2, holdTime: 0, id: 9,  name: 'Minion 1', nextLinks: [], position: {x: 87.5, y: 0}, prevLinks: [12, 15, 20], type: NodeTypes.TERRORIST},
              {cluster: 2, holdTime: 0, id: 10, name: 'Minion 2', nextLinks: [], position: {x: 87.5, y: 50}, prevLinks: [13, 16, 18], type: NodeTypes.TERRORIST},
              {cluster: 2, holdTime: 0, id: 11, name: 'Leader', nextLinks: [], position: {x: 87.5, y: 100}, prevLinks: [14, 17, 19, 21], type: NodeTypes.LEADER},
      ]
    };
  },
});
