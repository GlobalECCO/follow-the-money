/*******************************************************************************
 * Handles all audio related events
 ******************************************************************************/
Kernel.module.define('UIAudio', {

  clickSound1: null,
  clickSound2: null,
  newTurnSound: null,
  transferTweakSound: null,
  transferSubmitSound: null,
  chatAlertSound: null,
  whooshSound:null,
  submittedSound:null,

  enabled: true,
  isMenuOpen: false,
  receivedCancel: false,
  isInPlaybackMode: false, //<are we currently reviewing history?

  prevStateTakenTurn:true,
  prevTerroristTakenTurn:true,

  // ---------------------------------------------------------------------------
  init: function() {
    this.clickSound1 = new Howl({urls:['audio/pop_clip_in.mp3']});
    this.clickSound2 = new Howl({urls:['audio/click.mp3']});
    this.newTurnSound = new Howl({urls:['audio/electro sketch.mp3']});
    this.transferTweakSound = new Howl({urls:['audio/collecting-coins.mp3']});
    this.transferSubmitSound = new Howl({urls:['audio/cha-ching.mp3']});
    this.chatAlertSound = new Howl({urls:['audio/chatAlert.mp3']});
    this.whooshSound = new Howl({urls:['audio/whoosh.mp3']});
    this.submittedSound = new Howl({urls:['audio/other-player-submitted-turn.mp3']});

    this.hub.listen(this.hub.messages.MENU_OPENED, this.onMenuOpen);
    this.hub.listen(this.hub.messages.MENU_CLOSED, this.onMenuClose);
    this.hub.listen(this.hub.messages.MENU_FOLLOWED, this.onClick1);
    this.hub.listen(this.hub.messages.MENU_FROZEN, this.onClick1);
    this.hub.listen(this.hub.messages.MENU_IGNORED, this.onClick1);
    this.hub.listen(this.hub.messages.MENU_UNDONE, this.onClick2);
    this.hub.listen(this.hub.messages.CANCEL_NODE_PROPERTIES, this.onCancelAction);
    this.hub.listen(this.hub.messages.CANCEL_CHANGES, this.onClick1);
    this.hub.listen(this.hub.messages.CANCEL_AGENT_MOVE, this.onClick2);
    this.hub.listen(this.hub.messages.SUBMIT_TURN, this.onClick1);
    this.hub.listen(this.hub.messages.NEW_GAME_STATE, this.onNewTurn);
    this.hub.listen(this.hub.messages.PLAYBACK_MODE_STARTED, this.onStartPlayback);
    this.hub.listen(this.hub.messages.PLAYBACK_MODE_ENDED, this.onEndPlayback);
    this.hub.listen(this.hub.messages.START_ROUTE, this.onClick1);
    this.hub.listen(this.hub.messages.UPDATE_ROUTE, this.onRouteNodeClick);
    this.hub.listen(this.hub.messages.CANCEL_ROUTE, this.onClick2);
    this.hub.listen(this.hub.messages.TRANSFER_SUBMITTED, this.onTransferSubmitted);
    this.hub.listen(this.hub.messages.TRANSFER_AMOUNT_CHANGED, this.onTransferAmountChanged);
    this.hub.listen(this.hub.messages.AGENT_MOVED, this.onWhoosh);
    this.hub.listen(this.hub.messages.CHAT_RECEIVED, this.onChatReceived);
    this.hub.listen(this.hub.messages.CHAT_SHOW_HIDE, this.onClick1);
    this.hub.listen(this.hub.messages.BUTTON_CLICK, this.onClick1);
    this.hub.listen(this.hub.messages.PLAYER_UPDATE, this.onOtherPlayerSubmittedTurn);
    this.hub.listen(this.hub.messages.NEW_GAME_STATE, this.onNewGameState);
  },

  // ---------------------------------------------------------------------------
  onNewGameState: function(data) {
    this.prevStateTakenTurn = data.currentTurn.statePlayer.pendingTurn != null
    this.prevTerroristTakenTurn = data.currentTurn.terroristPlayer.pendingTurn != null
  },

  // ---------------------------------------------------------------------------
  onOtherPlayerSubmittedTurn: function(data) {
    if (this.enabled) {
      if (!this.prevStateTakenTurn && data.stateTakenTurn) {
        this.submittedSound.play();
        this.prevStateTakenTurn = true;
      } else if (!this.prevTerroristTakenTurn && data.terroristTakenTurn) {
        this.submittedSound.play();
        this.prevTerroristTakenTurn = true;
      }
    }
  },

  // ---------------------------------------------------------------------------
  onCancelAction: function() {
    if (this.isMenuOpen) {
      this.receivedCancel = true;
    }
  },

  // ---------------------------------------------------------------------------
  onClick1: function(e) {
    if (this.enabled) {
      // Don't allow more than 1 click sound to play at the same time
      for (var i = 0; i < this.clickSound1._audioNode.length; ++i) {
        if (!this.clickSound1._audioNode[i].paused) {
          return;
        }
      }
      this.clickSound1.play();
    }
  },

  // ---------------------------------------------------------------------------
  onClick2: function(e) {
    this.enabled && this.clickSound2.play();
  },

  // ---------------------------------------------------------------------------
  onWhoosh: function(e) {
    this.enabled && this.whooshSound.play();
  },

  // ---------------------------------------------------------------------------
  onMenuOpen: function() {
    this.isMenuOpen = true;
    this.onClick1();
  },

  // ---------------------------------------------------------------------------
  onMenuClose: function(details) {
    if (this.receivedCancel) {
      this.onClick2();
      this.receivedCancel = false;
    } else {
      this.onClick1();
    }

    this.isMenuOpen = false;
  },

  // ---------------------------------------------------------------------------
  onNewTurn: function(e) {
    this.enabled && !this.isInPlaybackMode && this.newTurnSound.play();
  },

  //----------------------------------------------------------------------------
  onStartPlayback: function() {
    this.isInPlaybackMode = true;
  },

  //----------------------------------------------------------------------------
  onEndPlayback: function () {
    this.isInPlaybackMode = false;
  },

  // ---------------------------------------------------------------------------
  onTransferSubmitted: function(e) {
    this.enabled && this.transferSubmitSound.play();
  },

  // ---------------------------------------------------------------------------
  onTransferAmountChanged: function() {
    this.enabled && this.transferTweakSound.play();
  },

  // ---------------------------------------------------------------------------
  onRouteNodeClick: function(details) {
    // Only play sound for nodes other than the root/funder
    if (details.routeLinks.length > 0) {
      this.enabled && this.clickSound1.play();
    }
  },

  // ---------------------------------------------------------------------------
  onChatReceived: function() {
    this.enabled && this.chatAlertSound.play();
  },

  // ---------------------------------------------------------------------------
  setEnabled: function(enabled) {
    this.enabled = enabled;
  },
});
