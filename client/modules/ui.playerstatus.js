/*******************************************************************************
 * Displays the info panel
 ******************************************************************************/
Kernel.module.define('UIPlayerStatus', {

  templates: [{ file:'ui.playerstatus.html', property:'templatePlayerStatus' }],
  ui: null,
  inTutorial: false,
  stateTakenTurn: false,
  terroristTakenTurn: false,

  // -------------------------------------------------------------------------
  init: function() {
    this.show();
    this.hub.listen(this.hub.messages.PLAYER_UPDATE, this.updateTurnStatus);
    this.hub.listen(this.hub.messages.START_TUTORIAL, this.tutorialStarted);
    this.hub.listen(this.hub.messages.TUTORIAL_FINISHED, this.tutorialFinished);
  },

  // -------------------------------------------------------------------------
  kill: function() {
    this.hide();
  },

  // -------------------------------------------------------------------------
  show: function() {
    this.render();
  },

  // -------------------------------------------------------------------------
  hide: function() {
    if (this.ui !== null) {
      this.ui.remove();
      this.ui = null;
    }
  },

  // -------------------------------------------------------------------------
  updateTurnStatus: function (data) {
    if (!this.inTutorial) {
      if (data.stateTakenTurn != this.stateTakenTurn) {
        this.toggleStateStatus(data.stateTakenTurn);
      }
      if (data.terroristTakenTurn != this.terroristTakenTurn) {
        this.toggleTerroristStatus(data.terroristTakenTurn);
      }
    }

    this.stateTakenTurn = data.stateTakenTurn;
    this.terroristTakenTurn = data.terroristTakenTurn;
  },

  // -------------------------------------------------------------------------
  tutorialStarted: function (data) {
    this.inTutorial = true;
    this.toggleStateStatus(false);
    this.toggleTerroristStatus(false);
  },

  // -------------------------------------------------------------------------
  tutorialFinished: function (data) {
    this.inTutorial = false;
    this.toggleStateStatus(this.stateTakenTurn);
    this.toggleTerroristStatus(this.terroristTakenTurn);
  },

  // -------------------------------------------------------------------------
  render: function() {
    this.ui = $(this.templatePlayerStatus);
    $(this.renderTo).append(this.ui);
    this.toggleStateStatus(false);
    this.toggleTerroristStatus(false);
  },

  // -------------------------------------------------------------------------
  toggleStateStatus: function(waiting) {
    this.toggleStatus(waiting, this.ui.find('.playerStatus-state'),
      Tooltips.STATUS.STATE.WAITING, Tooltips.STATUS.STATE.PLAYING);
  },

  // -------------------------------------------------------------------------
  toggleTerroristStatus: function(waiting) {
    this.toggleStatus(waiting, this.ui.find('.playerStatus-terrorist'),
      Tooltips.STATUS.TERRORIST.WAITING, Tooltips.STATUS.TERRORIST.PLAYING);
  },

  // -------------------------------------------------------------------------
  toggleStatus: function(waiting, $element, waitingTooltip, playingTooltip) {
    $element.children('.playerStatus-status-waiting-animation').toggleClass('playerStatus-hidden', !waiting);
    $element.children('.playerStatus-status-playing-animation').toggleClass('playerStatus-hidden', waiting);

    if (waiting) {
      new Opentip($element[0], waitingTooltip.TEXT, waitingTooltip.TITLE);
    } else {
      new Opentip($element[0], playingTooltip.TEXT, playingTooltip.TITLE);
    }
  }
});
