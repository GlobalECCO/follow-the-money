/*******************************************************************************
 * Responsible for determining what happens when UI is interacted with
 ******************************************************************************/
Kernel.module.define('LimitedInputController', {
  selectedNode: -1,

  // ---------------------------------------------------------------------------
  init: function() {
    this.hub.listen(this.hub.messages.NODE_SELECTED, this.onNodeClicked);
    $(document).on('click.cancelActions', this.onBackgroundClicked);
  },

  // ---------------------------------------------------------------------------
  kill: function() {
    $(document).off('click.cancelActions');
  },

  // ---------------------------------------------------------------------------
  onNodeClicked: function(node) {
    this.hub.broadcast(this.hub.messages.HIDE_NODE_PROPERTIES);
    if (node !== this.selectedNode) {
      this.getNetworkController().displayNodeProperties(node);
      this.selectedNode = node;
    }
    else {
      this.selectedNode = -1;
    }
  },

  // ---------------------------------------------------------------------------
  onBackgroundClicked: function() {
    this.hub.broadcast(this.hub.messages.HIDE_NODE_PROPERTIES);
    this.selectedNode = -1;
  },

  // ---------------------------------------------------------------------------
  getNetworkController: function() {
    return Kernel.module.get('controller-network');
  }
});
