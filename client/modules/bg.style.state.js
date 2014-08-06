/*******************************************************************************
 * draws the background for state
 ******************************************************************************/
Kernel.module.define('BGstate', {

  templates: [],
  ui:null,

  // -------------------------------------------------------------------------
  init: function() {
    $(this.renderTo).addClass('player-state');
  },

  // -------------------------------------------------------------------------
  kill: function() {
    $(this.renderTo).removeClass('player-state');
  }
});
