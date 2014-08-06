/*******************************************************************************
 * Kernel.js kernel extension to support core functionality
 ******************************************************************************/

// Extend Kernel to support ajax - we're using jQuery as the base library
Kernel.extend(Kernel, {

  //----------------------------------------------------------------------------
  doAjax: function(config) {
    $.ajax({
        url: config.url,
        type: config.type,
        data: config.params,
        dataType: config.dataType,
        success: config.success,
        error: function(jqXHR, textStatus, errorThrown) {
            if (config.failure) {
                config.failure('Ajax call failed.');
            }
        }
    });
  },

  //----------------------------------------------------------------------------
  loadTemplates: function(instance, startCompleteCB) {

    var numLoadedTemplates = 0;

    instance.templates.forEach(function(current) {
      // Get the html from the server
      var jqxhr = $.get('templates/'+ current.file, function(data) {
        instance[current.property] = data;
      });

      // As soon as the last 'get' completes, initialize the module
      jqxhr.always(function() {
        if (++numLoadedTemplates === instance.templates.length) {
          instance.init();
          startCompleteCB && startCompleteCB();
        }
      });
    });
  },

  //----------------------------------------------------------------------------
  // Control how and when init gets called for each module
  onStart: function(instance, startCompleteCB) {
    instance.isInitialized = false;
    if (instance.templates && instance.templates.length > 0) {
      this.loadTemplates(instance, startCompleteCB);
    }
    else {
      instance.init();
      startCompleteCB && startCompleteCB();
    }
  },

  //----------------------------------------------------------------------------
  onStop: function(instance) {
    // Allow module to handle its own shutdown first
    instance.kill();

    // Take care of any rendered elements
    var el = instance.$moduleEl;

    if (el) {
        el.fadeOut(500, function()
        {
            el.remove();
        });
    }
  }
});