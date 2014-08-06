/*******************************************************************************
 * Tooltips to display for both players. This file is loaded before other tooltip.js files
 ******************************************************************************/
if (typeof this.Tooltips === 'undefined') {
  this.Tooltips = {};
}

this.Tooltips['OPTIONS'] = {
  SOUND: {
    TITLE: 'Toggle Sound Effects',
    TEXT: '',
  },

  TOOLTIPS: {
    TITLE: 'Toggle Tooltips',
    TEXT: '',
  },
};

this.Tooltips['PLAYBACK'] = {
  INDICATOR: {
    TITLE: 'Turn Number',
    TEXT:  '',
  },

  REWIND: {
    TITLE: 'Go Back One Turn',
    TEXT: '',
  },

  FORWARD: {
    TITLE: 'Go Forward One Turn',
    TEXT: '',
  },

  FIRST: {
    TITLE: 'Go To Game Start',
    TEXT: '',
  },

  LAST: {
    TITLE: 'Go To Last Turn',
    TEXT: '',
  },

  SHOW: {
    TITLE: 'Show Submitted Player Actions',
    TEXT:  '',
  },

  HIDE: {
    TITLE: 'Hide Submitted Player Actions',
    TEXT:  '',
  },

  STATE: {
    TITLE: 'View State Turn',
    TEXT: '',
  },

  TERRORIST: {
    TITLE: 'View Terrorist Turn',
    TEXT: '',
  },
};

// --- NODES-------------------------------------------------------------------
this.Tooltips['NODES'] = {
  FUNDER_NODE: {
    TITLE: 'Terrorist Funder',
    TEXT:  '',
  },

  BANK_NODE: {
    TITLE: 'Bank',
    TEXT: '',
  },

  HAWALA_NODE: {
    TITLE: 'Hawala',
    TEXT: '',
  },

  AGENT_ICON: {
    TITLE: 'Agent',
    TEXT:  '',
  },

  AGENT_ICON_FOCUSING: {
    TITLE: 'Spotting',
    TEXT: '',
  },

  AGENT_ICON_FOLLOWING: {
    TITLE: 'Following',
    TEXT: '',
  },

  AGENT_ICON_FREEZING: {
    TITLE: 'Freezing',
    TEXT: '',
  },

  AGENT_ICON_INCAPACITATED: {
    TITLE: 'Disabled',
    TEXT: '',
  },

  AGENT_ICON_LOCKDOWN: {
    TITLE: 'Locking Down',
    TEXT: '',
  },
};

// --- CHAT--------------------------------------------------------------------
this.Tooltips['CHAT'] = {
  CHAT_BUTTON: {
    TITLE: 'View Chat',
    TEXT:  '',
  },
};

// --- STATUS------------------------------------------------------------------
this.Tooltips['STATUS'] = {
  STATE: {
    WAITING: {
      TITLE: 'State Waiting',
      TEXT:  '',
    },

    PLAYING: {
      TITLE: 'State Playing',
      TEXT:  '',
    }
  },

  TERRORIST: {
    WAITING: {
      TITLE: 'Terrorist Waiting',
      TEXT:  '',
    },

    PLAYING: {
      TITLE: 'Terrorist Playing',
      TEXT:  '',
    }
  }
};
