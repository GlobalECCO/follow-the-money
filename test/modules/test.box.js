Kernel.module.define('TestBox', {

    file: 'test.box.html',

    init: function() {

        var module = this;

        // Add handler to buttonB
        $('#update-button').click(function() {
            module.hub.updateStatus($('#test-box').val());
        });
    }

});