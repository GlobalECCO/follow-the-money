/*******************************************************************************
 * Util functions shared amongst all game logic files
 ******************************************************************************/
var MoneyStatus = require('../../shared/money_status.js').MoneyStatus;
var BalanceValues = require('../../shared/balance_values.js').BalanceValues;
var BitArray = require('bitarray');
var GameEndReason = require('../../shared/game_end_reasons.js').GameEndReason;
var GamePhase = require('../../shared/game_phase.js').GamePhase;

//------------------------------------------------------------------------------
// Is the given index number in the given list of index numbers?
this.isIndexInList = function(indexInQuestion, list) {
  for (var index = 0; index < list.length; ++index) {
    if (list[index] === indexInQuestion) {
      return true;
    }
  }
  return false;
};

//------------------------------------------------------------------------------
// Generate a random float value within a range.
this.randRangeFloat = function(min, max) {
  return Math.random() * (max - min) + min;
};

//------------------------------------------------------------------------------
// Generate a random integer value within a range.
this.randRangeInt = function(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

//------------------------------------------------------------------------------
// Randomly shuffle around the contents of the array
this.shuffleArray = function(array) {
  var itemsToSort = array.length;
  while (--itemsToSort > -1) {
    // Pick a random item
    var randomIndex = this.randRangeInt(0, itemsToSort);

    // Swap it with the current item to sort
    var temp = array[itemsToSort];
    array[itemsToSort] = array[randomIndex];
    array[randomIndex] = temp;
  }
};

//------------------------------------------------------------------------------
this.generateFakeMoneyFollowBits = function() {
  var numBits = 30;
  var numToSet = Math.round(numBits * BalanceValues.FAKE_MONEY_CHANCE_TO_MOVE / 100);
  var ba = new BitArray(numBits);

  // Set the percentage of ones
  for (var i = 0; i < numToSet; ++i) {
    ba.set(i, 1);
  }

  // shuffle them
  for (var i = 0; i < numBits; ++i) {
    var randIndex = this.randRangeInt(0, numBits - 1);
    var temp = ba.get(i);

    // swap
    ba.set(i, ba.get(randIndex));
    ba.set(randIndex, temp);
  }

  return ba;
}

//------------------------------------------------------------------------------
this.shouldFollowFakeMoney = function(fakeMoneyFollowBits, trial) {
  var ba = new BitArray(0);
  ba.size = fakeMoneyFollowBits.size;
  ba.field = fakeMoneyFollowBits.field;

  var whichBit = (trial % ba.size);

  console.log('returning bit ' + whichBit + ' ---- (' + ba.get(whichBit).toString() + ')');

  return ba.get(whichBit);
}

//------------------------------------------------------------------------------
// Get the first consecutive number not being used as an id in this list of
// objects with IDs
this.getUniqueID = function(gameState) {
  return gameState.uniqueID++;
};

//-------------------------------------------------------------------------------
// Common function to freeze the supplied real money
this.freezeRealMoneyObj = function (money, statePlayer) {
  money.status = MoneyStatus.FROZEN;
  statePlayer.amountOfFrozenRealMoney += money.amount;
};

//-----------------------------------------------------------------------------
this.didStatePlayerWin = function(turnData) {
  switch (turnData.gameEndReason) {
    case GameEndReason.STATE_CHOSE_WISELY:
    case GameEndReason.TERRORIST_LEADER_BROKE:
    case GameEndReason.TERRORIST_MINIONS_BROKE:
    case GameEndReason.TERRORIST_RAN_OUT_OF_MONEY:
      return true;
      break;
  };
  return false;
};

//------------------------------------------------------------------------------
this.didTerroristPlayerWin = function(turnData) {
  switch (turnData.gameEndReason) {
    case GameEndReason.TERRORIST_FUNDED:
    case GameEndReason.STATE_CHOSE_POORLY:
      return true;
      break;
  };
  return false;
};
