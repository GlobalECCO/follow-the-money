/*******************************************************************************
 * Controls behavior for the terrorist network
 ******************************************************************************/
Kernel.module.define('UITransferMenu', {

  templates: [{ file:'transfer.html', property:'templateTransfer' }],

  balance:0,
  transfer:0,
  time:0,
  ui:null,

  // ---------------------------------------------------------------------------
  init: function() {
    this.hub.listen([this.hub.messages.SHOW_TRANSFER_DIALOGUE], this.show);
    this.hub.listen([this.hub.messages.HIDE_TRANSFER_DIALOGUE], this.hide);
    this.hub.listen([this.hub.messages.CANCEL_ROUTE], this.hide);
  },

  // -------------------------------------------------------------------------
  kill: function() {
    this.hide();
  },

  // ---------------------------------------------------------------------------
  show: function(details) {
    this.balance = details.balance;
    this.transfer = 1;
    this.time = details.time;
    this.render(details);
  },

  // ---------------------------------------------------------------------------
  hide: function() {
    if (this.ui !== undefined) {
      // Undo our changes for the purposes of this submenu
      var nodeID = this.ui.data('id');
      this.hub.broadcast(this.hub.messages.RESET_NODE_LAYER, { id: nodeID });

      this.ui.remove();
    }
  },

  // ---------------------------------------------------------------------------
  onPlus: function(e) {
    this.transfer = Math.min(this.transfer + 1, this.balance);
    this.renderValues();
    e.stopPropagation();

    this.onTransferAmountChanged();
    this.updatePlusMinisVisibility();
  },

  // ---------------------------------------------------------------------------
  onMinus: function(e) {
    this.transfer = Math.max(this.transfer - 1, 1);
    this.renderValues();
    e.stopPropagation();

    this.onTransferAmountChanged();
    this.updatePlusMinisVisibility();
  },

  // ---------------------------------------------------------------------------
  onSubmit: function(e) {
    if (this.transfer > 0) {
      this.hub.broadcast(this.hub.messages.TRANSFER_SUBMITTED, { amount: this.transfer, newTransfer: true });
      this.hide();
    }

    e.stopPropagation();
  },

  // ---------------------------------------------------------------------------
  onTransferAmountChanged: function() {
    this.hub.broadcast(this.hub.messages.TRANSFER_AMOUNT_CHANGED);
  },

  // ---------------------------------------------------------------------------
  render: function(details) {
    this.ui = $(this.templateTransfer);
    var $plusButton = this.ui.find('.makeTransferLineItem-buttonMore');
    var $minusButton = this.ui.find('.makeTransferLineItem-buttonLess');

    $plusButton.click(this.onPlus);
    $minusButton.click(this.onMinus);

    var $transferButton = this.ui.find('.makeTransferSubmitButton');
    $transferButton.click(this.onSubmit);

    new Opentip($minusButton[0], Tooltips.TRANSFERS.DECREASE_FUNDS.TEXT, Tooltips.TRANSFERS.DECREASE_FUNDS.TITLE);
    new Opentip($plusButton[0],  Tooltips.TRANSFERS.INCREASE_FUNDS.TEXT, Tooltips.TRANSFERS.INCREASE_FUNDS.TITLE);

    this.renderValues();
    this.updatePlusMinisVisibility();
    $(this.renderTo).append(this.ui);
    this.ui.data('id', details.nodeID);
    $(this.ui).click(function(e){e.stopPropagation();}); // Prevent UI from hiding when clicking within the property box.

    var $node = $("#Node-" + details.nodeID);
    this.positionMenu($node);

    // Make sure we don't occlude the node
    this.hub.broadcast(this.hub.messages.CHANGE_NODE_LAYER, { id: details.nodeID, layer: 5 });
  },

  // -------------------------------------------------------------------------
  positionMenu: function(node) {
    var width = parseInt(this.ui.css('width'), 10);
    var height = parseInt(this.ui.css('height'), 10);

    var posX = node.data('position').x;
    var posY = node.data('position').y;
    posX -= node.outerWidth() / $('#network-root').width() * 50;
    posY -= node.outerHeight() / $('#network-root').height() * 50;

    // Default top right corner.
    var marginLeft = -width - 60;
    var marginTop = 0;

    // middle height
    if (posY >= 40 && posY <= 70) {
      marginTop = -(height * 0.25);
      this.ui.find('.nodeViewPointer-before, .nodeViewPointer-after').each(function() {
        $(this).css('top', (height / 2) - 12 + "px");
      });
    }

    // bottom height
    if (posY > 70) {
      marginTop = -(height / 2);
      this.ui.find('.nodeViewPointer-before, .nodeViewPointer-after').each(function() {
        $(this).css('top', height - 60 + "px");
      });
    }

    setPosition(this.ui, posX, posY, marginLeft, marginTop);
  },

  // ---------------------------------------------------------------------------
  renderValues: function() {
    this.ui.find('#balance').html(dollarify(this.balance));
    this.ui.find('.makeTransferAmount > .makeTransferLineItem-value').html(dollarify(this.transfer));
    this.ui.find('.makeTransferTime > .makeTransferLineItem-value').html(this.time);
  },

  // ---------------------------------------------------------------------------
  // todo, create custom styles for disabled plus/minus
  updatePlusMinisVisibility: function() {
    var buttonMore = this.ui.find('.makeTransferLineItem-buttonMore');
    var buttonLess = this.ui.find('.makeTransferLineItem-buttonLess');

    buttonMore.off('click');
    buttonLess.off('click');

    // if we hit the max, disable +
    if (this.balance === this.transfer) {
      buttonMore.addClass('Button-disabled');

    } else {
      buttonMore.removeClass('Button-disabled');
      buttonMore.click('click', this.onPlus);
    }

    // if we hit the min, disable -
    if (this.transfer === 1) {
      buttonLess.addClass('Button-disabled');
    } else {
      buttonLess.removeClass('Button-disabled');
      buttonLess.click('click', this.onMinus);
    }
  }
});
