/*******************************************************************************
 * Kernel.js hub extension to support modules
 ******************************************************************************/

// Define the main Hub - NOTE: 'main' is the default hub used if not otherwise specified in Kernel.start()
Kernel.hub.define('game', {

  data: {
    hasViewedIntro: false
  },

  messages: {
    // Main Hub signals
    MODULES_LOADED: 'modules-loaded', // No parameters
    NEW_GAME_STATE: 'new-game-state', // { userRole (String), prevTurn (Object), currentTurn (Object), previousNetwork (Object), currentNetwork (Object), latestTurnNumber (Number), isGameOver (Boolean) }
    UPDATE_GAME_STATE: 'update-game-state', // gameState (Object)
    PLAYER_UPDATE: 'player-data-update', // { stateTakenTurn (Boolean), terroristTakenTurn (Boolean) }
    PLAYBACK_MODE_STARTED: 'playback-mode-started', // No params. The user has started reviewing previous turns.
    PLAYBACK_MODE_ENDED: 'playback-mode-ended', // No params. The user has stopped reviewing previous turns.
    START_TUTORIAL: 'start-tutorial', // steps (Tutorial Steps Data)
    TUTORIAL_FINISHED: 'tutorial-finished', // No Parameters

    // Alert Signals
    ALERT_AT_NODE: 'alert-at-node', // nodeID (Number)

    // Agent Signals
    AGENT_ABOUT_TO_MOVE: 'agent-about-to-move', // selectedAgent (number: agentID)

    // Input signals
    FUNDS_HIGHLIGHTED: 'funds-highlighted', // highlighted (Boolean)
    NODE_SELECTED: 'node-input-selected', // node id (Number)
    NODE_MOUSE_ENTER: 'node-mouse-enter', // node id (Number)
    NODE_MOUSE_LEAVE: 'node-mouse-leave', // node id (Number)
    AGENT_SELECTED: 'agent-selected', // selectedAgent (number: agentID)
    AGENT_MOUSE_ENTER: 'agent-mouse-enter', // agent id (Number)
    AGENT_MOUSE_LEAVE: 'agent-mouse-leave', // agent id (Number)
    AGENT_MOVED: 'agent-moved', // No Parameters
    MONEY_SELECTED: 'money-selected', // money (Object)
    TRANSFER_MOUSE_ENTER: 'transfer-mouse-enter', // money id (Number)
    TRANSFER_MOUSE_LEAVE: 'transfer-mouse-leave', // No Parameters
    TRANSFER_SELECTED: 'transfer-selected', // money id (Number)
    NOTIFICATION_MONEY_MOUSE_ENTER: 'notification-money-mouse-enter', // [money id (Number)]
    NOTIFICATION_MONEY_MOUSE_LEAVE: 'notification-money-mouse-leave', // No Parameters
    NOTIFICATION_NODE_MOUSE_ENTER: 'notification-node-mouse-enter', // [node id (Number)]
    NOTIFICATION_NODE_MOUSE_LEAVE: 'notification-node-mouse-leave', // No Parameters
    NOTIFICATION_LINK_MOUSE_ENTER: 'notification-link-mouse-enter', // [link id (Number)]
    NOTIFICATION_LINK_MOUSE_LEAVE: 'notification-link-mouse-leave', // No Parameters
    CANCEL_ACTIONS: 'cancel-actions', // No Parameters
    CANCEL_AGENT_MOVE: 'cancel-agent-move', // No Parameters
    ENABLE_ACTIONS: 'enable-actions', // No Parameters
    DISABLE_ACTIONS: 'disable-actions', // No Parameters
    ENABLE_TRANSFERS: 'enable-transfers', // No Parameters
    DISABLE_TRANSFERS: 'disable-transfers', // No Parameters

    // Money signals
    BALANCE_AT_NODE: 'balance-at-node', // { balance (Number), node (Object) }
    MONEY_AT_NODE: 'money-at-node', // { money (Object), node (Object) }

    // Network signals
    CANCEL_NODE_PROPERTIES: 'cancel-node-properties',
    DISPLAY_NODE_PROPERTIES: 'display-node-properties', // node (Object)
    HIDE_NODE_PROPERTIES: 'hide-node-properties', // No parameters
    CHANGE_NODE_LAYER: 'change-node-layer', // { id (Number), newLayer (Number) }
    RESET_NODE_LAYER: 'reset-node-layer', // { id (Number) }
    CLEAR_HIGHLIGHTS: 'clear-highlights', // No Parameters

    // Menu signals
    MENU_OPENED: 'menu-opened', // No parameters
    MENU_CLOSED: 'menu-closed', // No parameters
    MENU_FOLLOWED: 'menu-money-followed',  // No parameters
    MENU_FROZEN: 'menu-money-frozen',  // No parameters
    MENU_IGNORED: 'menu-money-ignored',  // No parameters
    MENU_UNDONE: 'menu-money-undone',  // No parameters

    // Money Transfer signals
    START_ROUTE: 'start-route', // Money ID (Number)
    UPDATE_ROUTE: 'update-route', // { routeNodes [(Number)], routeLinks [(Number)], nextNodes [(Number)], nextLinks [(Number)] }
    CANCEL_ROUTE: 'cancel-route', // No parameters
    SHOW_TRANSFER_DIALOGUE: 'show-transfer', // { nodeID (Number), balance (Number), time (Number) }
    HIDE_TRANSFER_DIALOGUE: 'hide-transfer', // No parameters
    TRANSFER_SUBMITTED: 'transfer-submitted', // { amount (Number), newTransfer (Boolean) }
    TRANSFER_AMOUNT_CHANGED: 'transfer-amount-changed', // { moneyID (Number), amount (Number) }
    TRANSFER_DELETED: 'transfer-deleted', // Money ID (Number)

    // Submit Container signals
    CANCEL_CHANGES: 'cancel-changes', // No parameters
    SUBMIT_TURN: 'submit-turn', // No parameters
    SUBMIT_FAILED: 'submit-failed', // No parameters

    // Misc
    ADVICE_CLOSED: 'advice-closed', // No parameters
    ADVICE_FINISHED: 'advice-finished', // No parameters
    DISPLAY_INFO_TEXT: 'display-info-text', // { text (String), [optional] color (String) }
    CHAT_RECEIVED: 'chat-received', // No parameters
    CHAT_SHOW_HIDE: 'chat-show-hide', // No parameters
    NOTIFICATIONS_SHOW_HIDE: 'notifications-show-hide', // No parameters
    HIDE_NOTIFICATIONS: 'hide-notifications', // No parameters
    BUTTON_CLICK: 'button-click' // No parameters
  },

  //----------------------------------------------------------------------------
  // Forward a AGENT_MOVE to the main hub
  forwardAgentMove: function(data) {
    var hub = this.getMainHub();
    hub.broadcast(hub.messages.AGENT_MOVE, data);
  },

  //----------------------------------------------------------------------------
  // Forward a HAWALA_LOCKDOWN to the main hub
  forwardHawalaLockdown: function(data) {
    var hub = this.getMainHub();
    hub.broadcast(hub.messages.HAWALA_LOCKDOWN, data);
  },

  //----------------------------------------------------------------------------
  // Forward a MONEY_FOLLOWED to the main hub
  forwardMoneyFollow: function(data) {
    var hub = this.getMainHub();
    hub.broadcast(hub.messages.MONEY_FOLLOWED, data);
  },

  //----------------------------------------------------------------------------
  // Forward a MONEY_FREEZING to the main hub
  forwardMoneyFreeze: function(data) {
    var hub = this.getMainHub();
    hub.broadcast(hub.messages.MONEY_FREEZING, data);
  },

  //----------------------------------------------------------------------------
  // Forward a MONEY_IGNORED to the main hub
  forwardMoneyIgnore: function(data) {
    var hub = this.getMainHub();
    hub.broadcast(hub.messages.MONEY_IGNORED, data);
  },

  //----------------------------------------------------------------------------
  // Forward a MONEY_COURIER to the main hub
  forwardMoneyCourier: function(data) {
    var hub = this.getMainHub();
    hub.broadcast(hub.messages.MONEY_COURIER, data);
  },

  //----------------------------------------------------------------------------
  // Forward a MONEY_RESET to the main hub
  forwardMoneyReset: function(data) {
    var hub = this.getMainHub();
    hub.broadcast(hub.messages.MONEY_RESET, data);
  },

  //----------------------------------------------------------------------------
  // Forward MONEY_RESET_COURIER to the main hub
  forwardMoneyCourierReset: function(data) {
    var hub = this.getMainHub();
    hub.broadcast(hub.messages.MONEY_RESET_COURIER, data);
  },

  //----------------------------------------------------------------------------
  // Forward a ACCEPT_ROUTE to the main hub
  forwardRouteAccept: function(data) {
    var hub = this.getMainHub();
    hub.broadcast(hub.messages.ACCEPT_ROUTE, data);
  },

  //----------------------------------------------------------------------------
  // Forward a CHANGE_ROUTE_AMOUNT to the main hub
  forwardRouteAmountChange: function(data) {
    var hub = this.getMainHub();
    hub.broadcast(hub.messages.CHANGE_ROUTE_AMOUNT, data);
  },

  //----------------------------------------------------------------------------
  // Forward DELETE_ROUTE to the main hub
  forwardRouteDelete: function(moneyID) {
    var hub = this.getMainHub();
    hub.broadcast(hub.messages.DELETE_ROUTE, moneyID);
  },

  //----------------------------------------------------------------------------
  // Forward ACCUSE_TERRORIST to the main hub
  forwardTerroristAccuse: function(nodeID) {
    var hub = this.getMainHub();
    hub.broadcast(hub.messages.ACCUSE_TERRORIST, nodeID);
  },

  //----------------------------------------------------------------------------
  // Forward CANCEL_CHANGES to the main hub
  forwardCancelChanges: function() {
    var hub = this.getMainHub();
    hub.broadcast(hub.messages.CANCEL_CHANGES);
  },

  //----------------------------------------------------------------------------
  // Forward SUBMIT_TURN to the main hub
  forwardSubmitTurn: function() {
    var hub = this.getMainHub();
    hub.broadcast(hub.messages.SUBMIT_TURN);
  },

  //----------------------------------------------------------------------------
  // Forward a GET_TURN to the main hub
  forwardGetTurn: function(turn) {
    var hub = this.getMainHub();
    hub.broadcast(hub.messages.GET_TURN, turn);
  },

  //----------------------------------------------------------------------------
  // Forward TRANSFER_RESET to the main hub
  forwardTransferReset: function(moneyID) {
    var hub = this.getMainHub();
    hub.broadcast(hub.messages.TRANSFER_RESET, moneyID);
  },

  //----------------------------------------------------------------------------
  // Get the main hub
  getMainHub: function() {
    return Kernel.hub.get('main');
  },

  //----------------------------------------------------------------------------
  getUser: function() {
    return Kernel.module.get('module-dataflow').data.USER;
  },

  //----------------------------------------------------------------------------
  getUserRole: function() {
    return Kernel.module.get('module-dataflow').data.ROLE;
  },

  //----------------------------------------------------------------------------
  getGID: function() {
    return Kernel.hub.get('main').data.GID;
  }
});
