var NetworkNodeThemes = {

  none : {
    portrait: ''
  },

  bank : {
    portrait: 'networkNodePortrait-bank'
  },

  wireTransfer : {
    portrait: 'networkNodePortrait-wiretransfer'
  },

  courier : {
    portrait: 'networkNodePortrait-courier'
  },

  hawala : {
    portrait: 'networkNodePortrait-hawala'
  }
  
};

function NetworkNode (root, name, theme, click_function) {

  var self = this;
  theme = theme || NetworkNodeThemes.none;
  
  var div = '<div class="networkNode">\
             <div class="networkNodePortrait ' + theme.portrait + '"></div>\
             <div class="networkNodeName">' + name + '</div>\
             <div class="networkNodesNotifications">\
             <div class="networkNodeIconAlerts"></div>\
             <div class="networkNodeIconAgents"></div>\
             <div class="networkNodeIconTransfers"></div>\
             </div>\
             </div>';
  
  this.element = $(div);
  root.append(this.element);
  
  this.highlight = function (active) {
    active = (typeof active === 'boolean') ? active : true;
    
    if (active) {
      //var d = self.element.find('.networkNode');
      self.element.addClass('networkNode-highlighted');
    }
    else {
      self.element.removeClass('networkNode-highlighted');
    }
  };
  
  this.select = function (active) {
    active = (typeof active === 'boolean') ? active : true;
    if (active) {
      self.highlight(!active);
      self.element.addClass('networkNode-selected');
    }
    else {
      self.element.removeClass('networkNode-selected');
    }
  };
  
  // events
  
  this.element.mouseenter(
    function () {
      
    }
  );
  
  this.element.mouseleave(
    function () {
    }
  );
  
  this.element.click(click_function);
  
  
  self.element.draggable(); // TODO: remove this it's only for testing
}