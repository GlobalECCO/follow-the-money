/*******************************************************************************
 * Responsible for recurring retrieval and sending of game data
 ******************************************************************************/
Kernel.module.define('DataFlow', {

  data: {
    USER: null,
    ROLE: '',
    WAITING_FOR_OTHERS: false,        ///<Is this player waiting for others to make their turn?
    CHECK_FOR_PLAYER_TURNS_TIME: 3000, ///<ms to wait for player turn polling
  },

  //----------------------------------------------------------------------------
  init: function() {
    this.hub.listen(this.hub.messages.TURN_SUBMITTED, this.turnSubmitted);
    this.hub.listen(this.hub.messages.GET_TURN, this.refreshGameData);

    var self = this;

    // Query the server for our current game and user ids.
    // This also starts the game and begins the main update loop.
    this.hub.retrieveSessionData(
      function(data) {
        self.data.USER = data.user;
        self.refreshGameData();
      }
    );
  },

  //----------------------------------------------------------------------------
  turnSubmitted: function() {
    this.data.WAITING_FOR_OTHERS = true;
  },

  //----------------------------------------------------------------------------
  refreshGameData: function(turn) {
    var self = this;
    var user = self.data.USER;

    this.hub.retrieveGameData(user, turn, function(data) {
        data.user = user;

        if (turn && data.isGameOver) {
          if (turn.user === PlayerRoles.STATE) {
            data.user = data.statePlayer;
          } else if (turn.user === PlayerRoles.TERRORIST) {
            data.user = data.terroristPlayer;
          }
        }

        self.data.ROLE = data.user === data.statePlayer ? PlayerRoles.STATE : PlayerRoles.TERRORIST;

        data.userRole = self.data.ROLE;
        self.hub.broadcast(self.hub.messages.GAME_UPDATE, data);
        var isLatestTurn = data.currentTurn.currentTurnNumber === data.latestTurnNumber;

        self.data.WAITING_FOR_OTHERS = isLatestTurn && self.hasPlayerTakenTurn(data);

        // Now see about getting the other player's data...
        self.refreshPlay();
      }
    );
  },

  //----------------------------------------------------------------------------
  refreshPlay: function() {
    var self = this;

    this.hub.retrievePlayerData(
      // Success callback
      function(data) {
        self.hub.forwardPlayerUpdate(data);

        if (((self.data.ROLE === PlayerRoles.STATE && !data.stateTakenTurn) ||
            (self.data.ROLE === PlayerRoles.TERRORIST && !data.terroristTakenTurn)) &&
            self.data.WAITING_FOR_OTHERS) {
          self.data.WAITING_FOR_OTHERS = false;
          self.refreshGameData();
          return;
        }
        else {
          setTimeout(self.refreshPlay, self.data.CHECK_FOR_PLAYER_TURNS_TIME);
        }
      },
      // Failure callback
      function() {
        setTimeout(self.refreshPlay, self.data.CHECK_FOR_PLAYER_TURNS_TIME);
      }
    );
  },

  //----------------------------------------------------------------------------
  hasPlayerTakenTurn: function(gameData) {
    if ((this.data.ROLE === PlayerRoles.STATE && gameData.currentTurn.statePlayer.pendingTurn !== null) ||
        (this.data.ROLE === PlayerRoles.TERRORIST && gameData.currentTurn.terroristPlayer.pendingTurn !== null)) {
      return true;
    }
    return false;
  }
});
