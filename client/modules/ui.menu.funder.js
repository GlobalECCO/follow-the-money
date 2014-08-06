/*******************************************************************************
 * Displays and controls submenus for each node type
 ******************************************************************************/
Kernel.module.define('UIFunderMenu', {
  extend: 'UIBaseMenu',

  //templates: [{ file:'node.submenu.funder.html', property:'templateFunderMenu' }],
  ui:null,
  actionsEnabled:true,

  // -------------------------------------------------------------------------
  init: function() {
    var self = this;
    this.hub.listen([this.hub.messages.DISPLAY_NODE_PROPERTIES], this.onTrigger);
    this.hub.listen([this.hub.messages.HIDE_NODE_PROPERTIES, this.hub.messages.SUBMIT_TURN, this.hub.messages.CANCEL_CHANGES], this.onHideProperties);
    this.hub.listen(this.hub.messages.ENABLE_ACTIONS, function() { self.actionsEnabled = true; });
    this.hub.listen(this.hub.messages.DISABLE_ACTIONS, function() { self.actionsEnabled = false; });
  },

  // -------------------------------------------------------------------------
  onTrigger: function(node) {
    if (node.type === NodeTypes.FUNDER) {
      this.show(node);
    }
  },

  // -------------------------------------------------------------------------
  show: function(node) {
    if (this.actionsEnabled) {
      // Immediately start building a route to transfer money
      this.hub.broadcast(this.hub.messages.START_ROUTE);
    }
  },

  // -------------------------------------------------------------------------
  onBeginTransfer: function(e) {
    this.hub.broadcast(this.hub.messages.START_ROUTE);
    this.hide();
    e.stopPropagation();
  },

  // // -------------------------------------------------------------------------
  // render: function(details) {
  //   this.ui = $(this.templateFunderMenu);
  //   this.ui.data('id', details.node.id);
  //   this.ui.children('.playerCardViewHeading').html(details.node.name);

  //   var fundingProgress = details.node.fundedAmount;
  //   var fundingGoal = BalanceValues.TERRORIST_MONEY_GOAL;
  //   this.renderProgress(fundingProgress, fundingGoal);

  //   this.ui.find('#transfer').click(this.onBeginTransfer);
  //   //this.ui.draggable({scroll:false});
  //   $(this.renderTo).append(this.ui);
  //   $(this.ui).click(function(e){ e.stopPropagation(); }); // Prevent UI from hiding when clicking within the property box.

  //   var width = parseInt(this.ui.css('width'), 10);
  //   var height = parseInt(this.ui.css('height'), 10);
  //   var marginLeft = -75;
  //   var marginTop = -95;

  //   setPosition(this.ui, details.node.position.x, details.node.position.y, marginLeft, marginTop);

  //   // Make sure we don't occlude the node
  //   this.hub.broadcast(this.hub.messages.CHANGE_NODE_LAYER, { id: details.node.id, layer: 5 });
  // },

  // // -------------------------------------------------------------------------
  // renderProgress: function(progress, goal) {
  //   this.ui.find('.playerCardViewFundingProgressMeterText').html(dollarify(progress));
  //   this.ui.find('.playerCardViewFundingProgressLabelRight').html(dollarify(goal));
  //   this.ui.find('.playerCardViewFundingProgressMeterFill').css('width', Math.round(progress * 100 / goal).toString() + '%');
  // }
});
