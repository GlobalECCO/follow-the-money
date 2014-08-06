/*******************************************************************************
 * Handles any state specific game logic
 ******************************************************************************/
Kernel.module.define('UIPlayback', {
  latestTurnNumber: -1,

  templates: [{ file:'ui.playback.html', property:'templatePlayback' }],
  ui: null,
  currentTurnNumber: -1,

  waitingForRefresh: false,

  // ---------------------------------------------------------------------------
  init: function() {
    this.hub.listen(this.hub.messages.NEW_GAME_STATE, this.onNewGameState);
    this.hub.listen(this.hub.messages.SUBMIT_TURN, this.onTurnSubmitted);

    this.render();
  },

  // ---------------------------------------------------------------------------
  kill: function() {
    if (this.ui) {
      this.ui.remove();
      this.ui = null;
    }
  },

  // ---------------------------------------------------------------------------
  onNewGameState: function(gameState) {
    this.currentTurnNumber = this.getTurnValue(gameState.currentTurn.currentTurnNumber, gameState.currentTurn.viewingPending);
    this.latestTurnNumber = this.getTurnValue(gameState.latestTurnNumber, gameState.latestPending);
    this.waitingForRefresh = false;

    var $indicator    = this.ui.find('.playbackPanel-currentTurn');
    var $rewindButton = this.ui.find('.control-rewind');
    var $forwardButton= this.ui.find('.control-forward');
    var $firstButton  = this.ui.find('.control-first');
    var $lastButton   = this.ui.find('.control-last');
    var $shownButton  = this.ui.find('.control-show-actions');
    var $hiddenButton = this.ui.find('.control-hide-actions');
    var $stateButton  = this.ui.find('.control-view-state');
    var $terrorButton = this.ui.find('.control-view-terrorist');

    if (this.currentTurnNumber > 1) {
      $rewindButton.removeClass('Button-disabled');
      $firstButton.removeClass('Button-disabled');
    } else {
      $rewindButton.addClass('Button-disabled');
      $firstButton.addClass('Button-disabled');
    }

    if (this.currentTurnNumber < this.latestTurnNumber) {
      $forwardButton.removeClass('Button-disabled');
      $lastButton.removeClass('Button-disabled');
      $shownButton.removeClass('Button-disabled');
      $hiddenButton.removeClass('Button-disabled');
    } else {
      $forwardButton.addClass('Button-disabled');
      $lastButton.addClass('Button-disabled');
      $shownButton.addClass('Button-disabled');
      $hiddenButton.addClass('Button-disabled');
    }

    if (gameState.isGameOver) {
      if (gameState.userRole === PlayerRoles.TERRORIST) {
        $stateButton.css('display', 'inline-block');
      }
      else {
        $terrorButton.css('display', 'inline-block');
      }
    }

    if (this.areShowingActions(this.currentTurnNumber)) {
      this.setShowActionsState();
    } else {
      this.setHideActionsState();
    }


    $indicator.text(this.getTurnCode(this.currentTurnNumber, true) + " / " + this.getTurnCode(this.latestTurnNumber, true));
  },

  // ---------------------------------------------------------------------------
  onTurnSubmitted: function() {
    this.currentTurnNumber += 1;
    this.latestTurnNumber += 1;

    var $indicator    = this.ui.find('.playbackPanel-currentTurn');
    var $rewindButton = this.ui.find('.control-rewind');
    var $forwardButton= this.ui.find('.control-forward');
    var $firstButton  = this.ui.find('.control-first');
    var $lastButton   = this.ui.find('.control-last');
    var $shownButton  = this.ui.find('.control-show-actions');
    var $hiddenButton = this.ui.find('.control-hide-actions');
    var $stateButton  = this.ui.find('.control-view-state');
    var $terrorButton = this.ui.find('.control-view-terrorist');

    $rewindButton.removeClass('Button-disabled');
    $firstButton.removeClass('Button-disabled');
    $shownButton.removeClass('Button-disabled');
    $hiddenButton.removeClass('Button-disabled');

    $forwardButton.removeClass('Button-disabled');
    $lastButton.removeClass('Button-disabled');
    $shownButton.removeClass('Button-disabled');
    $hiddenButton.removeClass('Button-disabled');

    this.setHideActionsState();

    $indicator.text(this.getTurnCode(this.currentTurnNumber, true) + " / " + this.getTurnCode(this.latestTurnNumber, true));
  },

  // ---------------------------------------------------------------------------
  render: function() {
    this.ui = $(this.templatePlayback);

    var $indicator    = this.ui.find('.playbackPanel-currentTurn');
    var $rewindButton = this.ui.find('.control-rewind');
    var $forwardButton= this.ui.find('.control-forward');
    var $firstButton  = this.ui.find('.control-first');
    var $lastButton   = this.ui.find('.control-last');
    var $shownButton  = this.ui.find('.control-show-actions');
    var $hiddenButton = this.ui.find('.control-hide-actions');
    var $stateButton  = this.ui.find('.control-view-state');
    var $terrorButton = this.ui.find('.control-view-terrorist');

    var self = this;
    $rewindButton.click(function() { self.onButtonClick(this); self.onRewindClicked(); });
    $forwardButton.click(function() { self.onButtonClick(this); self.onForwardClicked(); });
    $firstButton.click(function() { self.onButtonClick(this); self.onFirstClicked(); });
    $lastButton.click(function() { self.onButtonClick(this); self.onLastClicked(); });
    $shownButton.click(function() { self.onButtonClick(this); self.onShownClicked(); });
    $hiddenButton.click(function() { self.onButtonClick(this); self.onHiddenClicked(); });
    $stateButton.click(function() { self.onButtonClick(this); self.onStateClicked(); });
    $terrorButton.click(function() { self.onButtonClick(this); self.onTerroristClicked(); });

    new Opentip($indicator[0],     Tooltips.PLAYBACK.INDICATOR.TEXT,  Tooltips.PLAYBACK.INDICATOR.TITLE);
    new Opentip($rewindButton[0],  Tooltips.PLAYBACK.REWIND.TEXT,     Tooltips.PLAYBACK.REWIND.TITLE);
    new Opentip($forwardButton[0], Tooltips.PLAYBACK.FORWARD.TEXT,    Tooltips.PLAYBACK.FORWARD.TITLE);
    new Opentip($firstButton[0],   Tooltips.PLAYBACK.FIRST.TEXT,      Tooltips.PLAYBACK.FIRST.TITLE);
    new Opentip($lastButton[0],    Tooltips.PLAYBACK.LAST.TEXT,       Tooltips.PLAYBACK.LAST.TITLE);
    new Opentip($shownButton[0],    Tooltips.PLAYBACK.SHOW.TEXT,      Tooltips.PLAYBACK.SHOW.TITLE);
    new Opentip($hiddenButton[0],    Tooltips.PLAYBACK.HIDE.TEXT,      Tooltips.PLAYBACK.HIDE.TITLE);
    new Opentip($stateButton[0],   Tooltips.PLAYBACK.STATE.TEXT,      Tooltips.PLAYBACK.STATE.TITLE);
    new Opentip($terrorButton[0],  Tooltips.PLAYBACK.TERRORIST.TEXT,  Tooltips.PLAYBACK.TERRORIST.TITLE);

    this.setHideActionsState();

    $(this.renderTo).append(this.ui);
  },

  // ---------------------------------------------------------------------------
  setShowActionsState: function() {
    var $shownButton  = this.ui.find('.control-show-actions');
    var $hiddenButton = this.ui.find('.control-hide-actions');

    $shownButton.removeClass("Button-depressed");
    $hiddenButton.removeClass("Button-depressed");

    if (!$shownButton.hasClass("Button-disabled")) {
      $shownButton.addClass("Button-depressed");
    }
  },

  // ---------------------------------------------------------------------------
  setHideActionsState: function() {
    var $shownButton  = this.ui.find('.control-show-actions');
    var $hiddenButton = this.ui.find('.control-hide-actions');

    $shownButton.removeClass("Button-depressed");
    $hiddenButton.removeClass("Button-depressed");

    if (!$hiddenButton.hasClass("Button-disabled")) {
      $hiddenButton.addClass("Button-depressed");
    }
  },

  // ---------------------------------------------------------------------------
  onRewindClicked: function() {
    if (this.waitingForRefresh) {
      return;
    }

    this.setHideActionsState();

    var speed = 2;
    if (this.areShowingActions(this.currentTurnNumber)) {
      speed = 3;
    }

    if (this.currentTurnNumber >= speed) {
      this.waitingForRefresh = true;
      this.hub.broadcast(this.hub.messages.PLAYBACK_MODE_STARTED);
      this.hub.forwardGetTurn({
        turn:     this.getTurnData(this.currentTurnNumber-speed),
        prevTurn: this.getTurnData(this.currentTurnNumber),
        user:     window.overrideUser
      });
    } else if (this.currentTurnNumber > 0) {
      this.onFirstClicked();
    }
  },

  // ---------------------------------------------------------------------------
  onForwardClicked: function() {
    if (this.waitingForRefresh) {
      return;
    }

    this.setHideActionsState();

    var speed = 2;
    if (this.areShowingActions(this.currentTurnNumber)) {
      speed = 1;
    }

    if (this.currentTurnNumber < this.latestTurnNumber - speed - 1) {
      this.waitingForRefresh = true;
      this.hub.forwardGetTurn({
        turn:     this.getTurnData(this.currentTurnNumber+speed),
        prevTurn: this.getTurnData(this.currentTurnNumber),
        user:     window.overrideUser
      });
    } else if (this.currentTurnNumber < this.latestTurnNumber) {
      this.onLastClicked();
    }
  },

  // ---------------------------------------------------------------------------
  onShowActions: function() {
    if (this.waitingForRefresh) {
      return;
    }

    this.setShowActionsState();

    if (this.areShowingActions(this.currentTurnNumber)) {
      return;
    }

    if (this.currentTurnNumber < this.latestTurnNumber - 1) {
      this.waitingForRefresh = true;
      this.hub.forwardGetTurn({
        turn:     this.getTurnData(this.currentTurnNumber+1),
        prevTurn: this.getTurnData(this.currentTurnNumber),
        user:     window.overrideUser
      });
    } else if (this.currentTurnNumber < this.latestTurnNumber) {
      this.onLastClicked();
    }
  },

  // ---------------------------------------------------------------------------
  onHideActions: function() {
    if (this.waitingForRefresh) {
      return;
    }

    this.setHideActionsState();

    if (!this.areShowingActions(this.currentTurnNumber)) {
      return;
    }

    if (this.currentTurnNumber >= 1) {
      this.waitingForRefresh = true;
      this.hub.broadcast(this.hub.messages.PLAYBACK_MODE_STARTED);
      this.hub.forwardGetTurn({
        turn:     this.getTurnData(this.currentTurnNumber-1),
        prevTurn: this.getTurnData(this.currentTurnNumber),
        user:     window.overrideUser
      });
    } else if (this.currentTurnNumber > 0) {
      this.onFirstClicked();
    }
  },

  // ---------------------------------------------------------------------------
  onFirstClicked: function() {
    if (this.waitingForRefresh) {
      return;
    }

    this.setHideActionsState();

    if (this.currentTurnNumber > 0) {
      this.waitingForRefresh = true;
      this.hub.broadcast(this.hub.messages.PLAYBACK_MODE_STARTED);
      this.hub.forwardGetTurn({
        turn:     this.getTurnData(0),
        prevTurn: this.getTurnData(this.currentTurnNumber),
        user:     window.overrideUser
      });
    }
  },

  // ---------------------------------------------------------------------------
  onLastClicked: function() {
    if (this.waitingForRefresh) {
      return;
    }

    this.setHideActionsState();

    if (this.currentTurnNumber < this.latestTurnNumber) {
      this.waitingForRefresh = true;
      this.hub.broadcast(this.hub.messages.PLAYBACK_MODE_ENDED);
      this.hub.forwardGetTurn({
        turn:     this.getTurnData(this.latestTurnNumber),
        prevTurn: this.getTurnData(this.currentTurnNumber),
        user:     window.overrideUser
      });
    }
  },

  // ---------------------------------------------------------------------------
  onShownClicked: function() {
    var $shownButton = this.ui.find('.control-show-actions');
    if ($shownButton.hasClass('Button-disabled')) {
      return;
    }

    if (!$shownButton.hasClass('Button-depressed')) {
      this.onShowActions();
    }
  },

  // ---------------------------------------------------------------------------
  onHiddenClicked: function() {
    var $hiddenButton = this.ui.find('.control-hide-actions');
    if ($hiddenButton.hasClass('Button-disabled')) {
      return;
    }

    if (!$hiddenButton.hasClass('Button-depressed')) {
      this.onHideActions();
    }
  },

  // ---------------------------------------------------------------------------
  onStateClicked: function() {
    if (this.waitingForRefresh) {
      return;
    }

    this.waitingForRefresh = true;
    window.overrideUser = PlayerRoles.STATE;
    this.hub.forwardGetTurn({
      turn:     this.getTurnData(this.currentTurnNumber),
      prevTurn: this.getTurnData(this.currentTurnNumber),
      user: window.overrideUser
    });
  },

  // ---------------------------------------------------------------------------
  onTerroristClicked: function() {
    if (this.waitingForRefresh) {
      return;
    }

    this.waitingForRefresh = true;
    window.overrideUser = PlayerRoles.TERRORIST;
    this.hub.forwardGetTurn({
      turn:     this.getTurnData(this.currentTurnNumber),
      prevTurn: this.getTurnData(this.currentTurnNumber),
      user: window.overrideUser
    });
  },

  // ---------------------------------------------------------------------------
  onButtonClick: function(button) {
    if (!$(button).hasClass('Button-disabled')) {
      this.hub.broadcast(this.hub.messages.BUTTON_CLICK);
    }
  },

  // ---------------------------------------------------------------------------
  getTurnValue: function(turn, pending) {
    return (turn * 2) + (pending? 1: 0);
  },

  // ---------------------------------------------------------------------------
  getTurnCode: function(value, baseOne) {
    var turn = Math.floor(value / 2);
    if (baseOne) {
      turn += 1;
    }
    // if (value % 2 > 0) {
    //   return turn + "½";
    // }
    return turn + "";
  },

  // ---------------------------------------------------------------------------
  areShowingActions: function(value) {
    var turn = Math.floor(value / 2);
    if (value % 2 > 0) {
      return true;
    }
    return false;
  },

  // ---------------------------------------------------------------------------
  getTurnData: function(value) {
    var turn = {
      number: Math.floor(value / 2),
      pending: false,
    };
    if (value % 2 > 0) {
      turn.pending = true;
    }
    return turn;
  }
});

