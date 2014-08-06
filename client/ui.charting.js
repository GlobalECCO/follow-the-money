// -------------------------------------------------------------------------
function getUpcomingDeposits(node, money) {
  var us = node.name;
  var deposits = [0,0,0,0,0,0];

  //find any money that's destined for us.
  _.each(money, function(m) {
    if (m.destination === us) {
      deposits[m.totalTurnsOfRoute-m.turnsTraveledOnRoute] += m.amount;
    }
  });
  return deposits;

}

// -------------------------------------------------------------------------
function forecastBalances (node, money){
  var deposits = getUpcomingDeposits(node, money);

  var maintenanceDetails = getMaintenanceDetails(node);
  var timeTillDeduct = maintenanceDetails.turnsLeft % maintenanceDetails.time;
  if (timeTillDeduct === 0) {
    timeTillDeduct = maintenanceDetails.time;
  }

  var runningBalance = node.balance;
  var balances =[runningBalance];
  var ttd = timeTillDeduct;

  for (var turn=1; turn<6; turn++) {
    ttd--;
    if (ttd <= 0) {
      runningBalance -= maintenanceDetails.cost;
      ttd = maintenanceDetails.time;
    }
    runningBalance += deposits[turn];
    balances.push(runningBalance)
  }

  return balances;
}

// -------------------------------------------------------------------------
function makeProjectedBalanceChart($parent, width, height, node, currentTurn) {
  if ($parent.find('svg').length){
    $parent.find('svg').remove();
  }

  var balances = forecastBalances(node, currentTurn.money);

  var labels= [currentTurn.currentTurnNumber+1,
              currentTurn.currentTurnNumber+2,
              currentTurn.currentTurnNumber+3,
              currentTurn.currentTurnNumber+4,
              currentTurn.currentTurnNumber+5,
              currentTurn.currentTurnNumber+6];

  var opts = {
    smooth: false,
    colors: ['white'],
    symbol: 'circle',
    width: 1,
    axis: '0 0 1 1',
    axisxstep: 5,
    axisystep: 5,
    gutter: 20,
    ydimMin: 0,
    ydimMax: node.type === NodeTypes.LEADER ? BalanceValues.TERRORIST_MONEY_GOAL: undefined,
    xdimMin: currentTurn.currentTurnNumber+1,
    xdimMax: currentTurn.currentTurnNumber+6,
  };

  var paper = Raphael($parent.get(0), width, height);
  var chart = paper.linechart(12, 0, width, height, labels, balances, opts);

  //chart axis lines
  chart.axis.attr({stroke:"#ccc"});

  _.each(chart.axis, function(a) {
    a.text.attr({fill:'#ccc',
                'font-family': 'FollowTheMoneyFont'});
  });

  //color symbols
  //chart.each(function() {
  //  var color;
  //  if (this.value>10) {color = '#51a6f4';}
  //  else if (this.value > 5) {color = '#f5c400';}
  //  else {color = '#a61d00';}
  //
  //  this.symbol.attr({'fill':color});
  //});

  //funding goal dotted line
  if(node.type === NodeTypes.LEADER) {
    var x = chart.axis[1].attr('path')[0][1];
    var y = chart.axis[1].attr('path')[chart.axis[1].attr('path').length-2][2];
    var x2 = chart.axis[0].attr('path')[1][1];

    var path = paper.path("M,"+x+","+y+",H,"+x2);
    path.attr({'stroke':'rgb(0,255,50)',
              'stroke-dasharray':'- '});
  }

  //chart labels
  paper.setSize(width, height+20); //resize to allow for text labels

  var fontAttr = {fill:'#ccc',
                  'font-size':'12px',
                  'font-family': 'FollowTheMoneyFont'};

  paper.text((width/2)+14,height+8, "Turn").attr(fontAttr);
  paper.text(8,height/2, "$k").attr(fontAttr);
 }
