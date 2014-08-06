/*******************************************************************************
 * Shared utility functions/"enums" for client side only to use
 ******************************************************************************/
//------------------------------------------------------------------------------
//Convert the supplied number into a proper dollarified text string
//If no multiplier param is supplied, the config.MONEYBAG_VALUE will be used.
//Example: dollarify(5) returns "$5,000"
function dollarify(num, multiplier) {
  multiplier = (multiplier ? multiplier : config.MONEYBAG_VALUE);

  num *= multiplier;

  //supports only whole numbers
  var remainder = Math.round(num * 100) % 100;
  num = parseInt(num) || 0;

  var negative = num < 0;
  num = Math.abs(num).toString();
  var numString = "";
  for (var i = num.length - 1, j = 0; i >= 0; i--, j++) {
    if (j === 3) {
      numString = "," + numString;
      j = 0;
    }
    numString = num[i] + numString;
  }

  numString = "$" + numString;
  if (remainder >= 10) {
    numString += '.' + remainder.toString();
  }
  else if (remainder > 0) {
    numString += '.0' + remainder.toString();
  }

  if (negative) {
    numString = "-" + numString;
  }
  return numString;
};

// -----------------------------------------------------------------------------
function hasPlayerTakenTurn(gameData) {
  var hasPlayerTakenTurn = false;

  if (gameData.userRole === PlayerRoles.TERRORIST) {
    // could be false or 'false'
    hasPlayerTakenTurn = (gameData.currentTurn.terroristPlayer.pendingTurn !== null);
  } else if (gameData.userRole === PlayerRoles.STATE) {
     // could be false or 'false'
    hasPlayerTakenTurn = (gameData.currentTurn.statePlayer.pendingTurn !== null);
  } else {
    console.error('no user role available');
  }

  return hasPlayerTakenTurn;
}

// -----------------------------------------------------------------------------
function setPosition($element, leftPct, topPct, marginLeft, marginTop) {
  $element.css('position', 'absolute');
  $element.css('top', topPct +'%');
  $element.css('left', leftPct + '%');
  $element.css('margin-left', marginLeft.toString() + 'px');
  $element.css('margin-top', marginTop.toString() + 'px');
};

// -----------------------------------------------------------------------------
function getPaymentMeterDivs(segments) {
  var divs = '';
  for (var i = 0; i < segments; i++) {
    divs += '<div class="playerCardViewMaintenanceSegment" style="width: ' + 100/segments + '%"></div>';
  }
  return divs;
};

// -----------------------------------------------------------------------------
//function setPaymentMeter($element, turns, maintenanceTime) {
//  $element.find('.playerCardViewMaintenanceSegment').removeClass('playerCardViewMaintenanceSegment-credit');
//  $element.find('.playerCardViewMaintenanceSegment').removeClass('playerCardViewMaintenanceSegment-full');
//  if (turns > 5) {
//    var turnsUntilPayment = turns % maintenanceTime === 0 ? maintenanceTime : turns % maintenanceTime;
//    if (turns > 10) {
//      for (var i = 1; i <= turnsUntilPayment; i++) {
//        $element.find('.playerCardViewMaintenanceCostMeter').children('.playerCardViewMaintenanceSegment:nth-child(' + i.toString() + ')').addClass('playerCardViewMaintenanceSegment-credit');
//      };
//    }
//    else {
//      for (var i = 1; i <= turnsUntilPayment; i++) {
//        $element.find('.playerCardViewMaintenanceCostMeter').children('.playerCardViewMaintenanceSegment:nth-child(' + i.toString() + ')').addClass('playerCardViewMaintenanceSegment-full');
//      };
//    };
//
//
//    //$element.find('.playerCardViewMaintenanceSegment').addClass('playerCardViewMaintenanceSegment-credit');
//  }
//  else if (turns > 0) {
//    for (var i = 1; i <= turns; i++) {
//      $element.find('.playerCardViewMaintenanceCostMeter').children('.playerCardViewMaintenanceSegment:nth-child(' + i.toString() + ')').addClass('playerCardViewMaintenanceSegment-critical');
//    };
//  }
//};


// -----------------------------------------------------------------------------
function findMoneyByID(moneyList, id) {
  for (var moneyIndex = 0; moneyIndex < moneyList.length; ++moneyIndex) {
    if (moneyList[moneyIndex].id === id) {
      return moneyList[moneyIndex];
    }
  }

  return null;
};

// -----------------------------------------------------------------------------
function getMoneyPosition(moneyObj, root, linkData) {
  var $link = $('#Link-' + linkData.id);
  var linkLerp = moneyObj.waitTime / linkData.travelTime;
  var startPos = $link.data('start');
  var endPos = $link.data('end');

  var x1 = root.outerWidth() * (startPos.x / 100);
  var y1 = root.outerHeight() * (startPos.y / 100);

  var x2 = root.outerWidth() * (endPos.x / 100);
  var y2 = root.outerHeight() * (endPos.y / 100);

  var xLerp = x1 + (x2 - x1) * linkLerp;
  var yLerp = y1 + (y2 - y1) * linkLerp;

  return { x: xLerp, y: yLerp };
};

// -----------------------------------------------------------------------------
function getLinkPositions(root, linkID) {
  var $link = $('#Link-' + (linkID && linkID.toString()));

  // If the link is valid, make the calculations
  if ($link.length > 0) {
    var startPos = $link.data('start');
    var endPos = $link.data('end');
    var startX = root.outerWidth() * (startPos.x / 100);
    var startY = root.outerHeight() * (startPos.y / 100);
    var endX = root.outerWidth() * (endPos.x / 100);
    var endY = root.outerHeight() * (endPos.y / 100);
    return { start: { x: startX, y: startY },
             end: { x: endX, y: endY },
             valid: true };
  } else {
    return { start: { x: 0, y: 0 },
             end: { x: 0, y: 0 },
             valid: false };
  }
};

// -----------------------------------------------------------------------------
function getNodePosition(root, id) {
  var $node = $('#Node-' + id.toString());

  // If the link is valid, make the calculations
  if ($node.length > 0) {
    var offset = $node.offset();
    if (typeof $node.data('position') !== 'undefined') {
      var x = ($node.data('position').x / 100) * $('#network-root').width();
      var y = ($node.data('position').y / 100) * $('#network-root').height();
    } else {
      var x = parseFloat($node.css('left'));
      var y = parseFloat($node.css('top'));
    }
  }

  return { x: x, y: y };
}

// -----------------------------------------------------------------------------
function getMaintenanceDetails(node) {
  var details = {};
  details.cost = BalanceValues.TERRORIST_MAINTENANCE_COSTS;
  details.time = BalanceValues.TERRORIST_TIME_TO_MAINTENANCE;
  if (node.maintenanceTime > -1) {
    details.turnsLeft = Math.floor((node.balance + details.cost) / details.cost) * details.time - node.maintenanceTime;
    details.payNeeded = details.cost - node.balance % details.cost;
  }
  else {
    details.turnsLeft = -1;
    details.payNeeded = -1;
  }
  return details;
}

// -----------------------------------------------------------------------------
function getAgentIconClassForStatus(status) {
  switch (status) {
    case AgentStatus.FOLLOWING:
      return 'agentStatusIcon-following';
    break;
    case AgentStatus.FOCUSING:
      return 'agentStatusIcon-focusing';
    break;
    case AgentStatus.FREEZING:
      return 'agentStatusIcon-frozen';
    break;
    case AgentStatus.INCAPACITATED:
      return 'agentStatusIcon-disabled';
    break;
    case AgentStatus.LOCKDOWN:
      return 'agentStatusIcon-lockdown';
    break;
  }

  return '';
}

// -----------------------------------------------------------------------------
function supportsLocalStorage() {
  try {
    return 'localStorage' in window && window['localStorage'] !== null;
  } catch (e) {
    return false;
  }
}

//-------------------------------------------------------------------------------
//Is this money in transit?
function isMoneyInTransit(money) {
  if (money.status === MoneyStatus.NEW ||
    money.status === MoneyStatus.DEPOSITED ||
    money.status === MoneyStatus.FAKE ||
    money.status === MoneyStatus.INVALID) {
    return false;
  }
  else {
    return true;
  }
};

//------------------------------------------------------------------------------
//Is this money pending? (it's new and has a route, but not on the route yet)
function isMoneyPending(money) {
  return money.status === MoneyStatus.NEW && money.route.length > 0;
}

//-------------------------------------------------------------------------------
//Is this money available to use by the terrorist funder? (new money, with no route defined)
function isMoneyAvailableToTransfer(money) {
  return money.status === MoneyStatus.NEW && money.route.length === 0;
}
