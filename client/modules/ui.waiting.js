/*******************************************************************************
 * Displays animated colored bars while waiting for the next turn
 ******************************************************************************/
Kernel.module.define('UIWaiting', {

  templates: [{ file:'waiting.html', property:'templateWaiting' }],
  data: { ui:null, blocks:[], intervalID:-1, startTime:0, currentIndex:0 },
  intervalID: -1,

  // ---------------------------------------------------------------------------
  init: function() {
    this.hub.listen([this.hub.messages.SUBMIT_TURN], this.show);
    this.hub.listen([this.hub.messages.SUBMIT_FAILED], this.hide);
    this.hub.listen([this.hub.messages.NEW_GAME_STATE], this.onNewGameState);
  },

  // ---------------------------------------------------------------------------
  kill: function() {
    this.hide();
  },

  // ---------------------------------------------------------------------------
  show: function() {
    this.hide();
    // this.render();
    // this.data.startTime = Date.now();
    // this.data.intervalID = setInterval(this.onAnimate, 16);

    var lastTime = Date.now();
    var percentPerSecond = 15;
    var $body = $(document.body);

    // Scroll the background
    this.intervalID = setInterval(function() {
        var currentTime = Date.now();
        var dt = (currentTime - lastTime) / 1000;
        var top = parseFloat($body.css('background-position').split(' ')[1]);
        var newTop = (top + dt * percentPerSecond).toString();
        $(document.body).css('background-position', '0% ' + newTop + '%');
        lastTime = currentTime;
      }, 0);
  },

  // ---------------------------------------------------------------------------
  hide: function(details) {
    clearInterval(this.data.intervalID);
    if (this.data.ui !== undefined) {
      this.data.ui.remove();
    }

    // Stop scrolling the background
    if (this.intervalID !== -1) {
      clearInterval(this.intervalID);
      this.intervalID = -1;
    }
  },

  // ---------------------------------------------------------------------------
  render: function() {
    this.data.ui = $(this.templateWaiting);
    var w1 = this.data.ui.children('#wait1');
    var w2 = this.data.ui.children('#wait2');
    var w3 = this.data.ui.children('#wait3');
    var w4 = this.data.ui.children('#wait4');
    var w5 = this.data.ui.children('#wait5');
    var w6 = this.data.ui.children('#wait6');
    this.data.blocks = [w1, w2, w3, w4, w5, w6];
    $(this.renderTo).append(this.data.ui);
  },

  // ---------------------------------------------------------------------------
  onNewGameState: function(details) {
    // Make sure that after reload/refresh, we bring up the visual if the turn was submitted
    if (details.userRole === PlayerRoles.STATE) {
      (details.currentTurn.statePlayer.pendingTurn !== null) ? this.show(): this.hide();
    } else if (details.userRole === PlayerRoles.TERRORIST) {
      (details.currentTurn.terroristPlayer.pendingTurn !== null) ? this.show(): this.hide();
    }
  },

  // ---------------------------------------------------------------------------
  onAnimate: function() {
    var divsPerSecond = 8;
    var elapsed = (Date.now() - this.data.startTime) * divsPerSecond / 5000;

    var piOver2 = Math.PI / 2;

    // Awesome mathy goodness below
    // make sine linear and normalize (0 to 1)
    var value = (Math.asin(Math.sin(elapsed * Math.PI)) + piOver2) / Math.PI;

    this.data.blocks.forEach(function(block) {
      block.css('background-color', '#888888');
    });

    this.data.blocks[Math.round(value * 5)].css('background-color', '#ffffff');
  }
});
