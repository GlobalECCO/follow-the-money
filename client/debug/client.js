var prefix = '';
if (window.location.pathname.match(/\//g).length > 1){
  prefix = /\/(.+\/)play/.exec(window.location.pathname)[1];
};

var socket = io.connect(null, {
  'remember transport': false,
  'resource': prefix + 'socket.io'
});

function formatNumber(num) {
  // formats 12345003 as "12,345,003"
  var ords = [];
  var s = "";
  var i;
  while(num > 0) {
    s = (num % 1000).toString();

    // makes sure all digit groups except the first are
    // 0-prefixed.
    if (num > 999) {
      for (i=s.length; i<3; i++) {
        s = "0" + s;
      }
    }
    ords.unshift(s);
    num = (num / 1000).toFixed(0);
    if (ords.length > 4) break;
  }
  // type casting to string ok
  return ords.join(',');
}

/*
 * receive messages from server.  We can get one of three messages:
 * - memory sample (periodic memoryUsage() results)
 * - partial GC stats
 * - full GC stats
 */


socket.on('temporal-sample', function(data) {
  $('.RSS .data').text(formatNumber(data.rss));
  $('.heapTotal .data').text(formatNumber(data.heapTotal));
  $('.heapUsed .data').text(formatNumber(data.heapUsed));
  Graph.addTimeSample(data);
});

function updateGCDataList(stats) {
  $('.usageTrend .data').text(stats.usage_trend.toFixed(2));
  $('.fullGCCount .data').text(formatNumber(stats.num_full_gc));
  $('.incrGCCount .data').text(formatNumber(stats.num_inc_gc));
  $('.heapCompactions .data').text(stats.heap_compactions);
}
socket.on('post-full-gc-sample', function(data) {
  $('.currentBase .data').text(formatNumber(data.current_base));
  $('.estimatedBase .data').text(formatNumber(data.estimated_base));
  updateGCDataList(data);
  Graph.addGcData('full', data);
});

socket.on('post-incremental-gc-sample', function(data) {
  $('.currentBase .data').text(formatNumber(data.current_base));
  $('.estimatedBase .data').text(formatNumber(data.estimated_base));
  updateGCDataList(data);
  Graph.addGcData('incremental', data);
});

socket.on('heap-allocations', function(data) {
  // fill the first six things in the heap allocations list
  var items = $(".allocations").find("ul").children();
  for (var i=0; i<6; i++) {
    var alloc = data[i];
    if (!alloc) break;
    var item = $(items[i]);
    item.find(".name").text(alloc[1][0]);
    item.find(".data").text(alloc[0]);
  }
});

socket.on('pause', function(data) {
  if (data.paused) {
    $('.pause-button').addClass('paused').text('GO');
    $('#add_load').addClass('disabled');
  } else {
    $('.pause-button').removeClass('paused').text('STOP');
    $('#add_load').removeClass('disabled');
  }
});

socket.on('configure', function(data) {
  if (data.show) {
    // csl of things to show
    data.show.split(',').forEach(function(thing) {
      $("." + thing.trim()).fadeIn();
    });
  }
  if (data.title) {
    $(".title").text(data.title);
  }
});

/*
 * Interface - the operator can:
 * - choose "Force Compaction", which calls gc() on the gcstats obj
 * - choose "Make It Busy", which adds load to the server for a second or two
 */
$('#do_gc').on('click', function() {
  socket.send("do_gc");
});
