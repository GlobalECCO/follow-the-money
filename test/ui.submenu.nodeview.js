

function SubMenuNodeView (root, nodeInfo, startingState) {
  var STATE_ATTRIBUTES = 0;
  var STATE_AGENTS = 1;
  var STATE_TRANSFERS = 2;

  var self = this;
  var viewState = startingState || STATE_ATTRIBUTES;
  // 0 = attributes
  // 1 = agents
  // 2 = transfers

  var div = '<div class="nodeViewContainer">\
                <div class="nodeViewHeading">Node View</div>\
                <div class="nodeViewSubSelection">\
                  <div class="nodeViewSubSelectionButton nodeViewButton-attributes"></div>\
                  <div class="nodeViewSubSelectionButton nodeViewButton-agents"></div>\
                  <div class="nodeViewSubSelectionButton nodeViewButton-transfers"></div>\
                </div>\
                <div class="nodeViewInteractiveSection"></div>\
              </div>';

  // add to the DOM
  this.element = $(div);
  root.append(this.element);


  // methods

  var clearInteractiveSection = function () {
    self.element.find('.nodeViewInteractiveSection').empty();
  };

  var clearSelectedStates = function () {
    self.element.find('.nodeViewButton-attributes').removeClass('nodeViewButton-attributes-selected');
    self.element.find('.nodeViewButton-agents').removeClass('nodeViewButton-agents-selected');
    self.element.find('.nodeViewButton-transfers').removeClass('nodeViewButton-transfers-selected');
  };

  var populateAttributes = function () {
  };

  var populateAgents = function () {
  };

  var populateTransfers = function () {
  };

  var populateInteractiveSection = function () {

  };

  this.setState = function (state)
  {
    if (state >= 0 && state <= 2) {
      clearSelectedStates();
      viewState = state || STATE_ATTRIBUTES;
      switch (state) {
        case STATE_ATTRIBUTES:
          self.element.find('.nodeViewButton-attributes').addClass('nodeViewButton-attributes-selected');
          self.element.find('.nodeViewHeading').text("Attributes");
        break;
        case STATE_AGENTS:
          self.element.find('.nodeViewButton-agents').addClass('nodeViewButton-agents-selected');
          self.element.find('.nodeViewHeading').text("Agents");
        break;
        case STATE_TRANSFERS:
          self.element.find('.nodeViewButton-transfers').addClass('nodeViewButton-transfers-selected');
          self.element.find('.nodeViewHeading').text("Transfers");
        break;
      }
    }
  }


  // events


  self.element.mouseenter(
    function () {

    }
  );

  self.element.mouseleave(
    function () {
    }
  );

  $('.nodeViewButton-attributes').click(
    function () {
      self.setState(STATE_ATTRIBUTES);
    }
  );

  $('.nodeViewButton-agents').click(
    function () {
      self.setState(STATE_AGENTS);
    }
  );

  $('.nodeViewButton-transfers').click(
    function () {
      self.setState(STATE_TRANSFERS);
    }
  );


  //constructor

  this.setState(viewState);
  //self.element.draggable();

}