/*******************************************************************************
 * Kernel.js hub extension to support modules
 ******************************************************************************/

// Define the main Hub - NOTE: 'main' is the default hub used if not otherwise specified in Kernel.start()
Kernel.hub.define('main', {

  data: {
    GID: null,
    cache:{
      latestTurnNumber:-1,
      latestPending:-1,
      isGameOver:false,
      statePlayer:'',
      terroristPlayer:''
    }
  },

  messages: {
    // Internal signals
    GAME_UPDATE: 'main.gameUpdate', // { statePlayer (String), terroristPlayer (String), prevTurn (Object), currentTurn (Object) }
    CHANGE_GAME_STATE: 'main.changeGameState', // { user (String), userRole(String), statePlayer (String), latestTurnNumber(Number), latestPending(Bool), isGameOver (Bool), isPlayback (Bool), terroristPlayer (String), prevTurn (Object), currentTurn (Object) }
    OVERRIDE_GAME_STATE: 'main.overrideGameState', // { user (String), userRole(String), statePlayer (String), latestTurnNumber(Number), latestPending(Bool), isGameOver (Bool), isPlayback (Bool), terroristPlayer (String), prevTurn (Object), currentTurn (Object), previousNetwork(Object), currentNetwork(Object) }
    GET_TURN: 'main.getTurn', // { turn (String), prevTurn (String), user (String) }

    // Game Introduction Signals
    START_TUTORIAL: 'main.start-tutorial', // steps (Tutorial Steps Data)
    TUTORIAL_RESTART: 'main.tutorial-restart', // No Parameters
    TUTORIAL_FINISHED: 'main.tutorial-finished', // No Parameters

    // External Signals
    AGENT_MOVE: 'main.moveAgent', // {agentID (Number), NodeID (Number)}
    HAWALA_LOCKDOWN: 'main.hawalaLockdown', // nodeID (Number)
    MONEY_FOLLOWED: 'main.followMoney', // { agentID (Number), moneyID (Number) }
    MONEY_FREEZING: 'main.freezeMoney', // { agentID (Number), moneyID (Number) }
    MONEY_IGNORED: 'main.ignoreMoney', // moneyID (Number)
    MONEY_COURIER: 'main.courierMoney', // { moneyID (Number), cost (Number), delay (Number) }
    MONEY_RESET: 'main.resetMoney', // moneyID (Number)
    MONEY_RESET_COURIER: 'main.resetCourierMoney', // moneyID (Number)
    ACCEPT_ROUTE: 'main.acceptRoute', // { startNode (Number), moneyTransferred (Number), route [(Number)] }
    CHANGE_ROUTE_AMOUNT: 'main.changeRouteAmount', // { moneyID (Number), amount (Number) }
    DELETE_ROUTE: 'main.deleteRoute', // Money ID (Number)
    ACCUSE_TERRORIST: 'main.accuseTerrorist', // nodeID (Number)
    CANCEL_CHANGES: 'main.cancelChanges', // No parameters
    TRANSFER_RESET: 'transfer-reset', // Money ID (Number)
    SUBMIT_TURN: 'main.submitTurn', // No parameters
    TURN_SUBMITTED: 'main.turnSubmitted' // No parameters
  },

  //----------------------------------------------------------------------------
  retrieveSessionData: function(successCB, failCB) {
    var self = this;

    Kernel.doAjax({
      type: 'GET',
      url: 'sessionData?rand=' + parseInt(Math.random() * 99999999, 10),
      success: function(data) {
        console.log('Game data - ID: ' + data.gid + ' User: ' + data.user);
        self.data.GID = data.gid;
        successCB && successCB(data);
      },
      failure: function(er) {
          console.error(er);
          failCB && failCB(er);
      }
    });
  },

  //----------------------------------------------------------------------------
  retrieveGameData: function(user, turn, successCB) {
    var self = this;
    var url = 'pull?gid=' + self.data.GID + '&user=' + user;

    // Determine the requested role based on the user and the requested turn
    var role = null;
    if (turn && turn.user) {
      role = turn.user;
    } else if (this.data.cache.statePlayer.length > 0) {
      role = (user === this.data.cache.statePlayer) ? PlayerRoles.STATE: PlayerRoles.TERRORIST;
    }

    var turnCache = self.retrieveGameDataFromCache(role, turn);

    // If we've already seen and cached the turns requested, return them immediately
    if (!turnCache) {
      if (typeof turn !== 'undefined') {
        url += '&turnNumber=' + turn.turn.number;
        if (turn.turn.pending) {
          url += '&pending=1';
        }

        if (typeof turn.prevTurn !== 'undefined') {
          url += '&prevTurn=' + turn.prevTurn.number;
          if (turn.prevTurn.pending) {
            url += '&prevPending=1';
          }
        }
        if (turn.user) {
          url += '&overrideUser=' + turn.user;
        }
      }
      url += '&rand=' + parseInt(Math.random() * 99999999, 10);

      Kernel.doAjax({
        type: 'GET',
        url: url,
        success: function(data) {
          //console.log('Game data - ID: ' + data.GID + ' User: ' + data.USER);
          // We've received new turn info, store it for quick retrieval later
          self.updateTurnCache(role, data);
          successCB && successCB(data);
        },
        failure: function(er) {
            alert('This game has been removed, redirecting back to lobby.');
            window.location = '/';
        }
      });
    } else {
      // Rebuild the requested turn info using cached data
      var cacheData = {
        latestTurnNumber:this.data.cache.latestTurnNumber,
        latestPending:this.data.cache.latestPending,
        isGameOver:this.data.cache.isGameOver,
        isPlayback:this.data.cache.latestTurnNumber !== turnCache.currentTurn.number,
        statePlayer:this.data.cache.statePlayer,
        terroristPlayer:this.data.cache.terroristPlayer,
        prevTurn:turnCache.prevTurn,
        currentTurn:turnCache.currentTurn
      };

      successCB && successCB(cacheData);
    }
  },

  //----------------------------------------------------------------------------
  updateTurnCache: function(role, data) {

    this.data.cache.latestTurnNumber = data.latestTurnNumber;
    this.data.cache.latestPending = data.latestPending;
    this.data.cache.isGameOver = data.isGameOver;
    this.data.cache.statePlayer = data.statePlayer;
    this.data.cache.terroristPlayer = data.terroristPlayer;

    this.saveTurnToCache(role, data.currentTurn);

    // We don't always have a previous turn
    if (data.prevTurn) {
      this.saveTurnToCache(role, data.prevTurn);
    }
  },

  //----------------------------------------------------------------------------
  saveTurnToCache: function(role, turn) {
    var turnNumber = turn.currentTurnNumber;
    var turnPending = (turn.hasOwnProperty('viewingPending') && turn.viewingPending == true);

    // Store the current turn if we don't already have it
    if (!this.retrieveGameDataFromCache(role, turnNumber, turnPending)) {
      var entry = {};
      $.extend(true, entry, turn);

      if (!this.data.cache.hasOwnProperty(role)) {
        this.data.cache[role] = {};
      }

      if (!this.data.cache[role].hasOwnProperty(turnNumber)) {
        this.data.cache[role][turnNumber] = {};
      }

      this.data.cache[role][turnNumber][turnPending ? 1: 0] = entry;
    }
  },

  //----------------------------------------------------------------------------
  retrieveGameDataFromCache: function(role, turnData) {
    if (role !== null && turnData !== undefined && turnData.turn !== undefined && turnData.prevTurn !== undefined) {
      // Grab the current and previous turns if they exist in the form we want (with or without pending)
      var currentTurn = this.retrieveTurnFromCache(role, turnData.turn.number, turnData.turn.pending);
      var prevTurn = this.retrieveTurnFromCache(role, turnData.prevTurn.number, turnData.prevTurn.pending);

      if (currentTurn !== null && prevTurn !== null) {
        return { currentTurn: currentTurn, prevTurn: prevTurn };
      }
    }

    return null;
  },

  //----------------------------------------------------------------------------
  retrieveTurnFromCache: function(role, turnNumber, pending) {
    if (this.data.cache.hasOwnProperty(role) &&
        this.data.cache[role].hasOwnProperty(turnNumber) &&
        this.data.cache[role][turnNumber].hasOwnProperty(pending ? 1: 0)) {
      return this.data.cache[role][turnNumber][pending ? 1: 0];
    }

    return null;
  },

  //----------------------------------------------------------------------------
  retrievePlayerData: function(successCB, failureCB) {
    var self = this;
    Kernel.doAjax({
      type: 'GET',
      url: 'playerData?gid=' + self.data.GID + '&rand=' + parseInt(Math.random() * 99999999, 10),
      success: function(data) {
        successCB && successCB(data);
      },
      failure: function(er) {
        failureCB && failureCB();
      }
    });
  },

  //----------------------------------------------------------------------------
  retrieveFullNetwork: function(successCB) {
    var self = this;
    Kernel.doAjax({
      type: 'GET',
      url: 'fullNetwork?gid=' + self.data.GID + '&rand=' + parseInt(Math.random() * 99999999, 10),
      success: function(data) {
        successCB && successCB(data);
      },
      failure: function(er) {
          alert('This game has been removed, redirecting back to lobby.');
          window.location = '/';
      }
    });
  },

  //----------------------------------------------------------------------------
  retrievePartialNetwork: function(turn, prevTurn, successCB) {
    var cachedNetwork = this.retrieveCachedPartialNetwork(turn, prevTurn);

    if (!cachedNetwork) {
      var self = this;
      var url = 'partialNetwork?gid=' + self.data.GID;
      if (typeof turn !== 'undefined') {
        url += '&turnNumber=' + turn;
      }
      if (typeof prevTurn !== 'undefined') {
        url += '&prevTurn=' + prevTurn;
      }
      url += '&rand=' + parseInt(Math.random() * 99999999, 10);

      Kernel.doAjax({
        type: 'GET',
        url: url,
        success: function(data) {
          // Store the data in the cache so we don't have to ajax it again
          var networkData = {
            current: {
              number: turn,
              network: data.currentNetwork
            },
            previous: {
              number: prevTurn,
              network: data.previousNetwork
            }
          };

          self.updatePartialNetworkCache(networkData);
          successCB && successCB(data);
        },
        failure: function(er) {
            alert('This game has been removed, redirecting back to lobby.');
            window.location = '/';
        }
      });
    } else {
      successCB && successCB(cachedNetwork);
    }
  },

  //----------------------------------------------------------------------------
  retrieveCachedPartialNetwork: function(turnNumber, previousTurnNumber) {
    if (this.data.cache.hasOwnProperty('partialNetwork') &&
        this.data.cache.partialNetwork.hasOwnProperty(turnNumber) &&
        this.data.cache.partialNetwork.hasOwnProperty(previousTurnNumber)) {
      return {
        currentNetwork: this.data.cache.partialNetwork[turnNumber],
        previousNetwork: this.data.cache.partialNetwork[previousTurnNumber]
      }
    }

    return null;
  },

  //----------------------------------------------------------------------------
  updatePartialNetworkCache: function(data) {
    if (!this.data.cache.hasOwnProperty('partialNetwork')) {
      this.data.cache.partialNetwork = {};
    }

    if (!this.data.cache.partialNetwork.hasOwnProperty(data.current.number)) {
      this.data.cache.partialNetwork[data.current.number] = data.current.network;
    }

    if (!this.data.cache.partialNetwork.hasOwnProperty(data.previous.number)) {
      this.data.cache.partialNetwork[data.previous.number] = data.previous.network;
    }
  },

  //----------------------------------------------------------------------------
  //Send the gid, user, action list to the server
  sendGameData: function(user, actions, successCB, failCB) {
    var self = this;
    Kernel.doAjax({
      type: 'POST',
      url: 'push?gid=' + self.data.GID + '&user=' + user,
      params: 'actions=' + actions,
      success: function() {
        successCB && successCB();
      },
      failure: function(er) {
          console.error(er);
          failCB && failCB();
      }
    });
  },

  //----------------------------------------------------------------------------
  // Forward that all modules have been loaded
  forwardModulesLoaded: function() {
    var gameHub = this.getGameHub();
    gameHub.broadcast(gameHub.messages.MODULES_LOADED);
  },

  //----------------------------------------------------------------------------
  // Forward a new game state/network to the game hub
  forwardNewGameState: function(data) {
    var gameHub = this.getGameHub();
    gameHub.broadcast(gameHub.messages.NEW_GAME_STATE, data);
  },

  //----------------------------------------------------------------------------
  // Forward the current game state/network to the game hub
  forwardUpdatedGameState: function(data) {
    var gameHub = this.getGameHub();
    gameHub.broadcast(gameHub.messages.UPDATE_GAME_STATE, data);
  },

  //----------------------------------------------------------------------------
  // Forward the current player data to the game hub
  forwardPlayerUpdate: function(data) {
    var gameHub = this.getGameHub();
    gameHub.broadcast(gameHub.messages.PLAYER_UPDATE, data);
  },

  //----------------------------------------------------------------------------
  // Forward a message the turn submitting failed
  forwardSubmitFailed: function() {
    var gameHub = this.getGameHub();
    gameHub.broadcast(gameHub.messages.SUBMIT_FAILED);
  },

  //----------------------------------------------------------------------------
  // Forward that the tutorial started
  forwardTutorialStart: function(data) {
    var gameHub = this.getGameHub();
    gameHub.broadcast(gameHub.messages.START_TUTORIAL, data);
    this.broadcast(this.messages.START_TUTORIAL, data);
  },

  //----------------------------------------------------------------------------
  // Forward that the tutorial finished
  forwardTutorialFinished: function() {
    var gameHub = this.getGameHub();
    gameHub.broadcast(gameHub.messages.TUTORIAL_FINISHED);
    this.broadcast(this.messages.TUTORIAL_FINISHED);
  },

  //----------------------------------------------------------------------------
  // Get the game hub
  getGameHub: function() {
    return Kernel.hub.get('game');
  },
});
