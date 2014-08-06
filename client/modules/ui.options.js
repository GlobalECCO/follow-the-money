/*******************************************************************************
 * Displays and controls enable/disable for sounds and toolips.
 ******************************************************************************/
Kernel.module.define('UIOptions', {

  templates: [{ file:'ui.options.html', property:'templateOptions' }],
  ui:null,

  // ---------------------------------------------------------------------------
  init: function() {
    this.hub.listen(this.hub.messages.MODULES_LOADED, this.onModulesLoaded);
    this.render();
  },

  // ---------------------------------------------------------------------------
  kill: function() {
    if (this.ui) {
      this.ui.remove();
      this.ui = null;
    }
  },

  // -------------------------------------------------------------------------
  onModulesLoaded: function() {
    // See if we were supposed to be enabled or not
    if (supportsLocalStorage()) {
      this.setInitialOptionStatus(localStorage.audioEnabled, this.onSoundToggle);
      this.setInitialOptionStatus(localStorage.tooltipsEnabled, this.onTooltipToggle);
    }
  },

  // ---------------------------------------------------------------------------
  render: function() {
    this.ui = $(this.templateOptions);
    var $soundToggle = this.ui.find('.option-soundToggle');
    var $toolTipToggle = this.ui.find('.option-toolTipToggle');

    $soundToggle.click(this.onSoundToggle);
    $toolTipToggle.click(this.onTooltipToggle);

    new Opentip($soundToggle[0], Tooltips.OPTIONS.SOUND.TEXT, Tooltips.OPTIONS.SOUND.TITLE);
    new Opentip($toolTipToggle[0], Tooltips.OPTIONS.TOOLTIPS.TEXT, Tooltips.OPTIONS.TOOLTIPS.TITLE);

    $(this.renderTo).append(this.ui);
  },

  // ---------------------------------------------------------------------------
  setInitialOptionStatus: function(option, toggleFunction) {
    if (option !== undefined && option !== 'true') {
      toggleFunction();
    }
  },

  // ---------------------------------------------------------------------------
  onSoundToggle: function() {
    var audio = Kernel.module.get('uiAudio');
    audio.setEnabled(!audio.enabled);
    this.ui.find('.option-soundToggle').toggleClass('Button-depressed', audio.enabled);
    if (supportsLocalStorage()) {
      localStorage.audioEnabled = audio.enabled;
    }
  },

  // ---------------------------------------------------------------------------
  onTooltipToggle: function() {
    Opentip.setEnabled(!Opentip._enabled);
    this.ui.find('.option-toolTipToggle').toggleClass('Button-depressed', Opentip._enabled);
    if (supportsLocalStorage()) {
      localStorage.tooltipsEnabled = Opentip._enabled;
    }
  },
});
