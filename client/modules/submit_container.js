/*******************************************************************************
 * Controls behavior for the terrorist network
 ******************************************************************************/
Kernel.module.define('SubmitContainer', {
  templates: [{ file:'submit_container.html', property:'submitContainer' }],
  ui: null,
  enabled: true,

  // ---------------------------------------------------------------------------
  init: function() {
    this.hub.listen(this.hub.messages.NEW_GAME_STATE, this.onNewGameState);
    this.hub.listen(this.hub.messages.SUBMIT_FAILED, this.onSubmitFailed);

    this.ui = $(this.submitContainer);
    $(this.renderTo).append(this.ui);
    this.ui.find('.cancelButton').click(this.cancel);
    this.ui.find('.submitButton').click(this.submit);
  },

  // ---------------------------------------------------------------------------
  kill: function() {
    if (this.ui) {
      this.ui.remove();
      this.ui = null;
    }
  },

  // ---------------------------------------------------------------------------
  onNewGameState: function(details) {
    // Make sure that after reload/refresh, we bring up the visual if the turn was submitted
    if (details.userRole === PlayerRoles.STATE) {
      this.setEnabled(details.currentTurn.statePlayer.pendingTurn === null);
    } else if (details.userRole === PlayerRoles.TERRORIST) {
      this.setEnabled(details.currentTurn.terroristPlayer.pendingTurn === null);
    }
  },

  // ---------------------------------------------------------------------------
  onSubmitFailed: function(details) {
    this.setEnabled(true);
  },

  // ---------------------------------------------------------------------------
  cancel: function(e) {
    if (this.enabled) {
      this.hub.broadcast(this.hub.messages.CANCEL_CHANGES);
      this.hub.forwardCancelChanges();
    }
    e.stopPropagation();
  },

  // ---------------------------------------------------------------------------
  submit: function(e) {
    if (this.enabled) {
      this.hub.broadcast(this.hub.messages.SUBMIT_TURN);
      this.hub.forwardSubmitTurn();
      this.setEnabled(false);
    }
    e.stopPropagation();
  },

  // ---------------------------------------------------------------------------
  setEnabled: function(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      $(this.renderTo).find('.cancelButton,.submitButton').addClass('Button-disabled');
    } else {
      $(this.renderTo).find('.cancelButton,.submitButton').removeClass('Button-disabled');
    }
  },
});
