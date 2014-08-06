/*******************************************************************************
 * Tooltips to display for both players at the end of the game
 ******************************************************************************/
if (typeof this.Tooltips === 'undefined') {
  this.Tooltips = {};
}

// --- NODES-------------------------------------------------------------------
this.Tooltips['NODES']['TERRORIST_NODE'] = {
  TITLE: 'Terrorist Minion',
  TEXT: "<table width='100%'><tr>" +
          "<td><strong>Balance:</strong></td>" +
          "<td>$BALANCE$</td>" +
        "</tr><tr>" +
          "<td><strong>Total Tracked Funds:</strong></td>" +
          "<td>$TRACKED$</td>" +
        "</tr></table>",
};

this.Tooltips['NODES']['TERRORIST_LEADER_NODE'] = {
  TITLE: 'Terrorist Leader',
  TEXT: "<table width='100%'><tr>" +
          "<td><strong>Balance:</strong></td>" +
          "<td>$BALANCE$</td>" +
        "</tr><tr>" +
          "<td><strong>Total Tracked Funds:</strong></td>" +
          "<td>$TRACKED$</td>" +
        "</tr></table>",
};

this.Tooltips['NODES'].fillTerroristKeys = function (tipText, node) {
  var maintenanceDetails = getMaintenanceDetails(node);
  tipText = tipText.replace("$BALANCE$", dollarify(node.balance));
  tipText = tipText.replace("$TRACKED$", dollarify(node.trackedMoney));
  return tipText;
};
