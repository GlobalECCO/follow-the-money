/*******************************************************************************
 * Responsible for route building logic
 ******************************************************************************/
Kernel.module.define('RouteBuilder', {
  // ---------------------------------------------------------------------------
  currentRouteNodes: [],
  currentRouteLinks: [],

  nextNodes: [],
  nextLinks: [],

  movingMoney: null,

  // ---------------------------------------------------------------------------
  init: function() {
    this.hub.listen(this.hub.messages.TRANSFER_SUBMITTED, this.onSubmitRoute);
  },

  // ---------------------------------------------------------------------------
  onSubmitRoute: function(data) {
    // Send route to the GameController
    var moneyID = -1;
    if (this.movingMoney !== undefined) {
      moneyID = this.movingMoney.id;
    }
    this.hub.forwardRouteAccept({
      moneyID: moneyID,
      moneyTransferred: data.amount,
      route: this.currentRouteLinks
    });
    this.hub.broadcast(this.hub.messages.CLEAR_HIGHLIGHTS);
  },

  // ---------------------------------------------------------------------------
  startRoute: function(network, reserves, startingNode, movingMoney) {
    this.movingMoney = movingMoney;
    this.currentRouteNodes = [];
    this.currentRouteLinks = [];
    this.nextNodes = [startingNode];
    this.nextLinks = [];
    this.addNodeToRoute(network, reserves, startingNode);
  },

  // ---------------------------------------------------------------------------
  addNodeToRoute: function(network, reserves, nodeID) {
    if (this.isValidNextNode(nodeID)) {
      if (this.currentRouteNodes.length > 0) {
        this.findLink(network, this.currentRouteNodes[this.currentRouteNodes.length - 1], nodeID);
      }
      this.currentRouteNodes.push(nodeID);

      this.determineNextNodes(network, nodeID);

      // If this was the end of the line, then display the transfer dialoge
      if (this.nextNodes.length === 0) {
        if (this.movingMoney === undefined) {
          this.hub.broadcast(this.hub.messages.SHOW_TRANSFER_DIALOGUE, {
            nodeID: nodeID,
            balance: reserves,
            time: this.getRouteTime(network)
          });
          this.sendRouteUpdateMessage();
        }
        else {
          this.hub.broadcast(this.hub.messages.TRANSFER_SUBMITTED, { amount: this.movingMoney.amount, newTransfer: false });
          this.hub.broadcast(this.hub.messages.CLEAR_HIGHLIGHTS);
        }
      }
      else {
        this.sendRouteUpdateMessage();
      }
    }
    // If this node was already in the route, then cut back to this node
    else if (this.isPartOfRoute(nodeID)) {
      for (var nodeIndex = this.currentRouteNodes.length - 1; this.currentRouteNodes[nodeIndex] != nodeID; --nodeIndex) {
        this.currentRouteNodes.pop();
        this.currentRouteLinks.pop();
      }
      this.determineNextNodes(network, nodeID);
      this.sendRouteUpdateMessage();
      this.hub.broadcast(this.hub.messages.HIDE_TRANSFER_DIALOGUE);
    }
    else {
      this.hub.broadcast(this.hub.messages.CANCEL_ACTIONS);
    }
  },

  // ---------------------------------------------------------------------------
  findLink: function(network, startNode, endNode) {
    // Find the link that connects these two nodes from our list of potential links
    for (var linkIndex = 0; linkIndex < this.nextLinks.length; ++linkIndex) {
      var link = network.links[this.nextLinks[linkIndex]];
      if (startNode === link.nodes.start && endNode === link.nodes.end) {
        this.currentRouteLinks.push(this.nextLinks[linkIndex]);
        break;
      }
    }
  },

  // ---------------------------------------------------------------------------
  determineNextNodes: function(network, nodeID) {
    // Find the links that start at this node and the nodes at the other ends of
    // those links
    this.nextNodes = [];
    this.nextLinks = network.nodes[nodeID].nextLinks;
    for (var linkIndex = 0; linkIndex < this.nextLinks.length; ++linkIndex) {
      this.nextNodes.push(network.links[this.nextLinks[linkIndex]].nodes.end);
    }
  },

  // ---------------------------------------------------------------------------
  isValidNextNode: function(nodeID) {
    for (var nodeIndex = 0; nodeIndex < this.nextNodes.length; ++nodeIndex) {
      if (this.nextNodes[nodeIndex] === nodeID) {
        return true;
      }
    }
    return false;
  },

  // ---------------------------------------------------------------------------
  isPartOfRoute: function(nodeID) {
    for (var nodeIndex = 0; nodeIndex < this.currentRouteNodes.length; ++nodeIndex) {
      if (this.currentRouteNodes[nodeIndex] === nodeID) {
        return true;
      }
    }
    return false;
  },

  // ---------------------------------------------------------------------------
  sendRouteUpdateMessage: function() {
    this.hub.broadcast(this.hub.messages.UPDATE_ROUTE, {
      routeNodes: this.currentRouteNodes,
      routeLinks: this.currentRouteLinks,
      nextNodes: this.nextNodes,
      nextLinks: this.nextLinks});
  },

  // ---------------------------------------------------------------------------
  getRouteTime: function(network) {
    var time = 0;
    for (var routeIndex = 0; routeIndex < this.currentRouteLinks.length; ++routeIndex) {
      var linkIndex = getIndexFromID(network.links, this.currentRouteLinks[routeIndex]);
      time += network.links[linkIndex].travelTime;
    }
    return time;
  }
});
