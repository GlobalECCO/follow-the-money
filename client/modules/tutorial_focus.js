Kernel.module.define('TutorialFocus', {
  templates: [{ file:'tutorial.overlay.html', property:'template' }],
  ui: null,
  background: null,
  foreground: null,
  buttonContainer: null,
  tutorialSteps: null,
  timers: [],

  //----------------------------------------------------------------------------
  init: function() {
    this.render();
    this.hide();
    this.hub.listen(this.hub.messages.START_TUTORIAL, this.show);
  },

  //----------------------------------------------------------------------------
  render: function() {
    this.ui = $(this.template);
    $(this.renderTo).prepend(this.ui);

    this.background = this.ui.find('.tutorialBackground');
    this.foreground = this.ui.find('.tutorialForeground');
    this.buttonContainer = this.ui.find('.tutorialButtonContainer');
    this.foreground.on('click.blockClick', this.onBlockClick);
    this.buttonContainer.find('.restartTutorialButton').click(this.onRestartTutorial);
    this.buttonContainer.find('.endTutorialButton').click(this.onEndTutorial);
  },

  //----------------------------------------------------------------------------
  //[ array of steps
  //  {el: <JQuery selector> //these elements will be highlighted
  //   action: <JQuery selector> //if undefined, a 'click' on el will move to next tutorial step
  //                             //if null, no events on el will be used to proceed to next tutorial step
  //                             //if defined, a 'click' on these elements will proceed to the next tutorial step
  //   tip: {         //a tooltip to be displayed
  //    title: <text> //the text to use as a title for this tip
  //    content: <text> //the text to use as context for this tip
  //    target: <Jquery selector> //which element this tip will point to.
  //                              //if undefined, the el will be used
  //    stemLength: <number> //how far away the tool tip will be to the element
  //    tipJoint: <(top,middle,bottom) (left, center, right)> //which direction to project the tool tip
  //   }
  //   grouped: <boolean> //if a bounding box should be rendered around el or not
  //   callback: <function> //a callback function that gets called at the end of this tutorial step
  //  }
  //
  //  //a single step can have multiple elements/tips defined.
  //  //E.g. First step has two elements defined, second step has one
  // [{el:''},
  //  {el:''}],
  // {el: ''}
  //]
  show: function(steps) {
    this.tutorialSteps = steps;
    if (this.tutorialSteps.length > 0) {
      $('.playbackPanel').hide();
      this.ui.show();
      this.showTutorialStep(this.tutorialSteps[0]);
      $(window).on('resize.tutorial', this.onResize);
    }
  },

  //----------------------------------------------------------------------------
  hide: function() {
    this.ui.hide();
    $('.playbackPanel').show();
    this.prevZindex = null;
    this.tutorialSteps = null;
    $(window).off('resize.tutorial');
  },

  //----------------------------------------------------------------------------
  //show all the elements of the supplied tutorial step
  showTutorialStep: function(currentStep) {
    var self = this;

    //is this step an array of elements and tips?
    if (_.isArray(currentStep)) {
      var absTime = 0;

      _.each(currentStep, function(item){
        absTime += item.hasOwnProperty('delay') ? item.delay : 0;

        self.timers.push(setTimeout(function() {
          self.showTutorialItem(item);
          self.timers.unshift();
        }, absTime));
      });

    }
    else {
      this.timers.push(setTimeout(function() {
        self.showTutorialItem(currentStep);
        self.timers.unshift();
      }, currentStep.hasOwnProperty('delay') ? currentStep.delay : 0));
    }
  },

  //----------------------------------------------------------------------------
  getBoundingBoxOfElements: function($elements) {
    //gather boundaries
    var left = Number.MAX_VALUE;
    var right = Number.MIN_VALUE;
    var bottom = Number.MIN_VALUE;
    var top = Number.MAX_VALUE;

    _.each($elements, function(element){
      var rect = element.getBoundingClientRect();
      left = (rect.left < left) ? rect.left : left;
      right = (rect.right > right) ? rect.right : right;
      bottom = (rect.bottom > bottom) ? rect.bottom : bottom;
      top = (rect.top < top) ? rect.top : top;
    });

    return {left:left, right:right, top:top, bottom:bottom};
  },

  //----------------------------------------------------------------------------
  setCSSOfBoundingBox: function($el, bbox) {
    $el.css('left', bbox.left);
    $el.css('right', bbox.right);
    $el.css('top', bbox.top);
    $el.css('bottom', bbox.bottom);
    $el.css('width', bbox.right-bbox.left);
    $el.css('height', bbox.bottom-bbox.top);
  },

  //----------------------------------------------------------------------------
  doesItemHaveNullAction: function(item) {
    //step has an action property and it's null, meaning there's no action to perform
    return (item.hasOwnProperty('action') &&
            (item.action == null));
  },

  //----------------------------------------------------------------------------
  //Display the graphical element and tooltip for this item in the tutorial step
  showTutorialItem: function(item) {
    var $el = $(item.el);
    var $tooltipTarget = $el;

    if (item.hasOwnProperty('grouped') && item.grouped) {
      //gather boundaries
      var bbox = this.getBoundingBoxOfElements($el);

      //create bounding box around $el
      var $box = $("<div class='boundingBox'></div>")
      this.setCSSOfBoundingBox($box, bbox);

      this.background.append($box);
      $el.data('boundingBox', $box);
      $box.data('source', $el);

      //point the tooltip to this box
      $tooltipTarget = $box;
    }

    if (item.hasOwnProperty('tip')){
      var t = new Opentip($tooltipTarget.get(0), item.tip.content, item.tip.title || '',
                          {
                            target: item.tip.target || $tooltipTarget.get(0),
                            group:null,
                            showOn:'creation',
                            hideOn: 'fakeEventThatDoesntExist',
                            removeElementsOnHide:true,
                            stemLength: item.tip.stemLength || 50,
                            tipJoint: item.tip.tipJoint || 'top left',
                            offset: item.tip.offset || [0, 0],
                            delay: item.tip.delay || 0,
                            style: this.doesItemHaveNullAction(item) ? 'tutorialTips' : 'tutorialActionTips'
                          });
      $(t.container[0]).on('click.blockClick', this.onBlockClick);
    }

    var self = this;
    $el.each(function() {
      self.cloneElement(this, item)
    });
  },

  //----------------------------------------------------------------------------
  cloneElement: function(element, item) {
    // Clone the element
    var $el = $(element);
    if (item.hasOwnProperty('shallowCopy') && item.shallowCopy) {
      var $clone = $(element.cloneNode(true));
    }
    else {
      var $clone = $el.clone(true);
    }
    $clone.data('source', $el);

    // Add the clone to the appropriate layer
    if (item.hasOwnProperty('action')) {
      this.background.append($clone);
      if (item.action !== null) {
        var alternateTarget = $(item.action)[0];
        delete item.action;
        this.cloneElement(alternateTarget, item);
      }
    }
    else {
      $clone.one('click', this.onFinished); //click handler
      this.foreground.append($clone);

      //Highlight the elements which have some action to perform and assign
      //a click handler
      var $box = $("<div class='highlightCircle'></div>")
      var bbox = this.getBoundingBoxOfElements($el);
      this.setCSSOfBoundingBox($box, bbox);
      $box.data('source', $el);
      this.foreground.prepend($box);
    }

    // Now position the element
    $clone.css('transition', 'none');
    $clone.css('position', 'absolute');
    this.positionClone($clone, $el);
  },

  //----------------------------------------------------------------------------
  positionClone: function($clone, $el) {
    $clone.offset($el.offset());
    $clone.css('width', $el.width());
    $clone.css('height', $el.height());
  },

  //----------------------------------------------------------------------------
  cleanUpElement: function($el) {
    if ($el.data('boundingBox')) {
      var $bbox = $el.data('boundingBox');
      $bbox.remove();
      $el.removeData('boundingBox');
    }

    Opentip.hideTips();
  },

  //----------------------------------------------------------------------------
  onBlockClick: function(event) {
    event.stopPropagation();
  },

  //----------------------------------------------------------------------------
  onResize: function() {
    var self = this;
    setTimeout(function() {
      self.background.add(self.foreground).children().each(function() {
        if ($(this).hasClass('boundingBox') || $(this).hasClass('highlightCircle')) {
          self.setCSSOfBoundingBox($(this), self.getBoundingBoxOfElements($(this).data('source')));
        }
        else {
          self.positionClone($(this), $(this).data('source'));
        }
      });
      _.each(Opentip.tips, function(tip) {
        tip.reposition();
      });
    }, 0);
  },

  //----------------------------------------------------------------------------
  onFinished: function(event) {
    var self = this;

    // Cleanup our previous clones
    this.background.empty();
    this.foreground.empty();

    // Move on to the next step of the tutorial
    if (_.isArray(this.tutorialSteps[0])) {
      _.each(this.tutorialSteps[0], function(item) {
        if (item.callback != null) {
          item.callback();
        }
        self.cleanUpElement($(item.el));
      });
    }
    else {
        if (this.tutorialSteps[0].callback != null) {
          this.tutorialSteps[0].callback();
        }
      this.cleanUpElement($(this.tutorialSteps[0].el));
    }

    //pop first off tutorialSteps, then show the next
    this.tutorialSteps.splice(0,1);

    if (this.tutorialSteps.length) {
      this.showTutorialStep(this.tutorialSteps[0]);
    }
    else {
      this.closeTutorial();
    }
  },

  //----------------------------------------------------------------------------
  closeTutorial: function() {
    _.each(this.timers, function(timer) {
      clearTimeout(timer);
    });
    this.timers = [];
    this.background.empty();
    this.foreground.empty();
    Opentip.hideTips();
    this.hide();
  },

  //----------------------------------------------------------------------------
  onRestartTutorial: function() {
    this.closeTutorial();
    this.hub.broadcast(this.hub.messages.TUTORIAL_RESTART);
  },

  //----------------------------------------------------------------------------
  onEndTutorial: function() {
    this.closeTutorial();
    this.hub.forwardTutorialFinished();
  },
});

//----------------------------------------------------------------------------
Opentip.styles.tutorialActionTips = {
  extends: "tutorialTips",
  className: "tutorialActionTips",
  borderColor: "#FFFF00",
  borderWidth: 1,
  background: [[0, "rgba(50, 50, 50, 0.8)"], [1, "rgba(30, 30, 30, 0.9)"]]
};

Opentip.styles.tutorialTips = {
  extends: "dark",
  className: "tutorialTips",
  borderColor: "#000",
  borderWidth: 1,
  background: [[0, "rgba(235, 235, 235, 0.9)"], [1, "rgba(170, 170, 170, 0.95)"]],

};