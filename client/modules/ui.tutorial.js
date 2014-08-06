/*******************************************************************************
 * Displays and controls menu for finance nodes
 ******************************************************************************/
Kernel.module.define('UITutorial', {
  startingGameStateData: null,
  hasViewedTutorial: false,
  tutorialSteps: [],

  // -------------------------------------------------------------------------
  init: function() {
  },

  // -------------------------------------------------------------------------
  onNewGameState: function(gameData) {
    // Store the turn data so we can put things back there after the tutorial
    if (!this.hasViewedTutorial) {
      this.startingGameStateData = gameData;

      // Always update the state's network data for when the game starts
      var self = this;
      if (gameData.userRole !== PlayerRoles.TERRORIST) {
        this.hub.retrievePartialNetwork(gameData.currentTurn.currentTurnNumber,
          gameData.prevTurn ? gameData.prevTurn.currentTurnNumber: -1, function(networkData) {
          self.startingGameStateData.previousNetwork = networkData.previousNetwork;
          self.startingGameStateData.currentNetwork = networkData.currentNetwork;
        });
      }
      // Only update the terrorist's network data once
      else if (this.startingGameStateData.currentNetwork === undefined) {
        this.hub.retrieveFullNetwork(function(networkData) {
          self.startingGameStateData.previousNetwork = null;
          self.startingGameStateData.currentNetwork = networkData;
        });
      }

      //
      if (gameData.latestTurnNumber === 0) {
        this.show();
      }
    }
  },

  // -------------------------------------------------------------------------
  onTutorialRestart: function() {
    this.startTutorialTurnOne();
    this.show();
  },

  // -------------------------------------------------------------------------
  onTutorialFinished: function() {
    this.hide();
  },

  // -------------------------------------------------------------------------
  show: function() {
    this.setGameState(this.getInitialGameState());
    this.startTutorial();
  },

  // ---------------------------------------------------------------------------
  hide: function() {
    this.hasViewedTutorial = true;
    this.setGameState(this.startingGameStateData);
    this.startGameStateData = null;
  },

  // -------------------------------------------------------------------------
  setGameState: function(gameData) {
    if (gameData !== null) {
      this.hub.broadcast(this.hub.messages.OVERRIDE_GAME_STATE, gameData);
    }
  },

  // -------------------------------------------------------------------------
  startTutorial: function() {
    this.hub.forwardTutorialStart(this.tutorialSteps);
  },
});
