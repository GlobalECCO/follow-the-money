Kernel.module.define('TestList', {

    file: 'test.list.html',
    title: 'TEST LIST',
    portlet: true,

    init: function() {

        var self = this;

        // Listen for status-update messages and update list
        self.hub.listen('status-feed-update', function(data) {

            // Clear the list
            self.$moduleEl.find('.test-list').children().remove();

            for (var i=0; i<data.length; i+=1) {
                self.$moduleEl.find('.test-list').append('<li>'+data[i]+'</li>');
            }

        });
    }
});