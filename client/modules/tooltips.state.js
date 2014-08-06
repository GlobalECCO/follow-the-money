/*******************************************************************************
 * Tooltips to display for the State player
 ******************************************************************************/
if (typeof this.Tooltips === 'undefined') {
  this.Tooltips = {};
}

// --- NODES-------------------------------------------------------------------
this.Tooltips['NODES']['TERRORIST_NODE'] = {
  TITLE: 'Terrorist',
  TEXT: '',
};

this.Tooltips['NODES']['UNSUB_NODE'] = {
  TITLE: 'Unidentified Terrorist',
  TEXT:  '',
};

this.Tooltips['NODES'].fillTerroristKeys = function(tipText, node) {
  return tipText;
};

// --- NOTIFICATIONS------------------------------------------------------------
this.Tooltips.NOTIFICATIONS = {
  DISCOVERED_BANKS: {
    TITLE: 'Bank Discovered',
    TEXT:  '',
  },
  DISCOVERED_HAWALAS: {
    TITLE: 'Hawala Discovered',
    TEXT:  '',
  },
  DISCOVERED_LINKS: {
    TITLE: 'Link Discovered',
    TEXT:  '',
  },
  DISCOVERED_TERRORISTS: {
    TITLE: 'Terrorist Discovered',
    TEXT:  '',
  },
  FROZEN_MONEY: {
    TITLE: 'Money Frozen',
    TEXT:  '',
  },
  LOST_LEADS: {
    TITLE: 'Money Trail Ended',
    TEXT:  '',
  },
  TRACKED_MONEY: {
    TITLE: 'Money Tracked',
    TEXT:  '',
  },
};
