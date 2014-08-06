/*******************************************************************************
 * draws the background for terrorist
 ******************************************************************************/
Kernel.module.define('BGterrorist', {

  templates: [],
  ui:null,

  // -------------------------------------------------------------------------
  init: function() {
    $(this.renderTo).addClass('player-terrorist');
  },

  // -------------------------------------------------------------------------
  kill: function() {
    $(this.renderTo).removeClass('player-terrorist');
  }
});
