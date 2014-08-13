/*******************************************************************************
 * Generates a network of nodes and links used for the money network.
 ******************************************************************************/
var log = require('../log').log;
var NodeTypes = require('../../shared/node_types.js').NodeTypes;
var Util = require('./util.js');
var BalanceValues = require('../../shared/balance_values.js').BalanceValues;



//------------------------------------------------------------------------------
// Generate a new money network.
this.generate = function() {
  // Node naming.
  var TERRORIST_NAMES = [ 'Paula', 'Gerald', 'Brian', 'Janet', 'Terry', 'Joan', 'Cheryl', 'Julia', 'Teresa', 'Ralph',
                          'Matt', 'Victor', 'Harry', 'Louise', 'David', 'Norma', 'Steve', 'Andrew', 'Helen',
                          'Amy', 'Lois', 'Ronald', 'Alan', 'Larry', 'Anne', 'Chris', 'Greg', 'Brandon',
                          'Cooper', 'Griffin', 'Butler', 'Sanchez', 'Jackson', 'Bennett', 'Garcia', 'Wood',
                          'Perez', 'Lee', 'Moore', 'Bailey', 'Russell', 'Yamato', 'Anderson', 'Ross', 'Reed',
                          'Watson', 'Diaz', 'Jenkins', 'Murphy', 'Thompson', 'Peterson', 'Schmid', 'Breit',
                          'Alpert', 'Clepper', 'Rink', 'Cook', 'Kahre', 'Blackwood', 'Zuuco', 'Nishida',
                          'Zahm', 'Deas', 'Fleece', 'Hunter', 'Sperling', 'Tipton', 'Kiker', 'Prevattte'];

  var BANK_NAMES = [['1st', '2nd', '3rd', '4th', 'Navy', 'New', 'Allied', 'South', 'North', 'Valley', 'U.S.'],
                    ['Citizens', 'State', 'Financial', 'Colonial', 'United', 'Associated', 'Community'],
                    ['Bank', 'Group', 'Credit Union', 'of the West', 'Corp.', 'Trust', 'Holdings', 'of the North', 'Inc.']];

  var HAWALA_NAMES = [['Al', 'As', 'Ba', 'Bou', 'Ka', 'Ma', 'Na', 'Ta', 'Sai'],
                      ['bas', 'saf', 'rad', 't', 'rag', 'na', 'lo'],
                      ['ry', 'mi', 'ma', 'nam', 'ari', 'ashi', 'non', 'our']];

  // Maximum of 10 attempts to generate network.
  var attempt = 0;
  while (true) {
    attempt++;
    var network = {};
    network.nodes = [];
    network.links = [];

    if (attempt % 100 === 0) {
      log.warn("Attempt " + attempt + ": Potential infinite loop while generating money network.  Please ensure that it is even possible to fit all nodes without overlapping.");
    }

    // Create our node clusters.
    if (!generateClusters(network)) {
      continue;
    }

    // Find and assign the leader of the terrorists.
    findTerroristLeader(network);

    var namePool = {
      terrorists: TERRORIST_NAMES,
      hawala: HAWALA_NAMES,
      banks: BANK_NAMES
    };

    // Name all of the nodes, terrorists will be unique (plucked from pool)
    for (var i = 0; i < network.nodes.length; ++i) {
      network.nodes[i].name = getNameForNode(network.nodes[i].type, namePool);
    }

    return network;
  }

  return null;
};

//------------------------------------------------------------------------------
// Generates all of the clusters within the money network.
// @param network   The generated network object.
// @param clusters  The reference list of cluster ranges.
function generateClusters(network) {
  // Our network is broken up into 'clusters'.  Each link can only be formed
  // between two adjacent clusters and no links can be formed within the same
  // cluster.

  // Create the funder node cluster
  // The very first node is always the Funder.
  generateCluster(network, -1, 50, 50, 1, 1, NodeTypes.FUNDER);

  // Create the financial node clusters
  var fakeLeadProbability = BalanceValues.NETWORK_STAT_FAKE_LEAD_PROBABILITY;
  for (var clusterIndex = 0; clusterIndex < BalanceValues.NETWORK_CLUSTER_COUNT; ++clusterIndex) {
    // Calculate the numbers of the different financial node types
    var maxBankNodes = BalanceValues.NETWORK_MAX_BANK_NODES_PER_CLUSTER;
    var maxHawalaNodes = BalanceValues.NETWORK_MAX_HAWALA_NODES_PER_CLUSTER;
    var numBankNodes = Util.randRangeInt(BalanceValues.NETWORK_MIN_BANK_NODES_PER_CLUSTER, maxBankNodes);
    var numHawalaNodes = Util.randRangeInt(BalanceValues.NETWORK_MIN_HAWALA_NODES_PER_CLUSTER, maxHawalaNodes);
    if (clusterIndex === 0) {
      numHawalaNodes = 2;
    }

    var nodeHeight = 100 / (maxHawalaNodes + maxBankNodes);
    generateCluster(network, clusterIndex, 0, nodeHeight * (maxHawalaNodes - 1), numHawalaNodes, maxHawalaNodes, NodeTypes.HAWALA, fakeLeadProbability);
    generateCluster(network, clusterIndex, nodeHeight * maxHawalaNodes, 100, numBankNodes, maxBankNodes, NodeTypes.BANK, fakeLeadProbability);
    fakeLeadProbability -= fakeLeadProbability * BalanceValues.NETWORK_STAT_FAKE_LEAD_FALLOFF / 100;
  }
  // Create the terrorists at the end of the chain
  generateCluster(network, clusterIndex, 0, 100, BalanceValues.NETWORK_TERRORIST_COUNT, BalanceValues.NETWORK_TERRORIST_COUNT, NodeTypes.TERRORIST);

  sortNodesByHeight(network);

  // Now that all the nodes are created, link them together
  generateLinks(network);

  return true;
}

//------------------------------------------------------------------------------
// Generates all of the nodes of a financial node cluster
function generateCluster(network, clusterIndex, minHeight, maxHeight, numNodes, maxNodes, nodeType, fakeLeadProbability) {
  // Make sure we're not trying to create more nodes than we're allowed to
  numNodes = Math.min(numNodes, maxNodes);

  // Calculate the height spread of our nodes
  var yposList = [];
  if (maxNodes > 1) {
    var height = (maxHeight - minHeight) / (maxNodes - 1);
    for (var nodeIndex = 0; nodeIndex < maxNodes; ++nodeIndex) {
      yposList.push(minHeight + height * nodeIndex);
    }
  }
  else {
    yposList.push(minHeight);
  }

  // Width of each cluster based on the total cluster count
  for (var nodeIndex = 0; nodeIndex < numNodes; ++nodeIndex) {
    var yPos = yposList.splice(Util.randRangeInt(0, yposList.length - 1), 1)[0];
    generateNode(network, nodeType, clusterIndex, yPos, fakeLeadProbability);
  }
}

//------------------------------------------------------------------------------
// Generates a single node and adds it to the network
function generateNode(network, nodeType, clusterIndex, yPos, fakeLeadProbability) {
  var clusterWidth = 100.0 / (BalanceValues.NETWORK_CLUSTER_COUNT + 2);
  var node = {};
  node.id = network.nodes.length;
  node.cluster = clusterIndex;
  node.position = { x: clusterWidth * (clusterIndex + 1) + clusterWidth * 0.5, y: yPos };
  node.type = nodeType;
  node.nextLinks = [];
  node.prevLinks = [];
  node.holdTime = 0;
  node.fakeLeadProbability = fakeLeadProbability;
  network.nodes.push(node);
}

//------------------------------------------------------------------------------
// Sort the nodes based on their y positions in their cluster
function sortNodesByHeight(network) {
  for (var nodeIndex = 0; nodeIndex < network.nodes.length; ++nodeIndex) {
    sortNodeByHeight(network, network.nodes[nodeIndex]);
  }
}

//------------------------------------------------------------------------------
// Sort the nodes based on their y positions in their cluster
function sortNodeByHeight(network, sortingNode) {
  for (var nodeIndex = sortingNode.id; nodeIndex < network.nodes.length; ++nodeIndex) {
    var node = network.nodes[nodeIndex];
    // If we reached the next cluster, then we're done sorting
    if (sortingNode.cluster < node.cluster) {
      break;
    }
    // If this node's y position is higher than the sorting node, then swap them
    else if (sortingNode.position.y > node.position.y) {
      var temp = sortingNode.position.y;
      sortingNode.position.y = node.position.y;
      node.position.y = temp;
    }
  }
}

//------------------------------------------------------------------------------
function generateLinks(network) {
  // Iterate through financial node clusters adding links
  for (var nodeIndex = 0; nodeIndex < network.nodes.length; ++nodeIndex) {
    var node = network.nodes[nodeIndex];
    if (node.type === NodeTypes.FUNDER) {
      // Connect to all of the next cluster's nodes
      connectToNextCluster(network, node, BalanceValues.NETWORK_MAX_BANK_NODES_PER_CLUSTER + BalanceValues.NETWORK_MAX_HAWALA_NODES_PER_CLUSTER);
    }
    else if (node.type === NodeTypes.HAWALA || node.type === NodeTypes.BANK) {
      // Connect to a minimum number of the next cluster's nodes
      connectToNextCluster(network, node, BalanceValues.NETWORK_MIN_LINKS_PER_NODE, node.cluster < BalanceValues.NETWORK_CLUSTER_COUNT - 1);
    }
    else {
      // We've reached the end nodes, so we don't need to generate links anymore
      break;
    }
  }
  eliminateOrphanNodes(network);
  ensureMinimumMaxLinks(network);
  limitPluralTravelTimes(network);
}

//------------------------------------------------------------------------------
function connectToNextCluster(network, startNode, numLinks, matchTypes) {
  // Figure out which nodes we can connect to
  var potentialNodes = [];
  for (var nodeIndex = startNode.id; nodeIndex < network.nodes.length; ++nodeIndex) {
    var node = network.nodes[nodeIndex];
    if (node.cluster === startNode.cluster + 1 && (!matchTypes || node.type === startNode.type) &&
        !areNodesConnected(network, startNode.id, node.id)) {
      potentialNodes.push(node);
    }
    else if (node.cluster > startNode.cluster + 1) {
      // We have passed all the nodes of the desired cluster
      break;
    }
  }

  // Generate the appropriate number of links
  var linkCount = 0;
  while (linkCount < numLinks && potentialNodes.length > 0) {
    var endNode = potentialNodes.splice(Util.randRangeInt(0, potentialNodes.length - 1), 1)[0];
    generateLink(network, startNode, endNode);
    ++linkCount;
  }
}

//------------------------------------------------------------------------------
function connectToPreviousCluster(network, endNode, matchTypes) {
  // Figure out which nodes we can connect to
  var potentialNodes = [];
  for (var nodeIndex = endNode.id; nodeIndex >= 0; --nodeIndex) {
    var node = network.nodes[nodeIndex];
    if (node.cluster === endNode.cluster - 1 && (!matchTypes || node.type === endNode.type) &&
        !areNodesConnected(network, endNode.id, node.id)) {
      potentialNodes.push(node);
    }
    else if (node.cluster < endNode.cluster - 1) {
      // We have passed all the nodes of the desired cluster
      break;
    }
  }

  // Pick a random node to connect to
  var startNode = potentialNodes.splice(Util.randRangeInt(0, potentialNodes.length - 1), 1)[0];
  generateLink(network, startNode, endNode);
}

//------------------------------------------------------------------------------
// Does a link exist connecting these two nodes?
function areNodesConnected(network, node1, node2) {
  for (var linkIndex = 0; linkIndex < network.links.length; ++linkIndex) {
    var link = network.links[linkIndex];
    if ((link.nodes.start === node1 && link.nodes.end === node2) ||
        (link.nodes.start === node2 && link.nodes.end === node1)) {
      return true;
    }
  }
  return false;
}

//------------------------------------------------------------------------------
// Generates a new link between two nodes.
// @param network   The money network object.
// @param startNode The starting node id.
// @param endNode   The ending node id.
function generateLink(network, startNode, endNode) {
  var link = {};
  link.nodes = { start: startNode.id, end: endNode.id };
  link.travelTime = calculateTravelTime(startNode, endNode);
  link.id = network.links.length;
  startNode.nextLinks.push(link.id);
  endNode.prevLinks.push(link.id);
  network.links.push(link);
}

//------------------------------------------------------------------------------
// Calculates the number of turns it takes to travel from one node to the next
function calculateTravelTime(startNode, endNode) {
  if (endNode.type === NodeTypes.TERRORIST ||
      endNode.type === NodeTypes.LEADER ||
      endNode.type === NodeTypes.HAWALA) {
    return 1;
  }
  // TODO: Retrieve the nodes from their id's and then calculate travel time.
  return Util.randRangeInt(BalanceValues.NETWORK_MIN_LINK_TRAVEL_TIME, BalanceValues.NETWORK_MAX_LINK_TRAVEL_TIME);
}

//------------------------------------------------------------------------------
// Make sure that all nodes (other than the funder node) have previous links
// going to them
function eliminateOrphanNodes(network) {
  for (var nodeIndex = 0; nodeIndex < network.nodes.length; ++nodeIndex) {
    var node = network.nodes[nodeIndex];
    if (node.type !== NodeTypes.FUNDER && node.prevLinks.length === 0) {
      connectToPreviousCluster(network, node, node.type !== NodeTypes.TERRORIST);
    }
  }
}

//------------------------------------------------------------------------------
// Ensure there is at least one node with the maximum number of links in each
// cluster
function ensureMinimumMaxLinks(network) {
  var currentCluster = -1;
  var minimumLinks = false;
  for (var nodeIndex = 0; nodeIndex < network.nodes.length; ++nodeIndex) {
    var node = network.nodes[nodeIndex];
    if (node.cluster !== currentCluster) {
      // If we didn't have the required number of minimum links, then pick a
      // random node and add another link from it
      if (!minimumLinks) {
        // If this is the last cluster, the Hawala network needs at least one
        // node with max links as well as the bank network
        if (currentCluster === BalanceValues.NETWORK_CLUSTER_COUNT - 1) {
          addMaxLinks(network, currentCluster, NodeTypes.HAWALA, false);
          addMaxLinks(network, currentCluster, NodeTypes.BANK, false);
        }
        else {
          addMaxLinks(network, currentCluster, NodeTypes.BANK, true);
        }
      }
      minimumLinks = false;
      currentCluster = node.cluster;
    }
    if (node.nextLinks.length >= BalanceValues.NETWORK_MAX_LINKS_PER_NODE) {
      minimumLinks = true;
    }
  }
}

//------------------------------------------------------------------------------
// Pick a random node of the given type in the given cluster and connect it to
// the next cluster with the maximum number of links
function addMaxLinks(network, clusterIndex, nodeType, matchTypes) {
  var potentialNodes = [];
  for (var nodeIndex = 0; nodeIndex < network.nodes.length; ++nodeIndex) {
    var node = network.nodes[nodeIndex];
    if (node.cluster === clusterIndex && node.type === nodeType) {
      potentialNodes.push(node);
    }
  }

  var startNode = potentialNodes.splice(Util.randRangeInt(0, potentialNodes.length - 1), 1)[0];
  connectToNextCluster(network, startNode, BalanceValues.NETWORK_MAX_LINKS_PER_NODE - startNode.nextLinks.length, matchTypes);
}

//------------------------------------------------------------------------------
function limitPluralTravelTimes(network) {
  var pluralTravelLinks = [];

  // Get all links that have travel time of more than 1 ("plural")
  network.links.forEach(function(link) {
    if (link.travelTime > 1) {
      pluralTravelLinks.push(link);
    }
  });

  var maxLongLinks = getMaxLongLinks(network);
  while (pluralTravelLinks.length > maxLongLinks) {
    var randomIndex = Util.randRangeInt(0, pluralTravelLinks.length - 1);
    pluralTravelLinks[randomIndex].travelTime = 1;
    pluralTravelLinks.splice(randomIndex, 1);
  }
}

//------------------------------------------------------------------------------
// The less nodes there are, the less long links there should be
function getMaxLongLinks(network) {
  var minNodes = (BalanceValues.NETWORK_MIN_HAWALA_NODES_PER_CLUSTER + BalanceValues.NETWORK_MIN_BANK_NODES_PER_CLUSTER) * BalanceValues.NETWORK_CLUSTER_COUNT;
  var maxNodes = (BalanceValues.NETWORK_MAX_HAWALA_NODES_PER_CLUSTER + BalanceValues.NETWORK_MAX_BANK_NODES_PER_CLUSTER) * BalanceValues.NETWORK_CLUSTER_COUNT;
  var minLongLinks = BalanceValues.NETWORK_MIN_LINKS_WITH_PLURAL_TRAVEL_TIME;
  var maxLongLinks = BalanceValues.NETWORK_MAX_LINKS_WITH_PLURAL_TRAVEL_TIME;
  var nodeCount = network.nodes.length - BalanceValues.NETWORK_TERRORIST_COUNT - 1;
  return Math.round(minLongLinks + (maxLongLinks - minLongLinks) * ((nodeCount - minNodes) / (maxNodes - minNodes)));
}

//------------------------------------------------------------------------------
// Finds and assigns one of the terrorists as the leader based on the number
// of links they have leading to them.
// @param network   The generated network object.
function findTerroristLeader(network) {
  var max = 0;
  var leaderNode = -1;
  var nodeCount = network.nodes.length;
  for (var nodeIndex = nodeCount - 1; nodeIndex >= 0; --nodeIndex) {
    var node = network.nodes[nodeIndex];
    // As soon as we find a node that is not the terrorist, we can bail out
    // since the rest of them will not be terrorists.
    if (node.type !== NodeTypes.TERRORIST) {
      break;
    }

    // Any time we find a terrorist with more links, remember them.
    if (node.prevLinks.length > max) {
      max = node.prevLinks.length;
      leaderNode = nodeIndex;
    }
  }

  // If we have found the terrorist with the most links, assign them as the leader.
  if (leaderNode > -1) {
    network.nodes[leaderNode].type = NodeTypes.LEADER;
  }
}

//------------------------------------------------------------------------------
function getNameForNode(type, namePool) {
  if (type === NodeTypes.BANK) {
    var first = namePool.banks[0][Util.randRangeInt(0, namePool.banks[0].length-1)];
    var second = namePool.banks[1][Util.randRangeInt(0, namePool.banks[1].length-1)];
    var third = namePool.banks[2][Util.randRangeInt(0, namePool.banks[2].length-1)];
    return first + ' ' + second; // + ' ' + third;
  }
  else if (type === NodeTypes.HAWALA) {
    var first = namePool.hawala[0][Util.randRangeInt(0, namePool.hawala[0].length - 1)];
    var second = namePool.hawala[1][Util.randRangeInt(0, namePool.hawala[1].length - 1)];
    var third = namePool.hawala[2][Util.randRangeInt(0, namePool.hawala[2].length - 1)];
    return 'Hawala ' + first + second + third;
  }
  else {
    var firstIndex  = Util.randRangeInt(0, namePool.terrorists.length-1);
    var first = namePool.terrorists[firstIndex];

    return namePool.terrorists.splice(firstIndex, 1);
  }
}
