/*******************************************************************************
 * Displays the game credits
 ******************************************************************************/

// ---------------------------------------------------------------------------
function Timer(callback, delay) {
  var timerId, start, remaining = delay;

  this.pause = function() {
    window.clearTimeout(timerId);
    remaining -= new Date() - start;
  };

  this.resume = function() {
    start = new Date();
    timerId = window.setTimeout(callback, remaining);
  };

  this.resume();
}

Kernel.module.define('UICredits', {

  templates: [{ file: 'ui.credits.button.html', property: 'templateButton' },
              { file: 'ui.credits.html', property: 'templateCredits' }],
  button: null,
  ui: null,
  anim: null,

  // ---------------------------------------------------------------------------
  init: function() {
    this.button = $(this.templateButton);
    $(this.renderTo).append(this.button);
    this.button.click(this.creditsClicked);

    this.ui = $(this.templateCredits);
    this.ui.hide();
    this.ui.find('.credits-block').each(function(index){
      $(this).hide();
    });
    $(this.renderTo).append(this.ui);
    this.ui.click(this.creditsClosed);

    this.creditShowAnimation(this);
    this.anim.pause();
  },

  // ---------------------------------------------------------------------------
  kill: function() {
    if (this.ui) {
      this.button.remove();
      this.button = null;
      this.ui.remove();
      this.ui = null;
    }
    this.anim.pause();
    this.anim = null;
  },

  // ---------------------------------------------------------------------------
  creditsClicked: function() {
    this.ui.show();
    this.anim.resume();
  },

  // ---------------------------------------------------------------------------
  creditsClosed: function() {
    this.ui.hide();
    this.anim.pause();
  },

  // ---------------------------------------------------------------------------
  creditShowAnimation: function(self) {
    var nextCredit = self.ui.find('.credits-block').first();

    var visibleCredit = self.ui.find('.credits-block').filter('.credits-block-visible');
    if (visibleCredit.length) {
      nextCredit = visibleCredit.next('.credits-block');
      if (!nextCredit.length) {
        nextCredit = self.ui.find('.credits-block').first();
      }
      visibleCredit.removeClass('credits-block-visible');
      visibleCredit.fadeOut(1000);
    }

    self.anim = new Timer(function() {
      self.creditShow(self, nextCredit);
    }, 1000);
  },

  // ---------------------------------------------------------------------------
  creditShow: function(self, creditToShow) {
    if (creditToShow.length)
    {
      creditToShow.addClass('credits-block-visible');
      creditToShow.fadeIn(1000);
    }

    self.anim = new Timer(function() {
      self.creditShowAnimation(self);
    }, 2000);
  },
});
