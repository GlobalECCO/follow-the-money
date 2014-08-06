/*******************************************************************************
 * Displays the info panel
 ******************************************************************************/
Kernel.module.define('UIPlayerStatusState', {

  // -------------------------------------------------------------------------
  init: function() {
    this.hub.listen(this.hub.messages.MODULES_LOADED, this.onModulesLoaded);
  },

  // -------------------------------------------------------------------------
  onModulesLoaded: function() {
    $('.playerStatus').css('top','80px');
  }
});
