/*******************************************************************************
 * Tooltips to display for the Terrorist player
 ******************************************************************************/
if (typeof this.Tooltips === 'undefined') {
  this.Tooltips = {};
}

// --- NODES-------------------------------------------------------------------
this.Tooltips['NODES']['TERRORIST_NODE']= {
  TITLE: 'Terrorist Minion',
  TEXT: '<table width="100%"><tr>' +
          '<td colspan="2"><strong>$NEEDED$</strong> spent each turn</td>' +
        '</tr></table>',
};

this.Tooltips['NODES']['TERRORIST_LEADER_NODE']= {
  TITLE: 'Terrorist Leader',
  TEXT: '<table width="100%"><tr>' +
          '<td colspan="2"><strong>$NEEDED$</strong> spent each turn</td>' +
        '</tr></table>',
};

this.Tooltips['NODES']['AGENT_ICON']= {
  TITLE: 'Agent',
  TEXT:  '',
};

this.Tooltips['NODES'].fillTerroristKeys = function (tipText, node) {
  var maintenanceDetails = getMaintenanceDetails(node);
  tipText = tipText.replace('$NEEDED$', dollarify(maintenanceDetails.cost));
  return tipText;
};

// --- NOTIFICATIONS------------------------------------------------------------
this.Tooltips.NOTIFICATIONS = {
  DEPOSITED_MONEY: {
    TITLE: 'Money Deposited',
    TEXT:  '',
  },
  FOLLOWED_MONEY: {
    TITLE: 'Money Followed',
    TEXT:  '',
  },
  FROZEN_MONEY: {
    TITLE: 'Money Frozen',
    TEXT:  '',
  },
  POOR_TERRORISTS: {
    TITLE: 'Low Balance',
    TEXT:  '',
  },
  SPOTTED_BANK_MONEY: {
    TITLE: 'Money Spotted',
    TEXT:  '',
  },
  SPOTTED_HAWALA_MONEY: {
    TITLE: 'Money Spotted',
    TEXT:  '',
  },
};

// --- TRANSFERS----------------------------------------------------------------
this.Tooltips['TRANSFERS'] = {
  REROUTE: {
    TITLE: 'Reroute Transaction',
    TEXT:  '',
  },

  INCREASE_FUNDS: {
    TITLE: 'Increase Funds',
    TEXT:  '',
  },

  DECREASE_FUNDS: {
    TITLE: 'Decrease Funds',
    TEXT:  '',
  },

  CANCEL: {
    TITLE: 'Cancel Transaction',
    TEXT:  '',
  },

  RESET: {
    TITLE: 'Reset Changes',
    TEXT: '',
  }
};
