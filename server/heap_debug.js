/*******************************************************************************
 * heap_debug.js
 * Facilitates real-time (ish) preview of heap allocations on the server.
 *
 * Requires node package memwatch - npm install memwatch
 * Then connect to the server on a separate page using localhost:8080/heap
 ******************************************************************************/

module.exports = {
  startHeapDebug: heapDebug
};

function heapDebug(server) {

  var io = require('socket.io').listen(server);

  var memwatch = require('memwatch');
  var clients = [];
  var hd = new memwatch.HeapDiff();
  var lastHD = Date.now();
  var hdInterval = 1000 * 5;

  io.set('log level', 1);

  io.sockets.on('connection', function (socket) {
    clients.push(socket);

    socket.emit('configure', {
      title: "Memory Usage - Follow the Money",
      show: "events,allocations"
    });

    socket.on('disconnect', function() {
      clients.splice(clients.indexOf(socket), 1);
    });

    // The buttons in the console can cause us to force GC or do a bunch of work
    socket.on('message', function(message) {
      switch (message) {
        case "do_gc":
          memwatch.gc();
          break;
        default:
          console.log("what is " + message + "?");
          break;
      }
    });
  });

  // every interval, send sample data to the server

  var allocations = {};
  var snoitacolla = {};
  function updateHeapDiff(diff) {
    var oldValue;
    var newValue;
    diff.change.details.forEach(function(data) {
      if (allocations[data.what] !== undefined) {
        oldValue = allocations[data.what];
        snoitacolla[oldValue].pop(snoitacolla[oldValue].indexOf(oldValue));
        if (!snoitacolla[oldValue].length) {
          delete snoitacolla[oldValue];
        }
      } else {
        oldValue = 0;
      }
      newValue = oldValue + data["+"] - data["-"];
      allocations[data.what] = newValue;
      if (!snoitacolla[newValue]) {
        snoitacolla[newValue] = [];
      }
      snoitacolla[newValue].push(data.what);
    });
  }

  function topHeapAllocations(howMany) {
    howMany = howMany || 6;
    var result = [];
    // annoyingly, we have to convert the keys to integers first
    var keys = [];
    Object.keys(snoitacolla).forEach(function(key) { keys.push(parseInt(key, 10)); });
    // sort greatest to least
    keys.sort(function(a,b) {return b-a;});

    keys.slice(0, howMany).forEach(function(key) {
      result.push([key, snoitacolla[key]]);
    });
    return result;
  }

  setInterval(function() {
    io.sockets.emit('temporal-sample', process.memoryUsage());
  }, 333);

  // and also emit post-gc stats
  memwatch.on('stats', function(data) {
    if (data.type === 'inc') {
      io.sockets.emit('post-incremental-gc-sample', data);
    } else {
      if ((Date.now() - lastHD) > hdInterval) {
        updateHeapDiff(hd.end());
        hd = new memwatch.HeapDiff();
        lastHD = Date.now();
        io.sockets.emit('heap-allocations', topHeapAllocations());
      }
      io.sockets.emit('post-full-gc-sample', data);
    }
  });
}


