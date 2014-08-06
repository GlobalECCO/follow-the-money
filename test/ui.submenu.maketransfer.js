

function SubMenuMakeTransfer (root, todaysBalance, nodes, increment) {

  var self = this;
  var transferAmount = 0;
  var fees;

  var dollarfy = function (num) {
    //supports only whoel numbers
    num = parseInt(num) || 0;

    var negative = num < 0;
    num = Math.abs(num).toString();
    var numString = "";
    for (var i = num.length - 1, j = 0; i >= 0; i--, j++) {
      if (j===3) {
        numString = "," + numString;
        j = 0;
      }
      numString = num[i] + numString;
    }

    numString = "$" + numString;

    if (negative) {
      numString = "-" + numString;
    }
    return numString;
  };

  var totalFees = function (nodes) {
    var fees = 0;
    for (var i = 0; i < nodes.length; i++) {
      fees += nodes[i].fee
    }
    return fees;
  }

  fees = totalFees(nodes);

  var div = '<div class="makeTransferContainer">\
                <div class="makeTransferHeading">Transfer</div>\
                <div class="makeTransferLineItems">\
                  <div class="makeTransferLineItem">\
                    <div class="makeTransferLineItem-description">Today\'s Balance</div>\
                    <div class="makeTransferLineItem-value">' + dollarfy(todaysBalance) + '</div>\
                  </div>\
                  <div class="makeTransferLineItem makeTransferAmount">\
                    <div class="makeTransferLineItem-description">Starting Amount</div>\
                    <div class="makeTransferLineItem-value">' + dollarfy(transferAmount) + '</div>\
                    <div class="makeTransferLineItem-buttonLess">-</div>\
                    <div class="makeTransferLineItem-buttonMore">+</div>\
                  </div>\
                  <div class="makeTransferLineItem makeTransferFees">\
                    <div class="makeTransferLineItem-description">Fees</div>\
                    <div class="makeTransferLineItem-value">' + dollarfy(-(fees)) + '</div>\
                  </div>\
                  <div class="makeTransferLineItem makeTransferFinalAmount">\
                    <div class="makeTransferLineItem-description">Final Amount</div>\
                    <div class="makeTransferLineItem-value">' + dollarfy(transferAmount - fees) + '</div>\
                  </div>\
                 </div>\
                 <div class="makeTransferRoute">\
                 </div>\
              </div>';

  this.element = $(div);

  root.append(this.element);

  // methods

  var updateStartingAmount = function (amount) {
    self.element.find('.makeTransferAmount').children('.makeTransferLineItem-value').text(dollarfy(amount));
    self.element.find('.makeTransferFinalAmount').children('.makeTransferLineItem-value').text(dollarfy(amount - fees));

  };

  // events

  self.element.draggable();

  self.element.mouseenter(
    function () {

    }
  );

  self.element.mouseleave(
    function () {
    }
  );

  $('.makeTransferLineItem-buttonLess').click(
    function () {
      transferAmount -= increment;
      transferAmount = Math.min(Math.max(0,transferAmount),todaysBalance);
      updateStartingAmount(transferAmount);
    }
  );

  $('.makeTransferLineItem-buttonMore').click(
    function () {
      transferAmount += increment;
      transferAmount = Math.min(Math.max(0,transferAmount),todaysBalance);
      updateStartingAmount(transferAmount);
    }
  );

}