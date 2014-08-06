/*******************************************************************************
 * Responsible for loading all necessary modules for a player's UI
 ******************************************************************************/
Kernel.module.define('ModuleLoader', {
  loaded: '',
  modules: [],
  currentTeam: null,

  // ---------------------------------------------------------------------------
  init: function() {
    this.hub.listen(this.hub.messages.GAME_UPDATE, this.onGameUpdate);
  },

  //----------------------------------------------------------------------------
  onGameUpdate: function(data) {
    var self = this;
    var currentPhase = data.currentTurn.phase;

    var isState = data.user === data.statePlayer;

    if (this.currentTeam !== isState) {
      self.loaded = "";
      this.currentTeam = isState;
    }

    // If the modules haven't been loaded, then load them
    if (self.loaded !== currentPhase) {
      self.unloadModules();
      self.loaded = currentPhase;
      var isGameOver = currentPhase === GamePhase.ENDGAME;
      self.loadSharedModules(isGameOver);
      // Check which player this is and load the appropriate modules
      if (!isGameOver) {
        if (isState) {
          self.loadStateModules();
        }
        else {
          self.loadTerroristModules();
        }
      }
      else {
        self.loadEndGameModules();
      }
      self.loadModules(function() {
        self.broadcastModulesLoaded();
        self.broadcastStart(data);
      });
    }
    else {
      self.broadcastStart(data);
    }
  },

  //----------------------------------------------------------------------------
  unloadModules: function() {
    for (var moduleIndex = 0; moduleIndex < this.modules.length; ++moduleIndex) {
      var module = this.modules[moduleIndex];
      if (module.id !== '') {
        Kernel.stop(module.id);
        Kernel.unregister(module.id);
      }
    }
    this.modules = [];
  },

  //----------------------------------------------------------------------------
  loadStateModules: function() {
    this.addModule('tooltips.state.js', '', '', '');
    this.addModule('controller.state.js', 'sideController', 'StateController', 'game');
    this.addModule('ui.menu.funder.state.js', 'uiFunderMenu', 'UIFunderMenu', 'game', { renderTo: '#menu-root'});
    this.addModule('ui.menu.finance.state.js', 'uiFinanceMenu', 'UIFinanceMenu', 'game', { renderTo: '#menu-root'});
    this.addModule('ui.menu.terrorist.state.js', 'uiTerroristForStateMenu', 'UITerroristForStateMenu', 'game', { renderTo: '#menu-root'});
    this.addModule('ui.hud.state.js', 'uiStateHUD', 'UIStateHUD', 'game', { renderTo: '.top-bar'});
    this.addModule('ui.notifications.state.js', 'uiNotifications', 'UINotifications', 'game', { renderTo: '.bottom-bar'});
    this.addModule('bg.style.state.js', 'bgState', 'BGstate', 'game', { renderTo: '#whichPlayer'});
    this.addModule('ui.playerstatus.state.js', 'uiPlayerStatusState', 'UIPlayerStatusState', 'game');
    this.addModule('ui.tutorial.state.js', 'uiTutorialState', 'UITutorialState', 'main');
    this.addModule('tutorial_focus.js', 'tutorialFocus', 'TutorialFocus', 'main', { renderTo: 'body'});
  },

  //----------------------------------------------------------------------------
  loadTerroristModules: function() {
    this.addModule('tooltips.terrorist.js', '', '', '');
    this.addModule('controller.terrorist.js', 'sideController', 'TerroristController', 'game');
    this.addModule('ui.menu.funder.js', 'uiFunderMenu', 'UIFunderMenu', 'game', { renderTo: '#menu-root'});
    this.addModule('ui.menu.finance.terrorist.js', 'uiFinanceMenu', 'UIFinanceMenu', 'game', { renderTo: '#menu-root'});
    this.addModule('ui.menu.terrorist.js', 'uiTerroristMenu', 'UITerroristMenu', 'game', { renderTo: '#menu-root'});
    this.addModule('ui.menu.transfer.js', 'uiTransfer', 'UITransferMenu', 'game', { renderTo: '#menu-root'});
    this.addModule('ui.hud.terrorist.js', 'uiTerroristHUD', 'UITerroristHUD', 'game', { renderTo: '.top-bar'});
    this.addModule('ui.hud.transactionlist.js', 'uiTransactionList', 'UITransactionList', 'game', { renderTo: '.middle-bar'});
    this.addModule('ui.notifications.terrorist.js', 'uiNotifications', 'UINotifications', 'game', { renderTo: '.bottom-bar'});
    this.addModule('bg.style.terrorist.js', 'bgTerrorist', 'BGterrorist', 'game', { renderTo: '#whichPlayer'});
    this.addModule('ui.tutorial.terrorist.js', 'uiTutorialTerrorist', 'UITutorialTerrorist', 'main');
    this.addModule('tutorial_focus.js', 'tutorialFocus', 'TutorialFocus', 'main', { renderTo: 'body'});
  },

  //----------------------------------------------------------------------------
  loadEndGameModules: function() {
    this.addModule('tooltips.endgame.js', '', '', '');
    this.addModule('ui.menu.finance.endgame.js', 'uiFinanceMenu', 'UIFinanceMenu', 'game', { renderTo: '#menu-root' });
    this.addModule('ui.menu.terrorist.js', 'uiTerroristMenu', 'UITerroristMenu', 'game', { renderTo: '#menu-root'});
  },

  //----------------------------------------------------------------------------
  loadSharedModules: function (isGameOver) {
    if (!isGameOver) {
      this.addModule('ui.playerstatus.js', 'uiPlayerStatus', 'UIPlayerStatus', 'game', { renderTo: '.middle-bar' });
      this.addModule('controller.input.js', 'controller-input', 'InputController', 'game');
      this.addModule('route_builder.js', 'routeBuilder', 'RouteBuilder', 'game');
      this.addModule('submit_container.js', 'submitContainer', 'SubmitContainer', 'game', { renderTo: '.middle-bar'});
      this.addModule('ui.waiting.js', 'uiWaiting', 'UIWaiting', 'game', { renderTo: '.middle-bar'});
      this.addModule('ui.tutorial.js', 'uiTutorial', 'UITutorial', 'main');
    }
    else {
      this.addModule('controller.input.limited.js', 'controller-input-limited', 'LimitedInputController', 'game');
      this.addModule('ui.endgame.js', 'uiEndGame', 'UIEndGame', 'game', { renderTo: '#menu-root'});
      this.addModule('ui.credits.js', 'uiCredits', 'UICredits', 'game', { renderTo: '.middle-bar'});
    }
    this.addModule('ui.basemenu.js', 'ui-basemenu', 'UIBaseMenu', 'game', '');

    this.addModule('controller.game.js', 'controller-game', 'GameController', 'main');
    this.addModule('controller.network.js', 'controller-network', 'NetworkController', 'game');
    this.addModule('ui.audio.js', 'uiAudio', 'UIAudio', 'game');
    this.addModule('ui.network.js', 'uiNetwork', 'UINetwork', 'game', { renderTo: '.middle-bar'});
    this.addModule('ui.playback.js', 'uiPlayback', 'UIPlayback', 'game', { renderTo: '.bottom-bar'});
    this.addModule('ui.options.js', 'uiOptions', 'UIOptions', 'game', { renderTo: '.bottom-bar'});
    this.addModule('ui.chat.js', 'uiChat', 'UIChat', 'game', { renderTo: '.middle-bar' });
  },

  //----------------------------------------------------------------------------
  addModule: function(jsFile, id, type, hub, config) {
    this.modules.push({ jsFile: jsFile, id: id, type: type, config: config, hub: hub });
  },

  //----------------------------------------------------------------------------
  loadModules: function(successCallback) {
    var scriptCount = this.modules.length;
    for (var moduleIndex = 0; moduleIndex < this.modules.length; ++moduleIndex) {
      this.loadModule(this.modules[moduleIndex], function() {
        --scriptCount;
        if (scriptCount <= 0) {
          successCallback();
        }
      });
    }
  },

  //----------------------------------------------------------------------------
  loadModule: function(module, successCallback) {
    // Create the script HTML element
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = module.jsFile;

    // Attach handlers for all browsers
    var done = false;
    script.onload = script.onreadystatechange = function(){
      if (!done && (!this.readyState || this.readyState == 'loaded' || this.readyState == 'complete')) {
        done = true;

        if (module.id !== '') {
          // Start module
          Kernel.register(module.id, module.type, module.hub, module.config);
          Kernel.start(module.id, null, function() {
            // Handle memory leak in IE
            script.onload = script.onreadystatechange = null;
            successCallback();
          });
        }
        else {
          successCallback();
        }
      }
    };

    head.appendChild(script);

    return undefined;
  },

  //----------------------------------------------------------------------------
  // Broadcast that all modules have been loaded
  broadcastModulesLoaded: function() {
    this.hub.forwardModulesLoaded();
  },

  //----------------------------------------------------------------------------
  // Broadcast the game data to all the newly loaded modules
  broadcastStart: function(data) {
    this.hub.broadcast(this.hub.messages.CHANGE_GAME_STATE, data);
  }
});

/*******************************************************************************
 * Register the modules necessary to start the client side operations
 ******************************************************************************/
//------------------------------------------------------------------------------
// Specify what modules to use, their id, and how they should be configured
Kernel.register([
  { id:'moduleLoader', type:'ModuleLoader' },
  { id:'module-dataflow', type:'DataFlow' }
]);

//------------------------------------------------------------------------------
// Start all modules
$('document').ready(function() {
  Kernel.start([
    { id:'moduleLoader' },
    { id:'module-dataflow' }
    ]);
});
