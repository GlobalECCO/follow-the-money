var PlayerCardThemes = {

  none : {
    cardSize: 'playerCardLarge',
    cardColor: 'playerCard-color-redplayer',
    textSize: 'playerCard-textSize-Large',
    meterFundBack: 'playerCardMeter-back-red',
    fundMetershowing: '',
    segmentOutline: 'playerCardPaymentSegment-red',
    highlighted: 'playerCard-color-redplayer-highlight',
    selected: 'playerCard-color-redplayer-select'
  },

  redLeader : {
    cardSize: 'playerCardLarge',
    cardColor: 'playerCard-color-redleader',
    textSize: 'playerCard-textSize-Large',
    meterFundBack: 'playerCardMeter-back-red',
    fundMetershowing: '',
    segmentOutline: 'playerCardPaymentSegment-redleader',
    highlighted: 'playerCard-color-redleader-highlight',
    selected: 'playerCard-color-redleader-select'
  },

  redPlayer : {
    cardSize: 'playerCardLarge',
    cardColor: 'playerCard-color-redplayer',
    textSize: 'playerCard-textSize-Large',
    meterFundBack: 'playerCardMeter-back-red',
    fundMetershowing: '',
    segmentOutline: 'playerCardPaymentSegment-redplayer',
    highlighted: 'playerCard-color-redplayer-highlight',
    selected: 'playerCard-color-redplayer-select'
  },

  redTerrorist : {
    cardSize: 'playerCardSmall',
    cardColor: 'playerCard-color-redterrorist',
    textSize: 'playerCard-textSize-Small',
    meterFundBack: 'playerCardMeter-back-red',
    fundMetershowing: 'playerCardElement-hidden',
    segmentOutline: 'playerCardPaymentSegment-redterrorist',
    highlighted: 'playerCard-color-redterrorist-highlight',
    selected: 'playerCard-color-redterrorist-select'
  },

  blueAgent : {
    cardSize: 'playerCardLarge',
    cardColor: 'playerCard-color-blue',
    textSize: 'playerCard-textSize-Large',
    meterFundBack: 'playerCardElement-hidden',
    fundMetershowing: '',
    segmentOutline: 'playerCardPaymentSegment-blue',
    highlighted: 'playerCard-color-blue-highlight',
    selected: 'playerCard-color-blue-select'
  }
};

function PlayerCard (root, portraitClass, name, theme, maintenanceSegments) {

  var self = this;
  var upkeepSegments = maintenanceSegments || 1;
  theme = theme || PlayerCardThemes.none;
  
  var maintenanceDivs = function () {
    var segmentDivs = '';
    for (var i = 0; i < upkeepSegments; i++)
    {
      segmentDivs += '<div class="playerCardPaymentSegment ' + theme.segmentOutline + '" style="width: ' + 100/upkeepSegments + '%"><div class="playerCardPaymentMeterFill"></div></div>';
    }
    return segmentDivs;
  }();
  
  var div = '<div class="playerCard ' + theme.cardSize + ' ' + theme.cardColor + '">\
             <div class="playerCardPortrait ' + portraitClass + '"></div>\
             <div class="playerCardName ' + theme.textSize + '">' + name + '</div>\
             <div class="playerCardMeters">\
             <div class="playerCardFundsMeter ' + theme.meterFundBack + ' ' + theme.segmentOutline + ' ' + theme.fundMetershowing + '">\
             <div class="playerCardFundsMeterFill ' + theme.segmentOutline + '"></div>\
             </div>\
             <div class="playerCardPaymentMeter ' + theme.meterFundBack + '">\
             ' + maintenanceDivs + '\
             </div>\
             </div>\
             </div>';
  
  this.element = $(div);
  
  root.append(this.element);
  
  this.setFundsMeter = function (percentage) {
    percentage = percentage || 100;
    var fundsMeter = self.element.find('.playerCardFundsMeterFill');
    fundsMeter.width(parseInt(percentage) + '%');
  };
  
  this.setPaymentMeter = function (fillAmount) {
    fillAmount = fillAmount || '100%';
    
    if (typeof fillAmount === 'string' && fillAmount.indexOf("%") !== -1) {
      fillAmount = (parseInt(fillAmount) / 100) * upkeepSegments;
    }
    
    if (typeof fillAmount === 'number') {
      fillAmount = Math.max(Math.min(Math.round(fillAmount),upkeepSegments),0);
    }
    else {
      fillAmount = 0;
    }
    
    self.element.find('.playerCardPaymentMeterFill').removeClass('playerCardPaymentMeterFill-full');
    for (var i = 0; i < fillAmount; i++ )
    {
      self.element.find('.playerCardPaymentSegment:nth-child(' + (i+1).toString() + ')').addClass('playerCardPaymentMeterFill-full');
    }
    
  };
  
  this.highlight = function (active) {
    active = (typeof active === 'boolean') ? active : true;
    
    if (active) {
      
      //var d = self.element.find('.networkNode');
      self.element.addClass(theme.highlighted);
    }
    else {
      self.element.removeClass(theme.highlighted);
    }
  };
  
  this.select = function (active) {
    active = (typeof active === 'boolean') ? active : true;
    if (active) {
      self.highlight(!active);
      self.element.addClass(theme.selected);
    }
    else {
      self.element.removeClass(theme.selected);
    }
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
  
}