Kernel.module.define('TestCount', {

  file: 'test.count.html',
  title: 'TEST COUNT',
  portlet: true,

  init: function() {

      var self = this;

      // Listen for status-update messages and update count
      self.hub.listen('status-feed-update', function(data) {
          self.$moduleEl.find('.test-count').html(data.length);
      });
  }

});