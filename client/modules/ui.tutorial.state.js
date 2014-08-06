/*******************************************************************************
 * Displays and controls menu for finance nodes
 ******************************************************************************/
Kernel.module.define('UITutorialState', {
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
        el: '#Node-4, #Node-5, #Node-6',
        tip: {
          title: 'Terrorists',
          content: 'You know there are three terrorists that are planning an attack and need funding, but you don\'t know who they are.  You can win if you can determine which one is the leader and arrest him.',
          tipJoint: 'right'
        },
        action: null,
        grouped: true,
        stemLength: 30,
        delay: 1000,
      },

      {
        el: '#Node-0',
        tip: {
          title: 'Funder',
          content: 'This is a known terrorist funder.  You can win if you freeze transactions coming from him and going to the terrorists.',
          tipJoint: 'left',
          offset: [-10, 0]
        },
        action: null,
        stemLength: 30,
        delay: 2000,
      },

      {
        el: '.stateAgentOverview-Agent',
        tip: {
          title: 'Agents',
          content: 'You have ten agents in the field that you can assign to follow transactions to terrorists or freeze them to prevent a terrorist attack.  Keep in mind, an agent can only do one thing at a time.',
          tipJoint: 'top'
        },
        action: null,
        delay: 2000,
      },

      {
        el: '.stateAgentOverview-Agent:last',
        tip: {
          content: 'Mouseover this agent to see where he is.  <b>Click</b> on him to move him to a different location.',
          tipJoint: 'top right'
        },
        delay: 3000,
      }],

      // Step 2: Agent Moving
      [{
        el: '#Node-2',
        tip: {
          content: '<b>Click</b> here to move the agent to where he can be more useful.',
          tipJoint: 'left'
        },
      }],

      // Step 3: Transactions
      [{
        el: '#Node-2 .networkNodeIconAgents',
        tip: {
          title: 'Agent Tracker',
          content: 'This icon indicates how many agents are at this location.',
          tipJoint: 'bottom'
        },
        action: null,
      },

      {
        el: '#Node-2 .networkNodeIconTransfers',
        tip: {
          title: 'Transaction Tracker',
          content: 'This icon indicates how many transactions from the funder have been spotted at this location.  These transactions can be heading to the terrorist or they can be legitimate transactions.',
          tipJoint: 'left'
        },
        action: null,
        delay: 2000,
      },

      {
        el: '#Node-2',
        tip: {
          content: '<b>Click</b> on this Bank to start assigning agent tasks.',
          tipJoint: 'right'
        },
        delay: 3000,
      }],

      // Step 4: Location Details/Freezing Transactions
      [{
        el: '.nodeViewContainer',
        action: null,
      },

      {
        el: '.nodeViewAgentList',
        tip: {
          title: 'Agents',
          content: 'You can see how many agents are at this location and what they are doing here.  You can also move one by clicking on one of these icons.',
          tipJoint: 'bottom right',
          offset: [30, 20]
        },
        action: null,
      },

      {
        el: '.nodeViewTransferList',
        tip: {
          title: 'Transactions',
          content: 'These are the transactions at this location.  The farther from the funder a transaction is spotted, the more likely it\'s heading to a terrorist.',
          tipJoint: 'right'
        },
        action: null,
        delay: 2000,
      },

      {
        el: '.nodeViewSubHeading',
        tip: {
          title: 'Confidence',
          content: 'This indicates how confident your agents are that at least one transaction at this location is heading to a terrorist.',
          tipJoint: 'bottom',
          offset: [95, 10]
        },
        action:null,
        delay: 2000,
      },

      {
        el: '.nodeSubMenuTransferButtons-freeze:last',
        tip: {
          content: '<b>Click</b> here to assign an agent to freeze a transaction, ensuring it doesn\'t reach its destination.',
          tipJoint: 'top'
        },
        delay: 3000,
      }],

      // Step 5: Following Transactions
      [{
        el: '#Node-1',
        tip: {
          title: 'Hawala Follow',
          content: 'An agent following a transaction on the Hawala network will only discover at most one more location in the network and then the transaction will be gone.',
          tipJoint: 'right'
        },
        action: null,
      },

      {
        el: '#Node-2',
        tip: {
          title: 'Bank Follow',
          content: 'An agent following a transaction on the Bank network will continue to follow it until it reaches its destination or the Terrorist hires a courier.',
          tipJoint: 'right'
        },
        action: null,
        delay: 2000,
      },

      {
        el: '.nodeViewContainer',
        action: null,
        delay: 3000,
      },

      {
        el: '.nodeSubMenuTransferButtons-follow:last',
        tip: {
          content: '<b>Click</b> here to assign an agent to follow this transaction.',
          tipJoint: 'top'
        },
      }],

      // Step 6: Spotting Transactions
      [{
        el: '.nodeViewContainer',
        action: null,
      },

      {
        el: '.nodeViewContainer .playerCard:last',
        tip: {
          title: 'Agent Status: Spotting',
          content: 'An agent with this icon will be looking for new transactions next turn.  If you don\'t have any agents doing this, there won\'t be any spotted transactions on the following turn.',
          tipJoint: 'bottom'
        },
        action: null,
      },

      {
        el: '#Node-1',
        tip: {
          content: '<b>Click</b> on this Hawala to investigate the transactions here.',
          tipJoint: 'right'
        },
        delay: 3000,
      }],

      // Step 7: Hawala Lockdown
      [{
        el: '.nodeViewContainer',
        action: null,
      },

      {
        el: '#lockdown:last',
        tip: {
          title: 'Hawala Lockdown',
          content: 'A single agent can lockdown a Hawala, which will freeze all known transactions this turn.',
          tipJoint: 'right'
        },
        action:null
      },

      {
        el: '#lockdown:last',
        tip: {
          content: '<b>Click</b> here to lockdown this Hawala.',
          tipJoint: 'top right'
        },
        delay: 3000,
      }],

      // Step 8: Game Turns
      [{
        el: '.playerStatus',
        tip: {
          title: 'Game Turns',
          content: 'Both players take turns simultaneously in this game.  You can see which player has taken their turn and is waiting for the other player to finish their turn here.',
          offset: [30, -15]
        },
        action: null,
      },

      {
        el: '.submitButton',
        tip: {
          content: '<b>Click</b> here to finish your turn.'
        },
        delay: 3000,
        shallowCopy: true,
        callback: this.startTutorialTurnTwo,
      }]
    ];
  },

  // -------------------------------------------------------------------------
  startTutorialTurnTwo: function() {
    this.tutorialSteps = [
      // Step 9: Discovered Terrorist
      [{
        el: '.stateAgentOverview-Agent:first',
        tip: {
          title: 'Disabled agents',
          content: 'Any agent that was locking down a Hawala or freezing money at a Bank on the previous turn will be unable to perform any actions for one turn.',
          offset: [-20, -20]
        },
        action: null,
        delay: 250,
      },

      {
        el: '.notifications-icon',
        tip: {
          title: 'Notifications',
          content: 'At the beginning of every turn, notifications for significant events appear here.<br>' +
                   '<br><div class="notifications-icon notifications-icon-image-hawala"><div class="count-value" style="width: 14px; height:14px; line-height:10px">X</div></div> Hawala(s) Discovered' +
                   '<br><div class="notifications-icon notifications-icon-image-bank"><div class="count-value" style="width: 14px; height:14px; line-height:10px">X</div></div> Bank(s) Discovered' +
                   '<br><div class="notifications-icon notifications-icon-image-terrorist"><div class="count-value" style="width: 14px; height:14px; line-height:10px">X</div></div> Terrorist(s) Discovered' +
                   '<br><div class="notifications-icon notifications-icon-image-link"><div class="count-value" style="width: 14px; height:14px; line-height:10px">X</div></div> Route(s) Discovered' +
                   '<br><div class="notifications-icon notifications-icon-image-icecube"><div class="dollar-value">$X,000</div></div> $X,000 Frozen' +
                   '<br><div class="notifications-icon notifications-icon-image-transfers"><div class="count-value" style="width: 14px; height:14px; line-height:10px">X</div></div> Money Trail(s) Ended' +
                   '<br><div class="notifications-icon notifications-icon-image-terrorist"><div class="dollar-value">$X,000</div></div> Terrorist Received $X,000',
          tipJoint: 'bottom left'
        },
        grouped: true,
        action: null,
        delay: 2000,
      },

      {
        el: '#Node-5',
        tip: {
          content: '<b>Click</b> on the terrorist to get more details about him.',
          tipJoint: 'right'
        },
        delay: 3000,
      }],

      // Step 10: Terrorist Details
      [{
        el: '.playerCardViewContainer',
        action: null,
      },

      {
        el: '.playerCard-trackedMoney-Container',
        tip: {
          title: 'Tracked Money',
          content: 'Leaving an agent on a discovered terrorist lets you track all transactions that reach the terrorist.  This does not show how much money reached this terrorist before you discovered him.',
          tipJoint: 'left'
        },
        action: null,
      },

      {
        el: '.playerCardButton-accuse',
        tip: {
          title: 'Arrest',
          content: 'If you suspect this terrorist is the leader, click Arrest and submit your turn.  If you are correct, the terrorist attack will be thwarted.  However, if you\'re wrong, the terrorist leader will immediately initiate his attack.',
          tipJoint: 'right'
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
          content: '<b>Click</b> here when you\'re ready to start the game.  Your agents have already been distributed to the known network and are now waiting for the Terrorist player to take their first turn.',
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
          trackedMoney: [null, null, null, null, 0, 0, 0],
        },
        terroristPlayer: this.startingGameStateData.currentTurn.terroristPlayer,
        viewingPending: false,
      },
      previousNetwork: null,
      currentNetwork: this.getInitialNetwork(),
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
  getInitialNetwork: function() {
    return {
      links: [
        // Cluster 0->1
        {id: 0,  nodes: {end: 1,  start: 0}, travelTime: 1},
        {id: 1,  nodes: {end: 2,  start: 0}, travelTime: 1},
        {id: 2,  nodes: {end: 3,  start: 0}, travelTime: 1},
        // Cluster 1->2
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ],

      nodes: [
        // Cluster 0
        {cluster: -1, holdTime: 0, id: 0, name: 'Funder', nextLinks: [0, 1, 2], position: {x: 15, y: 50}, prevLinks: [], type: NodeTypes.FUNDER},
        // Cluster 1
        {cluster: 0, holdTime: 0, id: 1,  name: 'Hawala', nextLinks: [3, 4, 5], position: {x: 50, y: 0}, prevLinks: [0], type: NodeTypes.HAWALA},
        {cluster: 0, holdTime: 0, id: 2,  name: 'Bank 1', nextLinks: [6, 7], position: {x: 50, y: 50}, prevLinks: [1], type: NodeTypes.BANK},
        {cluster: 0, holdTime: 0, id: 3,  name: 'Bank 2', nextLinks: [8, 9, 10], position: {x: 50, y: 100}, prevLinks: [2], type: NodeTypes.BANK},
        // Cluster 2
        {cluster: 2, holdTime: 0, id: 4,  name: 'Terrorist', nextLinks: [], position: {x: 85, y: 0}, prevLinks: [3, 8], type: NodeTypes.UNSUB},
        {cluster: 2, holdTime: 0, id: 5,  name: 'Terrorist', nextLinks: [], position: {x: 85, y: 50}, prevLinks: [4, 6, 9], type: NodeTypes.UNSUB},
        {cluster: 2, holdTime: 0, id: 6, name: 'Terrorist', nextLinks: [], position: {x: 85, y: 100}, prevLinks: [5, 7, 10], type: NodeTypes.UNSUB},
      ]
    };
  },

  // -------------------------------------------------------------------------
  getInitialMoney: function() {
    return [
      {agent: -1, amount: 1, courierDelay: 0, courierHired: false, courierLocked: false, current: 1, id: 0,
        previousRoute: [0], route: [], status: MoneyStatus.SPOTTED, totalTurnsOfRoute: 0, turnsTraveledOnRoute: 0, waitTime: 0},
      {agent: -1, amount: 4, courierDelay: 0, courierHired: false, courierLocked: false, current: 1, id: 1,
        previousRoute: [0], route: [], status: MoneyStatus.SPOTTED, totalTurnsOfRoute: 0, turnsTraveledOnRoute: 0, waitTime: 0},
      {agent: -1, amount: 5, courierDelay: 0, courierHired: false, courierLocked: false, current: 1, id: 2,
        previousRoute: [0], route: [], status: MoneyStatus.SPOTTED, totalTurnsOfRoute: 0, turnsTraveledOnRoute: 0, waitTime: 0},
      {agent: -1, amount: 1, courierDelay: 0, courierHired: false, courierLocked: false, current: 1, id: 3,
        previousRoute: [0], route: [], status: MoneyStatus.SPOTTED, totalTurnsOfRoute: 0, turnsTraveledOnRoute: 0, waitTime: 0},
      {agent: -1, amount: 3, courierDelay: 0, courierHired: false, courierLocked: false, current: 2, id: 4,
        previousRoute: [1], route: [], status: MoneyStatus.SPOTTED, totalTurnsOfRoute: 0, turnsTraveledOnRoute: 0, waitTime: 0},
      {agent: -1, amount: 6.5, courierDelay: 0, courierHired: false, courierLocked: false, current: 2, id: 5,
        previousRoute: [1], route: [], status: MoneyStatus.SPOTTED, totalTurnsOfRoute: 0, turnsTraveledOnRoute: 0, waitTime: 0},
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
      {id: 6, location: 3, status: AgentStatus.FOCUSING, timeFreezing: 0},
      {id: 7, location: 3, status: AgentStatus.FOCUSING, timeFreezing: 0},
      {id: 8, location: 3, status: AgentStatus.FOCUSING, timeFreezing: 0},
      {id: 9, location: 3, status: AgentStatus.FOCUSING, timeFreezing: 0},
    ];
  },

  // -------------------------------------------------------------------------
  getSecondGameState: function() {
    var gameState = {
      gameStateOverridden: true,
      prevTurn: this.getInitialGameState().currentTurn,
      currentTurn: {
        currentTurnNumber: 2,
        isGameOver: false,
        isPlayback: false,
        money: this.getSecondTurnMoney(),
        phase: this.startingGameStateData.currentTurn.phase,
        statePlayer: {
          agents: this.getSecondTurnAgents(),
          amountOfFrozenFakeMoney: 13.5,
          amountOfFrozenRealMoney: 4,
          knownLinks: [],
          knownNodes: [],
          lostLeadNodes: [],
          newlyDiscoveredLinks: [6],
          newlyDiscoveredNodes: [5],
          newlyTrackedMoney: [null, null, null, null, 0, 3, 0],
          pendingTurn: null,
          trackedMoney: [null, null, null, null, 0, 3, 0],
        },
        terroristPlayer: this.startingGameStateData.currentTurn.terroristPlayer,
        viewingPending: false,
      },
      previousNetwork: this.getInitialNetwork(),
      currentNetwork: this.getSecondTurnNetwork(),
      latestPending: false,
      latestTurnNumber: 2,
      statePlayer: this.startingGameStateData.statePlayer,
      terroristPlayer: this.startingGameStateData.terroristPlayer,
      userRole: this.startingGameStateData.userRole,
      isGameOver: false,
      isPlayerback: false,
    };
    gameState.prevTurn.statePlayer.agents[9].location = 2;
    return gameState;
  },

  // -------------------------------------------------------------------------
  getSecondTurnNetwork: function() {
    return {
      links: [
        // Cluster 0->1
        {id: 0,  nodes: {end: 1,  start: 0}, travelTime: 1},
        {id: 1,  nodes: {end: 2,  start: 0}, travelTime: 1},
        {id: 2,  nodes: {end: 3,  start: 0}, travelTime: 1},
        // Cluster 1->2
        null,
        null,
        null,
        {id: 6,  nodes: {end: 5,  start: 2}, travelTime: 1},
        null,
        null,
        null,
        null,
      ],

      nodes: [
        // Cluster 0
        {cluster: -1, holdTime: 0, id: 0, name: 'Funder', nextLinks: [0, 1, 2], position: {x: 15, y: 50}, prevLinks: [], type: NodeTypes.FUNDER},
        // Cluster 1
        {cluster: 0, holdTime: 0, id: 1,  name: 'Hawala', nextLinks: [3, 4, 5], position: {x: 50, y: 0}, prevLinks: [0], type: NodeTypes.HAWALA},
        {cluster: 0, holdTime: 0, id: 2,  name: 'Bank 1', nextLinks: [6, 7], position: {x: 50, y: 50}, prevLinks: [1], type: NodeTypes.BANK},
        {cluster: 0, holdTime: 0, id: 3,  name: 'Bank 2', nextLinks: [8, 9, 10], position: {x: 50, y: 100}, prevLinks: [2], type: NodeTypes.BANK},
        // Cluster 2
        {cluster: 2, holdTime: 0, id: 4,  name: 'Terrorist', nextLinks: [], position: {x: 85, y: 0}, prevLinks: [3, 8], type: NodeTypes.UNSUB},
        {cluster: 2, holdTime: 0, id: 5,  name: 'Terrorist', nextLinks: [], position: {x: 85, y: 50}, prevLinks: [4, 6, 9], type: NodeTypes.TERRORIST},
        {cluster: 2, holdTime: 0, id: 6, name: 'Terrorist', nextLinks: [], position: {x: 85, y: 100}, prevLinks: [5, 7, 10], type: NodeTypes.UNSUB},
      ]
    };
  },

  // -------------------------------------------------------------------------
  getSecondTurnMoney: function() {
    return [
      {agent: -1, amount: 1, courierDelay: 0, courierHired: false, courierLocked: false, current: 1, id: 0,
        previousRoute: [0], route: [], status: MoneyStatus.FROZEN, totalTurnsOfRoute: 0, turnsTraveledOnRoute: 0, waitTime: 0},
      {agent: -1, amount: 4, courierDelay: 0, courierHired: false, courierLocked: false, current: 1, id: 1,
        previousRoute: [0], route: [], status: MoneyStatus.FROZEN, totalTurnsOfRoute: 0, turnsTraveledOnRoute: 0, waitTime: 0},
      {agent: -1, amount: 5, courierDelay: 0, courierHired: false, courierLocked: false, current: 1, id: 2,
        previousRoute: [0], route: [], status: MoneyStatus.FROZEN, totalTurnsOfRoute: 0, turnsTraveledOnRoute: 0, waitTime: 0},
      {agent: -1, amount: 1, courierDelay: 0, courierHired: false, courierLocked: false, current: 1, id: 3,
        previousRoute: [0], route: [], status: MoneyStatus.FROZEN, totalTurnsOfRoute: 0, turnsTraveledOnRoute: 0, waitTime: 0},
      {agent: -1, amount: 3, courierDelay: 0, courierHired: false, courierLocked: false, current: 2, id: 4,
        previousRoute: [1], route: [], status: MoneyStatus.DEPOSITED, totalTurnsOfRoute: 0, turnsTraveledOnRoute: 0, waitTime: 0},
      {agent: -1, amount: 6.5, courierDelay: 0, courierHired: false, courierLocked: false, current: 5, id: 5,
        previousRoute: [1,6], route: [], status: MoneyStatus.FROZEN, totalTurnsOfRoute: 0, turnsTraveledOnRoute: 0, waitTime: 0},
    ];
  },

  // -------------------------------------------------------------------------
  getSecondTurnAgents: function() {
    return [
      {id: 0, location: 1, status: AgentStatus.INCAPACITATED, timeFreezing: 0},
      {id: 1, location: 1, status: AgentStatus.FOCUSING, timeFreezing: 0},
      {id: 2, location: 1, status: AgentStatus.FOCUSING, timeFreezing: 0},
      {id: 3, location: 1, status: AgentStatus.FOCUSING, timeFreezing: 0},
      {id: 4, location: 2, status: AgentStatus.FOCUSING, timeFreezing: 0},
      {id: 5, location: 2, status: AgentStatus.INCAPACITATED, timeFreezing: 0},
      {id: 6, location: 3, status: AgentStatus.FOCUSING, timeFreezing: 0},
      {id: 7, location: 3, status: AgentStatus.FOCUSING, timeFreezing: 0},
      {id: 8, location: 3, status: AgentStatus.FOCUSING, timeFreezing: 0},
      {id: 9, location: 5, status: AgentStatus.FOCUSING, timeFreezing: 0},
    ];
  },
});
