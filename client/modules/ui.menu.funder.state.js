/*******************************************************************************
 * Displays and controls submenus for each node type
 ******************************************************************************/
Kernel.module.define('UIFunderMenu', {

  templates: null,
  ui: null,

  // -------------------------------------------------------------------------
  init: function() {
    this.hub.listen(this.hub.messages.DISPLAY_NODE_PROPERTIES, this.onTrigger);
  },

  // -------------------------------------------------------------------------
  onTrigger: function(node) {
    if (node.type === NodeTypes.FUNDER) {
      // Tell everyone that we're canceling our actions
      this.hub.broadcast(this.hub.messages.CANCEL_ACTIONS);
    }
  },
});
