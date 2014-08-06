var transactionTypes = {

  PENDING : {
    parentClass : 'pendingTransactionsContainer',
    typeClass   : 'transactionsItem-pending'
  },
  
  INTRANSIT : {
    parentClass : 'inTransitTransactionsContainer',
    typeClass   : 'transactionsItem-inTransit'
  }
};

function PendingTransactions (root, click_function) {

  var self = this;
  
  var div = '<div class="transactionsContainer">\
              <div class="pendingTransactionsContainer">\
                <div class="transactionsHeading header-pending">Pending Transactions</div>\
              </div>\
              <div class="inTransitTransactionsContainer">\
                <div class="transactionsHeading header-intransit">In-Transit Transactions</div>\
              </div>\
            </div>';
  
  this.element = $(div);
  root.append(this.element);
  
  // methods
  
  this.addTransaction = function (amount, payee, transactionType) {
    var currTransaction = $('<div class="transactionsItem ' + transactionType.typeClass + '"></div>');
    
    currTransaction.text(dollarfy(amount) + ' to ' + payee);
    self.element.find('.' + transactionType.parentClass).append(currTransaction);
    //currTransaction.hide("slide", { direction: "left" }, 1500);
    //currTransaction.show("slide", { direction: "right" }, 1500);
  };
  
  this.highlight = function (active) {
    active = (typeof active === 'boolean') ? active : true;
    
    if (active) {
      //var d = self.element.find('.networkNode');
      self.element.addClass('networkNode-highlighted');
    }
    else {
      self.element.removeClass('networkNode-highlighted');
    }
  };
  
  
  
  this.select = function (active) {
    active = (typeof active === 'boolean') ? active : true;
    if (active) {
      self.highlight(!active);
      self.element.addClass('networkNode-selected');
    }
    else {
      self.element.removeClass('networkNode-selected');
    }
  };
  
  // events
  
  this.element.mouseenter(
    function () {
      
    }
  );
  
  this.element.mouseleave(
    function () {
    }
  );
  
  this.element.click(click_function);
  
}