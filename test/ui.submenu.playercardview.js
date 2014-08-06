

function SubMenuPlayerCardView (root, terroristName, maintenanceCost, maintenanceTime, turnsUntilBroke, fundingGoal, fundingProgress) {

  var self = this;
  fundingGoal = fundingGoal || false;
  var fundingVisibility = fundingGoal ? '' : 'style="display: none"';

  var getPaymentMeterDivs = function (segments) {
    var divs = '';
    for (var i = 0; i < segments; i++) {
      divs += '<div class="playerCardViewMaintenanceSegment" style="width: ' + 100/segments + '%"></div>';
    }
    return divs;
  };

  var div = '<div class="playerCardViewContainer">\
              <div class="playerCardViewHeading">' + terroristName.toString() + '</div>\
              <div class="playerCardViewSubHeading">Maintenance Cost</div>\
              <div class="playerCardViewSubHeading playerCardViewSubHeadingAlt">' + dollarfy(maintenanceCost) + ' / ' + maintenanceTime.toString() + ' Turns</div>\
              <div class="playerCardViewMeterSection">\
                <div class="playerCardViewFundingProgressContainer" ' + fundingVisibility + '>\
                  <div class="playerCardViewFundingProgressHeader">Funding Progress</div>\
                  <div class="playerCardViewFundingProgressMeter">\
                    <div class="playerCardViewFundingProgressMeterFill"></div>\
                    <div class="playerCardViewFundingProgressMeterText">' + dollarfy(fundingProgress) + '</div>\
                  </div>\
                  <div class="playerCardViewFundingProgressLabelLeft">$0</div>\
                  <div class="playerCardViewFundingProgressLabelRight">' + dollarfy(fundingGoal) + '</div>\
                </div>\
                <div class="playerCardViewMaintenanceCostContainer">\
                  <div class="playerCardViewMaintenanceCostHeader">Payment Needed In ' + turnsUntilBroke.toString() + ' Turns</div>\
                  <div class="playerCardViewMaintenanceCostMeter">' + getPaymentMeterDivs(maintenanceTime) + '</div>\
                  <div class="playerCardViewMaintenanceCostLabelLeft"></div>\
                  <div class="playerCardViewMaintenanceCostLabelRight">' + dollarfy(maintenanceCost) + '</div>\
                </div>\
              </div>\
             </div>';

  this.element = $(div);

  root.append(this.element);

  // methods

  var updateStartingAmount = function (amount) {
    self.element.find('.playerCardViewAmount').children('.playerCardViewLineItem-value').text(dollarfy(amount));
    self.element.find('.playerCardViewFinalAmount').children('.playerCardViewLineItem-value').text(dollarfy(amount - fees));

  };

  this.setPaymentMeter = function (turns) {
    self.element.find('.playerCardViewMaintenanceSegment').removeClass('playerCardViewMaintenanceSegment-credit');
    self.element.find('.playerCardViewMaintenanceSegment').removeClass('playerCardViewMaintenanceSegment-full');
    self.element.find('.playerCardViewMaintenanceCostHeader').text('Payment Needed In ' + turns.toString() + ' Turns');
    if (turns > maintenanceTime) {
      self.element.find('.playerCardViewMaintenanceSegment').addClass('playerCardViewMaintenanceSegment-credit');
    }
    else if (turns > 0 && turns <= maintenanceTime) {
      for (var i = 1; i <= turns; i++) {
        self.element.find('.playerCardViewMaintenanceCostMeter').children('.playerCardViewMaintenanceSegment:nth-child(' + i.toString() + ')').addClass('playerCardViewMaintenanceSegment-full');
      };
    }

  };

  this.updateData = function () {
  };

  // events

  self.setPaymentMeter(turnsUntilBroke);

  self.element.draggable();

  self.element.mouseenter(
    function () {

    }
  );

  self.element.mouseleave(
    function () {
    }
  );

  $('.playerCardViewLineItem-buttonLess').click(
    function () {
      transferAmount -= increment;
      transferAmount = Math.min(Math.max(0,transferAmount),todaysBalance);
      updateStartingAmount(transferAmount);
    }
  );

  $('.playerCardViewLineItem-buttonMore').click(
    function () {
      transferAmount += increment;
      transferAmount = Math.min(Math.max(0,transferAmount),todaysBalance);
      updateStartingAmount(transferAmount);
    }
  );

}