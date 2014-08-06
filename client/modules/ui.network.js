/*******************************************************************************
 * Controls behavior for the terrorist network
 ******************************************************************************/
Kernel.module.define('UINetwork', {

  templates: [{ file:'network.root.html', property:'templateNetwork' },
              { file:'playercard.redplayer.state.html', property:'templateRedPlayerState' },
              { file:'playercard.redplayer.terrorist.html', property:'templateRedPlayerTerrorist' },
              { file:'playercard.redleader.html', property:'templateRedLeader' },
              { file:'playercard.redterrorist.html', property:'templateRedTerrorist' },
              { file:'playercard.redterrorist.unknown.html', property:'templateUnknownTerrorist' },
              { file:'playercard.blueagent.html', property:'templateBlueAgent' },
              { file:'playercard.paymentsegment.html', property:'templatePaymentSegment' },
              { file:'network_node.html', property:'templateNetNode' },
              { file:'network.link.html', property:'networkLink' },
              { file:'network.link.tween.html', property:'networkLinkTween' },
              { file:'networkicon.money.html', property:'templateMoneyIcon' }],

  hasRenderedNetwork: false,
  networkUpdateQueue: [],
  areClustersQueued: false,
  animationReversed: false,
  clusterQueues: [],
  actionsEnabled: true,
  financeNodeWidth: -1,
  financeNodeHeight: -1,
  terroristNodeWidth: -1,
  terroristNodeHeight: -1,
  ui: null,
  renderToWidth: -1,
  renderToHeight: -1,

  // ---------------------------------------------------------------------------
  init: function() {
    var self = this;

    self.ui = $(self.templateNetwork);
    $(self.renderTo).append(self.ui);
    self.renderToWidth = self.ui.outerWidth();
    self.renderToHeight = self.ui.outerHeight();
    self.initNodeDimensions();

    this.hub.listen(this.hub.messages.CHANGE_NODE_LAYER, this.onChangeNodeLayer);
    this.hub.listen(this.hub.messages.RESET_NODE_LAYER, this.onResetNodeLayer);
    this.hub.listen(this.hub.messages.ENABLE_ACTIONS, function() { self.enableActions(); });
    this.hub.listen(this.hub.messages.DISABLE_ACTIONS, function() { self.disableActions(); });
    this.hub.listen(this.hub.messages.ENABLE_TRANSFERS, function() { self.enableTransfers(); });
    this.hub.listen(this.hub.messages.DISABLE_TRANSFERS, function() { self.disableTransfers(); });

    $(window).on('resize.network', this.onWindowResized);
  },

  // ---------------------------------------------------------------------------
  kill: function() {
    this.clearClusterQueues();
    this.ui.remove();
    $(window).off('resize.network');
  },

  // ---------------------------------------------------------------------------
  enableActions: function() {
    this.actionsEnabled = true;
    this.enableTransfers();
  },

  // ---------------------------------------------------------------------------
  disableActions: function() {
    this.actionsEnabled = false;
    this.disableTransfers();
  },

  // ---------------------------------------------------------------------------
  enableTransfers: function() {
    $createTransferButton = $(this.ui).find('.Button-CreateTransfer');
    if ($createTransferButton.length) {
      $($createTransferButton[0]).removeClass("Button-disabled");
    }
  },

  // ---------------------------------------------------------------------------
  disableTransfers: function() {
    $createTransferButton = $(this.ui).find('.Button-CreateTransfer');
    if ($createTransferButton.length) {
      $($createTransferButton[0]).addClass("Button-disabled");
    }
  },

  // ---------------------------------------------------------------------------
  initNodeDimensions: function() {
    // Store node width and height so that we're not forced to add elements to the dom in order to get it later
    var tempNode = $(this.templateNetNode);
    $(this.ui).append(tempNode);
    this.financeNodeWidth = tempNode.outerWidth();
    this.financeNodeHeight = tempNode.outerHeight();
    tempNode.remove();

    tempNode = $(this.templateRedTerrorist);
    $(this.ui).append(tempNode);
    this.terroristNodeWidth = tempNode.outerWidth();
    this.terroristNodeHeight = tempNode.outerHeight();
    tempNode.remove();
  },

  // ---------------------------------------------------------------------------
  // @param data  { currentNetwork {networkSchema} }
  createNetworkElements: function (data) {
    this.ui.empty();

    var network     = data.currentNetwork;
    var prevNetwork = data.previousNetwork;

    if (prevNetwork) {
      var prevNodeList = prevNetwork.nodes;
      var prevLinkList = prevNetwork.links;
    }

    this.finishClusterQueues();
    // Changes made to css or node hierarchy cause the web browser to redo work
    // To minimize the extra work, we keep the ui out of the DOM while we make changes
    var reAttachUI = this.detachUI();

    this.areClustersQueued = true;
    this.animationReversed = this.renderNodes(network.nodes, prevNodeList, network.links, prevLinkList, !this.hasRenderedNetwork && data.performFade, data.userRole);
    this.renderLinks(network.nodes, prevNodeList, network.links, prevLinkList, !this.hasRenderedNetwork && data.performFade);

    // Execute any functions that were queued to happen on network update
    this.networkUpdateQueue.forEach(function(func) { func(); });
    this.networkUpdateQueue = [];

    if (data.performFade && this.hasRenderedNetwork) {
      this.fadeIn();
    };

    $createTransferButton = $(this.ui).find('.Button-CreateTransfer');
    if ($createTransferButton.length) {
      if (!this.actionsEnabled) {
        $($createTransferButton[0]).addClass("Button-disabled");
      }
    }

    // Re-add the newtork UI to the DOM
    reAttachUI();

    this.hasRenderedNetwork = true;
  },

  //----------------------------------------------------------------------------
  onDarkenNode: function (nodeData, $node) {
    if (nodeData.hasOwnProperty('darken')) {
      this.darkenNode($node, nodeData.darken);
    }
  },

  //----------------------------------------------------------------------------
  onHighlightNode: function (nodeData, $node) {
    if (nodeData.hasOwnProperty('highlight')) {
      this.highlightNode($node, nodeData.highlight);
    }
  },

  //-----------------------------------------------------------------------------
  onSelectNode: function(nodeData, $node) {
    if (nodeData.hasOwnProperty('selected')) {
      if (nodeData.type === NodeTypes.BANK) {
        $node.toggleClass('networkNode-selected', nodeData.selected);
      }
      else {
        $node.toggleClass('playerCard-color-select', nodeData.selected);
      }
    }
  },

  //----------------------------------------------------------------------------
  onAgentMove: function(sourceNodeID, destinationNodeID, animDuration, completeCB) {
    animDuration = (animDuration === undefined) ? 2000: animDuration;

    var sourcePos = getNodePosition(this.ui, sourceNodeID);
    var destPos = getNodePosition(this.ui, destinationNodeID);

    var $animAgent = $(this.templateBlueAgent);
    $animAgent.addClass('playerCardAbsolute');
    $animAgent.css({'left': sourcePos.x,
                    'top': sourcePos.y,
                    'margin-left': -40,
                    'margin-top': -40});

    $animAgent.hide();

    this.ui.append($animAgent);
    var queue = true;
    if (this.areClustersQueued) {
      queue = 'Cluster';
      this.addToClusterQueues($animAgent);
    }

    // Just a small delay to make the agent follow slightly behind any money transfers.
    $animAgent.delay(100, queue === true? undefined: queue);

    $animAgent.show({
      duration: 200,
      queue: queue,
      start: function() {
      },
    });

    $animAgent.animate({
      'left': destPos.x,
      'top': destPos.y,
    }, {
      duration: animDuration,
      queue: queue,
      easing: 'easeOutCubic',
    });

    $animAgent.hide({
      duration: 200,
      queue: queue,
      complete: function() {
        completeCB && completeCB();
      },
    });
  },

  //----------------------------------------------------------------------------
  // @param data  [{start, end}, undefined, ...]
  animateAgentMovements: function(data, completeCB) {
    var agentCount = 0;

    var areAllAgentsRendered = function() {
      if (agentCount <= 0) {
        completeCB();
      }
    };
    // Callback for when a single money bag is animated
    var agentRendered = function() {
      --agentCount;
      areAllAgentsRendered();
    };

    for (var movementIndex = 0; movementIndex < data.length; ++movementIndex) {
      if (typeof data[movementIndex] !== 'undefined') {
        var appearing = false;
        var $node = this.ui.find('#Node-' + data[movementIndex].start.toString());
        if ($node.length) {
          hiding = $node.data('hiding');
        }
        var type = $node.data('type');

        agentCount++;
        this.onAgentMove(data[movementIndex].start, data[movementIndex].end, undefined, agentRendered);
      }
    }

    if (agentCount === 0) {
      completeCB();
    }
  },

  //----------------------------------------------------------------------------
  // Sets up node status and icons.
  setupNetworkNodeIcons: function(data, animate) {
    var reAttachUI = this.detachUI();
    for (var nodeIdx = 0; nodeIdx < data.nodes.length; nodeIdx++) {
      var node = data.nodes[nodeIdx];
      if (node) {
        var $node = this.ui.find("#Node-" + node.id);
        if ($node.length > 0) {
          if (node.type === NodeTypes.TERRORIST || node.type === NodeTypes.LEADER) {
            // Disable this node if it has a negative balance
            if (node.balance !== undefined) {
              if (node.balance < 0) {
                this.disableNode(node, $node);
              } else {
                this.enableNode(node, $node);
              }
            }
          }

          this.onMoneyAtNode(node, $node, animate);
          this.onAgentAtNode(node, $node, animate);
          this.onAlertAtNode(node, $node);
        }
      }
    }
    reAttachUI();
  },

  //----------------------------------------------------------------------------
  // Refresh the tab and highlight states for all nodes and links
  decorateNetwork: function(data) {
    var reAttachUI = this.detachUI();

    for (var nodeIdx = 0; nodeIdx < data.nodes.length; nodeIdx++) {
      var node = data.nodes[nodeIdx];
      if (node) {
        var $node = this.ui.find("#Node-" + node.id);
        if ($node.length > 0) {
          this.onDarkenNode(node, $node);
          this.onHighlightNode(node, $node);
          this.onSelectNode(node, $node);
        }
      }
    }

    for (var linkIdx = 0; linkIdx < data.links.length; linkIdx++) {
      if (data.links[linkIdx]) {
        var $link = this.ui.find('[id=Link-'+ data.links[linkIdx].id + ']');
        if ($link.length > 0) {
          $tweens = this.ui.find('[id=Tween-' + data.links[linkIdx].id + ']');

          if (data.links[linkIdx].hasOwnProperty('selected')) {
            $link.find('.networkLink-line').toggleClass('networkLink-line-selected', data.links[linkIdx].selected);
            $link.find('.networkLink-glow-top, .networkLink-glow-bottom').toggleClass('networkLink-glow-selected', data.links[linkIdx].selected);
            $tweens.each(function() {
              $(this).find('.networkLink-tween-main').toggleClass('networkLink-tween-selected', data.links[linkIdx].selected);
            });
          }

          if (data.links[linkIdx].hasOwnProperty('highlight')) {
            $link.find('.networkLink-line').toggleClass('networkLink-line-highlighted', data.links[linkIdx].highlight);
            $link.find('.networkLink-glow-top, .networkLink-glow-bottom').toggleClass('networkLink-glow-highlighted', data.links[linkIdx].highlight);
            $tweens.each(function() {
              $(this).find('.networkLink-tween-main').toggleClass('networkLink-tween-highlighted', data.links[linkIdx].highlight);
            });
          }

          if (data.links[linkIdx].hasOwnProperty('darken')) {
            $link.find('.networkLink-line').toggleClass('networkLink-line-darkened', data.links[linkIdx].darken);
            $link.find('.networkLink-glow-top, .networkLink-glow-bottom').toggleClass('networkLink-glow-darkened', data.links[linkIdx].darken);
            $tweens.each(function() {
              $(this).find('.networkLink-tween-main').toggleClass('networkLink-tween-darkened', data.links[linkIdx].darken);
            });
          }
        }
      }
    }

    reAttachUI();
  },

  // ---------------------------------------------------------------------------
  onMoneyAtNode: function (node, $node, animate) {
    var $icon = $node.find('.networkNodeIconTransfers');
    var $count = $node.find('.networkNode-transfers');

    var isShowing = $icon.data('showing') === true;

    function onShowIcon() {
      if (node.money.length > 1) {
        $count.show();
        $count.text(node.money.length.toString());
      } else {
        $count.hide();
      }
    };

    function onHideIcon() {
      $count.css('display', 'none');
      $icon.removeClass('networkNodeIconTransfers-active');
    };

    // Animate to show or hide the icon.
    if (isShowing !== (node.money.length > 0)) {
      $icon.finish();
      $icon.finish('Cluster');
      $icon.data('showing', !isShowing);

      var speed = animate? 'slow': 0;

      if (animate) {
        var queue = true;
        if (this.areClustersQueued) {
          queue = 'Cluster';
          this.addToClusterQueues($icon);
        }

        if (isShowing) {
          $icon.hide({
            duration: speed,
            queue: queue,
            complete: onHideIcon,
          });
        } else {
          $icon.show({
            duration: speed,
            queue: queue,
            start: function() {
              $icon.addClass('networkNodeIconTransfers-active');
              $icon.hide();
              $icon.show(speed, onShowIcon);
            },
          })
        }
      } else {
        if (isShowing) {
          $icon.hide();
          onHideIcon();
        } else {
          $icon.addClass('networkNodeIconTransfers-active');
          $icon.show();
          onShowIcon();
        }
      }
    } else if (node.money.length > 1) {
      $count.show();
      $count.text(node.money.length.toString());
    } else {
      $count.hide();
    }

    // Update tooltip information
    var tip = Opentip.getTip($node[0]);
    if (tip) {
      var tipText = tip.content;

      if (node.type === NodeTypes.TERRORIST || node.type === NodeTypes.LEADER) {
        tipText = Tooltips.NODES.fillTerroristKeys($node.data('originalTooltip'), node);
      }
      tip.setContent(tipText);
    }
  },

  // ---------------------------------------------------------------------------
  // Render the agent locations in the network Node
  // @param agents The list of State agent data
  onAgentListUpdate: function (agents) {
    //find the Node that each Agent is located at, and turn on the indicator
    this.ui.find('.networkNode').each(function (index) {
      for (var a = 0; a < agents.length; a++) {
        if ($(this).data('id') == agents[a].location) {
          $(this).find('.networkNodeIconAgents').addClass('networkNodeIconAgents-active');
          continue;
        }
      }
    });
  },

  //----------------------------------------------------------------------------
  disableNode: function (node, $node) {
    // Disable the node itself
    $node.find('.playerCardPortrait').addClass('portrait-terrorist01-disabled', true);

    // Iterate through the previous links and disable each of them
    for (var linkIndex = 0; linkIndex < node.prevLinks.length; ++linkIndex) {
      var $link = this.ui.find("#Link-" + node.prevLinks[linkIndex]);
      $link.find('.networkLink-glow-top, .networkLink-glow-bottom').addClass('networkLink-glow-disabled', true);
      $link.find('.networkLink-line').addClass('networkLink-line-disabled', true);
    }
  },

  //----------------------------------------------------------------------------
  enableNode: function (node, $node) {
    // Enable the node itself
    $node.find('.playerCardPortrait').removeClass('portrait-terrorist01-disabled', true);

    // Iterate through the previous links and disable each of them
    for (var linkIndex = 0; linkIndex < node.prevLinks.length; ++linkIndex) {
      var $link = this.ui.find("#Link-" + node.prevLinks[linkIndex]);
      $link.find('.networkLink-glow-top, .networkLink-glow-bottom').removeClass('networkLink-glow-disabled', true);
      $link.find('.networkLink-line').removeClass('networkLink-line-disabled', true);
    }
  },

  //----------------------------------------------------------------------------
  darkenNode: function ($node, darken) {
    if ($node.hasClass('playerCard')) {
      $node.toggleClass("playerCard-color-darken", darken);
      if (darken) {
        $node.removeClass("playerCard-color-highlight", false);
      }
    }
    else {
      $node.toggleClass("networkNode-darkened", darken);
      if (darken) {
        $node.removeClass("networkNode-highlighted", false);
      }
    }
  },

  //----------------------------------------------------------------------------
  highlightNode: function ($node, highlight) {
    if ($node.hasClass('playerCard')) {
      $node.toggleClass("playerCard-color-highlight", highlight);
    }
    else {
      $node.toggleClass("networkNode-highlighted", highlight);
    }
  },

  // ---------------------------------------------------------------------------
  onChangeNodeLayer: function(data) {
    var matchingNode = this.ui.find('[id=Node-' + data.id + ']');
    // Override z-index from applied classes
    matchingNode && matchingNode.css('z-index', data.layer);
  },

  // ---------------------------------------------------------------------------
  onResetNodeLayer: function(data) {
    var matchingNode = this.ui.find('[id=Node-' + data.id + ']');
    if (matchingNode) {
      // Remove the local style z-index allowing the one from the class to be used
      matchingNode.css('z-index', '');
    }
  },

  // ---------------------------------------------------------------------------
  onAlertAtNode: function (node, $node) {
    $node.find('.networkNodeIconAlerts').toggleClass('networkNodeIconAlerts-active',
                                                      node.shouldDisplayAlert);
  },

  // ---------------------------------------------------------------------------
  // Render the agent locations in the network Node
  // @param agents The list of State agent data
  onAgentAtNode: function (node, $node, animate) {
    var $icon = $node.find('.networkNodeIconAgents');
    var $count = $node.find('.networkNode-agents');

    var isShowing = $icon.data('showing') === true;

    function onShowIcon() {
      if (node.agents.length > 1) {
        $count.show();
        $count.text(node.agents.length.toString());
      } else {
        $count.hide();
      }
    };

    function onHideIcon() {
      $count.css('display', 'none');
      $icon.removeClass('networkNodeIconAgents-active');
    };

    // Animate to show or hide the icon.
    if (isShowing !== (node.agents.length > 0)) {
      $icon.finish();
      $icon.finish('Cluster');
      $icon.data('showing', !isShowing);

      var speed = animate? 'slow': 0;
      var queue = true;
      if (this.areClustersQueued) {
        queue = 'Cluster';
        this.addToClusterQueues($icon);
      }

      if (animate) {
        if (isShowing) {
          $icon.hide({
            duration: speed,
            queue: queue,
            complete: onHideIcon,
          });
        } else {
          $icon.hide({
            duration: 0,
            queue: queue,
          });

          $icon.show({
            duration: speed,
            queue: queue,
            start: function() {
              $icon.addClass('networkNodeIconAgents-active');
              $(this).css('display', 'block');
            },
            complete: onShowIcon,
          });
        }
      } else {
        if (isShowing) {
          $icon.hide();
          onHideIcon();
        } else {
          $icon.addClass('networkNodeIconAgents-active');
          $icon.show();
          onShowIcon();
        }
      }
    } else if (node.agents.length > 1) {
      $count.show();
      $count.text(node.agents.length.toString());
    } else {
      $count.hide();
    }

    // Setup the status specific icons/counts
    var focusingAgents = 0, followingAgents = 0, freezingAgents = 0, incapacitatedAgents = 0, lockdownAgents = 0;
    for (var agentIndex = 0; agentIndex < node.agents.length; ++agentIndex) {
      switch (node.agents[agentIndex].status) {
        case AgentStatus.FOCUSING:
          ++focusingAgents;
          break;
        case AgentStatus.FOLLOWING:
          ++followingAgents;
          break;
        case AgentStatus.FREEZING:
          ++freezingAgents;
          break;
        case AgentStatus.INCAPACITATED:
          ++incapacitatedAgents;
          break;
        case AgentStatus.LOCKDOWN:
          ++lockdownAgents;
          break;
      }
    }

    $node.find('.networkNodeIconFocusing').css('display', (focusingAgents > 0 ? 'block' : 'none'));
    $node.find('.networkNode-focusing').text(focusingAgents.toString());
    $node.find('.networkNodeIconFollowing').css('display', (followingAgents > 0 ? 'block' : 'none'));
    $node.find('.networkNode-following').text(followingAgents.toString());
    $node.find('.networkNodeIconFreezing').css('display', (freezingAgents > 0 ? 'block' : 'none'));
    $node.find('.networkNode-freezing').text(freezingAgents.toString());
    $node.find('.networkNodeIconDisabled').css('display', (incapacitatedAgents > 0 ? 'block' : 'none'));
    $node.find('.networkNode-disabled').text(incapacitatedAgents.toString());
    $node.find('.networkNodeIconLocking').css('display', (lockdownAgents > 0 ? 'block' : 'none'));
    $node.find('.networkNode-locking').text(lockdownAgents.toString());
  },

  // ---------------------------------------------------------------------------
  onBalanceAtNode: function (node, gameData) {
    var paymentMeter = this.ui.find('[id=Node-' + node.id + ']').find('.playerCardPaymentMeter');
    paymentMeter.empty();
    var maintenanceDetails = getMaintenanceDetails(node);
    this.attachPaymentSegments(paymentMeter, maintenanceDetails.time, maintenanceDetails.turnsLeft);

    if (node.type === NodeTypes.LEADER || node.type === NodeTypes.TERRORIST) {
      var element = this.ui.find('#Node-' + node.id);
      var leftLabel = element.find('.playerCard-fundsOverview-LabelLeft');
      var rightLabel = element.find('.playerCard-fundsOverview-LabelRight');

      var $chartEl = element.find('.chart-balance');
      if (leftLabel.length > 0 && rightLabel.length > 0) {
        // Only exists on the terrorist side
        if (node.trackedMoney !== undefined) {
          leftLabel.html('Tracked: ');
          rightLabel.html(dollarify(node.trackedMoney));
          element.find('.playerCard-fundsOverview').addClass('playerCard-fundsOverview-style-full');
          if ($chartEl.length > 0) {
            $chartEl.hide();
          }
        } else {
          leftLabel.html('Funds: ');
          rightLabel.html(dollarify(node.balance));
          var reservesOverview = element.find('.playerCard-fundsOverview');
          if (maintenanceDetails.turnsLeft > 10)
          {
            reservesOverview.removeClass('playerCard-fundsOverview-style-reserves');
            reservesOverview.removeClass('playerCard-fundsOverview-style-critical');
            reservesOverview.addClass('playerCard-fundsOverview-style-full');
          }
          else if (maintenanceDetails.turnsLeft > 5)
          {
            reservesOverview.removeClass('playerCard-fundsOverview-style-full');
            reservesOverview.removeClass('playerCard-fundsOverview-style-critical');
            reservesOverview.addClass('playerCard-fundsOverview-style-reserves');
          }
          else
          {
            reservesOverview.removeClass('playerCard-fundsOverview-style-full');
            reservesOverview.removeClass('playerCard-fundsOverview-style-reserves');
            reservesOverview.addClass('playerCard-fundsOverview-style-critical');
          }

          // Ignore clicks
          $chartEl.click(function(event) { event.stopPropagation(); });
          $chartEl.mouseenter(function(event) {
            // Send a mouse leave event to the chart's parent
            $(this).parent().mouseleave();
            event.stopPropagation();
          });
          $chartEl.mouseleave(function(event) {
            // Send a mouse enter event to the related target
            $(event.relatedTarget).mouseenter();
            event.stopPropagation();
          });

          if ($chartEl.length > 0) {
            var chart = makeProjectedBalanceChart($chartEl, 129, 100, node, gameData);
          }
        }
      }
    }
  },

  // ---------------------------------------------------------------------------
  onWindowResized: function() {
    var self = this;
    var root = $(this);

    self.renderToWidth = self.ui.outerWidth();
    self.renderToHeight = self.ui.outerHeight();

    self.ui.find('.networkLink').each(function() {
      var startPos = $(this).data('start');
      var endPos   = $(this).data('end');

      if (startPos !== undefined && endPos !== undefined) {
        // Calculate the div angle.
        var x1 = self.renderToWidth * (startPos.x / 100);
        var y1 = self.renderToHeight * (startPos.y / 100);

        var x2 = self.renderToWidth * (endPos.x / 100);
        var y2 = self.renderToHeight * (endPos.y / 100);

        var length = Math.sqrt(Math.pow((x1 - x2),2) + Math.pow((y1 - y2),2));

        // When normalized, the hypotenuse becomes 1 so no need to divide
        var theta = (y2 > y1 ? 1 : -1) * ((Math.acos((x2 - x1) / length)) * (180 / Math.PI));

        $(this).css({'left': x1,
                     'top':  y1,
                     'transform': 'rotate(' + theta + 'deg)',
                     'width': length});
      }
    });

    self.ui.find('.networkLink-tween').each(function() {
      var segment1 = $(this).data('startSegment');
      var startPos = segment1.data('end');
      var endPos   = $(this).data('end');

      // Calculate the div angle.
      var x1 = self.renderToWidth * (startPos.x / 100);
      var y1 = self.renderToHeight * (startPos.y / 100);

      var x2 = self.renderToWidth * (endPos.x / 100);
      var y2 = self.renderToHeight * (endPos.y / 100);

      var length = Math.sqrt(Math.pow((x1 - x2),2) + Math.pow((y1 - y2),2));

      // When normalized, the hypotenuse becomes 1 so no need to divide
      var theta = (y2 > y1 ? 1 : -1) * ((Math.acos((x2 - x1) / length)) * (180 / Math.PI));

      $(this).css({'left': x1 + 'px',
                   'top': (y1 - 1) + 'px',
                   'transform': segment1.css('transform')});
    });

    self.ui.find('.networkIconMoney').each(function() {
      var linkLerp = $(this).data('percent');
      var startNode= $(this).data('startNode');
      var endNode  = $(this).data('endNode');

      var pts = {
        start: getNodePosition(root, startNode),
        end: getNodePosition(root, endNode)
      };

      var lerpX = pts.start.x + (pts.end.x - pts.start.x) * linkLerp;
      var lerpY = pts.start.y + (pts.end.y - pts.start.y) * linkLerp;

      // offset values
      var height = parseInt($(this).css('height'), 10);
      var width = parseInt($(this).css('width'), 10);

      $(this).css({'left': lerpX + 'px',
                   'top': lerpY + 'px',
                   'margin-top': (-height / 2).toString() + 'px',
                   'margin-left': (-width / 2).toString() + 'px'});
    });
  },

  // -------------------------------------------------------------------------
  onNodeMouseEnter: function(event) {
    var nodeId = $(event.currentTarget).data('id');
    this.hub.broadcast(this.hub.messages.NODE_MOUSE_ENTER, nodeId);
    event.stopPropagation();

    // Animate icons
    var animate_duration = 300;
    var $agentTasks = $(event.currentTarget).find('.networkNodesAgentTasks');
    $agentTasks.stop();
    $agentTasks.animate({left: "-24px", opacity: "1"}, {duration: animate_duration});
  },

  // -------------------------------------------------------------------------
  onNodeMouseLeave: function(event) {
    var nodeId = $(event.currentTarget).data('id');
    this.hub.broadcast(this.hub.messages.NODE_MOUSE_LEAVE, nodeId);
    event.stopPropagation();

    // Animate icons
    var animate_duration = 300;
    var $agentTasks = $(event.currentTarget).find('.networkNodesAgentTasks');
    $agentTasks.stop();
    $agentTasks.animate({left: "24px", opacity: "0"}, {duration: animate_duration});
 },

  // -------------------------------------------------------------------------
  onNodeClick: function(event) {
    this.finishClusterQueues();
    var nodeId = $(event.currentTarget).data('id');
    this.hub.broadcast(this.hub.messages.NODE_SELECTED, nodeId);
    event.stopPropagation();
    Opentip.hideTips();
  },

  // -------------------------------------------------------------------------
  onMoneyBagMouseEnter: function(event) {
    // pull just the number out of the string
    var idString = $(event.target).attr('id');
    var id = new RegExp('[0-9]+').exec(idString)[0];

    this.hub.broadcast(this.hub.messages.TRANSFER_MOUSE_ENTER, parseInt(id));
    event.stopPropagation();
  },

  // -------------------------------------------------------------------------
  onMoneyBagMouseLeave: function(event) {
    this.hub.broadcast(this.hub.messages.TRANSFER_MOUSE_LEAVE);
    event.stopPropagation();
  },

  // ---------------------------------------------------------------------------
  renderNodes: function(nodeList, prevNodeList, nodeLinkList, prevNodeLinkList, fullFade, userRole) {
    var clusterHiding = false;
    var self = this;

    nodeList.forEach(function(node) {
      if (node !== null) {
        var newNode = self.createCustomizedNode.call(self, node, userRole);
        newNode.css({'position': 'absolute',
                     'left': node.position.x + '%',
                     'top': node.position.y + '%'});
        newNode.data('position', node.position);
        newNode.data('cluster', node.cluster);
        self.ui.append(newNode);

        // If this node was not existing previously, animate it.
        var found = true;
        if (typeof prevNodeList !== 'undefined') {
          found = false;
          for (var nodeIndex = 0; nodeIndex < prevNodeList.length; ++nodeIndex) {
            if (prevNodeList[nodeIndex] && prevNodeList[nodeIndex].id === node.id) {
              found = true;
              break;
            }
          }
        }

        if (!found || fullFade) {
          newNode.hide();
          newNode.stop();
          newNode.data('appearing', true);
          self.addToClusterQueues(newNode, node.cluster);

          var avgX = 0;
          var avgY = 0;
          var count= 0;

          for (var linkIndex = 0; linkIndex < node.prevLinks.length; ++linkIndex) {
            var link = nodeLinkList[node.prevLinks[linkIndex]];
            if (link) {
              count++;
              avgX += nodeList[link.nodes.start].position.x;
              avgY += nodeList[link.nodes.start].position.y;
            }
          }

          if (count > 0) {
            avgX /= count;
            avgY /= count;
          } else {
            avgX = node.position.x;
            avgY = node.position.y;
          }

          newNode.css({'left': avgX + '%',
                       'top':  avgY + '%',
                       'opacity': 0.0,
                       'display': 'inline-block'});
          newNode.animate({
            left: node.position.x + "%",
            top: node.position.y + "%",
            opacity: 1.0
          }, {
            duration: 500,
            queue: 'Cluster',
            complete: function() {
              $(this).data('appearing', false);
            }
          });
        }
      }
    });

    if (typeof prevNodeList !== 'undefined') {
      prevNodeList.forEach(function(node) {
        if (node !== null) {
          var found = false;
          for (var nodeIndex = 0; nodeIndex < nodeList.length; ++nodeIndex) {
            if (nodeList[nodeIndex] && nodeList[nodeIndex].id === node.id) {
              found = true;
              break;
            }
          }

          if (!found) {
            var newNode = self.createCustomizedNode.call(self, node, userRole);
            newNode.css({'position': 'absolute',
                         'left': node.position.x + '%',
                         'top': node.position.y + '%'});
            newNode.data('hiding', true);
            self.ui.append(newNode);

            //newNode.find('.networkNodesNotifications').hide();
            $(newNode).stop();
            self.addToClusterQueues(newNode, node.cluster);
            clusterHiding = true;

            var avgX = 0;
            var avgY = 0;
            var count= 0;

            for (var linkIndex = 0; linkIndex < node.prevLinks.length; ++linkIndex) {
              var link = prevNodeLinkList[node.prevLinks[linkIndex]];
              if (link) {
                count++;
                avgX += prevNodeList[link.nodes.start].position.x;
                avgY += prevNodeList[link.nodes.start].position.y;
              }
            }

            if (count > 0) {
              avgX /= count;
              avgY /= count;
            }

            newNode.data('hiding', false);
            newNode.animate({
              left: avgX + "%",
              top: avgY + "%",
              opacity: 0.0
            }, {
              duration: 500,
              queue: 'Cluster',
              complete: function() {
                newNode.remove();
              },
            });
          }
        }
      });
    }

    return clusterHiding;
  },

  // ---------------------------------------------------------------------------
  renderLinks: function(nodeList, prevNodeList, linkList, prevLinkList, fullFade) {
    var self = this;

    linkList.forEach(function(link) {
      if (link !== null) {
        var found = true;
        if (typeof prevLinkList !== 'undefined') {
          var found = false;
          for (var linkIndex = 0; linkIndex < prevLinkList.length; ++linkIndex) {
            if (prevLinkList[linkIndex] && prevLinkList[linkIndex].id === link.id) {
              found = true;
              break;
            }
          }
        }

        found = found && !fullFade;
        self.renderLink(link, nodeList, found? 0: 1);
      }
    });

    if (typeof prevLinkList !== 'undefined') {
      prevLinkList.forEach(function(link) {
        if (link !== null) {
          var found = false;
          for (var linkIndex = 0; linkIndex < linkList.length; ++linkIndex) {
            if (linkList[linkIndex] && linkList[linkIndex].id === link.id) {
              found = true;
              break;
            }
          }

          if (!found) {
            self.renderLink(link, prevNodeList, 2);
          }
        }
      });
    }
  },

  // ---------------------------------------------------------------------------
  renderLink: function(link, nodeList, fade) {
    var root = this.ui;

    // convert percentages to pixels
    var startNode = this.ui.find('#Node-' + link.nodes.start);
    var endNode   = this.ui.find('#Node-' + link.nodes.end);

    var startPos  = nodeList[link.nodes.start].position;
    var endPos    = nodeList[link.nodes.end].position;

    // Convert from percentage to pixels
    var nodeX1 = this.renderToWidth * (startPos.x / 100);
    var nodeY1 = this.renderToHeight * (startPos.y / 100);
    var nodeX2 = this.renderToWidth * (endPos.x / 100);
    var nodeY2 = this.renderToHeight * (endPos.y / 100);

    // (not currently used)
    var offsetPercent = 0.00;

    // Create a link segment for each unit of travel time
    for (var i = 0; i < link.travelTime; ++i) {
      var linkStartPercent = i / link.travelTime + offsetPercent;
      var linkEndPercent = (i + 1) / link.travelTime - offsetPercent;

      var linkX1 = nodeX1 + (nodeX2 - nodeX1) * linkStartPercent;
      var linkY1 = nodeY1 + (nodeY2 - nodeY1) * linkStartPercent;
      var linkX2 = nodeX1 + (nodeX2 - nodeX1) * linkEndPercent;
      var linkY2 = nodeY1 + (nodeY2 - nodeY1) * linkEndPercent;

      var length = Math.sqrt(Math.pow((linkX1 - linkX2),2) + Math.pow((linkY1 - linkY2),2));

      // When normalized, the hypotenuse becomes 1 so no need to divide
      var theta = (linkY2 > linkY1 ? 1 : -1) * ((Math.acos((linkX2 - linkX1) / length)) * (180 / Math.PI));
      var linkDiv = $(this.networkLink);

      root.append(linkDiv);

      var startPosPercentage = { x: linkX1 * 100 / this.renderToWidth , y: linkY1 * 100 / this.renderToHeight };
      var endPosPercentage = { x: linkX2 * 100 / this.renderToWidth, y: linkY2 * 100 / this.renderToHeight };

      if (link.travelTime > 1) {
        linkDiv.find('.networkLink-line').addClass('networkLink-line-slow');
      }

      linkDiv.attr('id', "Link-" + link.id);
      linkDiv.data('id', link.id);
      linkDiv.data('start', startPosPercentage);
      linkDiv.data('end', endPosPercentage);

      linkDiv.css({'left': linkX1 + 'px',
                   'top': linkY1 + 'px',
                   'width': length.toString() + 'px',
                   'transform-origin': 'left center',
                   'transform': 'rotate(' + theta + 'deg)'});

      this.complexLinkTransition(nodeList, link, linkDiv, fade, i === link.travelTime-1);
    }
  },

  // ---------------------------------------------------------------------------
  complexLinkTransition: function(nodeList, link, linkDiv, fade, renderTweens) {
    var self = this;
    if (fade === 1) {
      var node = nodeList[link.nodes.end];
      this.addToClusterQueues(linkDiv, node.cluster);

      linkDiv.css('opacity', 0.0);
      linkDiv.stop();

      if (renderTweens) {
        self.renderTweenLinks(link.id, fade, node.cluster);
      }

      linkDiv.data('appearing', true);
      linkDiv.delay(150, 'Cluster');
      linkDiv.animate({
        display: 'inline-block',
        opacity: 1.0,
      }, {
        duration: 1000,
        queue: 'Cluster',
        complete: function() {
          $(this).data('appearing', false);
        },
      });
    } else if (fade === 2) {
      var node = nodeList[link.nodes.end];
      self.addToClusterQueues(linkDiv, node.cluster);

      if (renderTweens) {
        self.renderTweenLinks(link.id, fade, node.cluster);
      }

      if (node.type === NodeTypes.TERRORIST ||
          node.type === NodeTypes.LEADER ||
          node.type === NodeTypes.UNSUB) {
        linkDiv.delay(250, 'Cluster');
      }

      linkDiv.animate({
        opacity: 0.0,
      }, {
        duration: 200,
        queue: 'Cluster',
        complete: function() {
          linkDiv.remove();
        },
      });
    } else if (renderTweens) {
      self.renderTweenLinks(link.id, fade);
    }
  },

  // ---------------------------------------------------------------------------
  renderTweenLinks: function(linkID, fade, cluster) {
    var linkList = this.ui.find('[id=Link-' + linkID.toString() + ']');

    // There must be at least 2 to make thing in between
    if (linkList.length > 1) {
      for (var i = 1; i < linkList.length; ++i) {
        var segment1 = $(linkList[i - 1]);
        var segment2 = $(linkList[i]);

        // This new in between link will start at the end of the first
        // real link and end at the start of the next real link
        var startPos = segment1.data('end');
        var endPos = segment2.data('start');

        // Convert from percentage to pixels
        var x1 = this.renderToWidth * (startPos.x / 100);
        var y1 = this.renderToHeight * (startPos.y / 100);
        var x2 = this.renderToWidth * (endPos.x / 100);
        var y2 = this.renderToHeight * (endPos.y / 100);

        var length = Math.sqrt(Math.pow((x1 - x2),2) + Math.pow((y1 - y2),2));

        var tweenLink = $(this.networkLinkTween);
        this.ui.append(tweenLink);

        tweenLink.attr('id', "Tween-" + linkID);
        tweenLink.data('startSegment', segment1);
        tweenLink.data('end', segment2.data('start'));

        tweenLink.css({'left': x1 + 'px',
                       'top': (y1 - 1) + 'px',
                       'transform-origin': 'left center',
                       'transform': segment1.css('transform')});

        var queue = true;
        if (typeof cluster !== 'undefined') {
          queue = 'Cluster';

          this.addToClusterQueues(tweenLink, cluster);
        }

        if (fade === 1) {
          tweenLink.css('opacity', 0.0);
          tweenLink.stop();
          tweenLink.animate({
            opacity: 0.0,
          }, {
            duration: 200,
            queue: queue,
          });
          tweenLink.animate({
            display: 'inline-block',
            opacity: 1.0,
          }, {
            duration: 750,
            queue: queue,
          });
        } else if (fade === 2) {
          tweenLink.stop();
          tweenLink.animate({
            opacity: 0.0,
          }, {
            duration: 250,
            queue: queue,
          });
        } else if (fade === 0) {
          tweenLink.stop();
          tweenLink.show();
        }
      }
    }
  },

  //----------------------------------------------------------------------------
  finishClusterQueues: function() {
    this.areClustersQueued = false;
    for (var index = -2; index < this.clusterQueues.length; ++index) {
      if (typeof this.clusterQueues[index] !== 'undefined') {
        this.finishCluster(index);
      }
    }

    this.ui.finish();

    this.clusterQueues = [];
    this.clusterQueues[-2] = [];
  },


  //----------------------------------------------------------------------------
  clearClusterQueues: function() {
    this.areClustersQueued = false;
    for (var index = -2; index < this.clusterQueues.length; ++index) {
      if (typeof this.clusterQueues[index] !== 'undefined') {
        this.clearCluster(index);
      }
    }

    this.ui.stop();

    this.clusterQueues = [];
    this.clusterQueues[-2] = [];
  },

  //----------------------------------------------------------------------------
  addToClusterQueues: function(elem, cluster) {
    if (typeof cluster === 'undefined') {
      cluster = -2;
    }
    if (typeof this.clusterQueues[cluster] === 'undefined') {
      this.clusterQueues[cluster] = [];
    }
    this.clusterQueues[cluster].push(elem);
  },

  //----------------------------------------------------------------------------
  executeClusterQueues: function() {
    this.areClustersQueued = true;
    var self = this;
    var delay = 0;
    if (this.animationReversed) {
      this.dequeueCluster(-2, delay, function(index) {
        // delete self.clusterQueues[index];
        self.areClustersQueued = false;
      });

      delay = 500;
      for (var index = this.clusterQueues.length - 1; index >= -1; --index) {
        if (typeof this.clusterQueues[index] !== 'undefined') {
          this.dequeueCluster(index, delay, function(index) {
            // delete self.clusterQueues[index];
          });
        }
      }
    } else {
      for (var index = -1; index < this.clusterQueues.length; ++index) {
        if (typeof this.clusterQueues[index] !== 'undefined') {
          this.dequeueCluster(index, delay, function(index) {
            // delete self.clusterQueues[index];
          });
          delay = 300;
        }
      }

      this.dequeueCluster(-2, delay, function(index) {
        // delete self.clusterQueues[index];
        self.areClustersQueued = false;
      });
    }
  },

  // ---------------------------------------------------------------------------
  dequeueCluster: function(clusterIndex, clusterDelay, callback) {
    if (clusterDelay > 0) {
      this.ui.delay(clusterDelay);
    }

    var self = this;
    function executeCluster() {
      if (typeof self.clusterQueues[clusterIndex] !== 'undefined') {
        for (var elemIndex = 0; elemIndex < self.clusterQueues[clusterIndex].length; ++elemIndex) {
          self.clusterQueues[clusterIndex][elemIndex].dequeue('Cluster');
        }
        callback && callback(clusterIndex);
      }
    };

    this.ui.queue('fx', function() {
      executeCluster();
      self.ui.dequeue();
    });
  },

  // ---------------------------------------------------------------------------
  finishCluster: function(clusterIndex) {
    if (typeof this.clusterQueues[clusterIndex] !== 'undefined') {
      for (var elemIndex = 0; elemIndex < this.clusterQueues[clusterIndex].length; ++elemIndex) {
        this.clusterQueues[clusterIndex][elemIndex].finish('Cluster');
        this.clusterQueues[clusterIndex][elemIndex].finish();
      }
    }
  },

  // ---------------------------------------------------------------------------
  clearCluster: function(clusterIndex) {
    if (typeof this.clusterQueues[clusterIndex] !== 'undefined') {
      for (var elemIndex = 0; elemIndex < this.clusterQueues[clusterIndex].length; ++elemIndex) {
        this.clusterQueues[clusterIndex][elemIndex].stop('Cluster');
        this.clusterQueues[clusterIndex][elemIndex].stop();
      }
    }
  },

  // ---------------------------------------------------------------------------
  // moneyData { #id1 { previous{ link, percent }, current{ link, percent, node } }
  //             #id2 { previous{ link, percent }, current{ link, percent } }
  //             etc...                                                     }
  animateMoneyMovements: function(moneyData, completeCB) {
    var moneyCount = 0;
    // Callback to check if all our money bags were done animating
    var areAllMoneyBagsRendered = function() {
      if (moneyCount <= 0) {
        completeCB();
      }
    };
    // Callback for when a single money bag is animated
    var moneyBagRendered = function() {
      --moneyCount;
      areAllMoneyBagsRendered();
    };

    // Render the previous turn's money with no animation
    for (var id in moneyData) {
      if (moneyData.hasOwnProperty(id)) {
        // Keep a running tally of all of our money bags
        ++moneyCount;
        moneyMoved = false;
        if (moneyData[id].hasOwnProperty('previous')) {
          moneyMoved = !this.areMoneyObjectsEqual(moneyData[id].previous, moneyData[id].current);
          this.renderSingleMoneyBag(id, moneyData[id].previous, false);
        }
        var shouldAnimate = moneyMoved;
        var shouldFade = (moneyData[id].current.end);
        this.renderSingleMoneyBag(id, moneyData[id].current, shouldAnimate, shouldFade, moneyBagRendered);
      }
    }

    // Check to see if all the money bags were already rendered (i.e. there aren't any)
    areAllMoneyBagsRendered();
  },

  // ---------------------------------------------------------------------------
  areMoneyObjectsEqual: function(money1, money2) {
    return money1.percent === money2.percent && money1.startNode === money2.startNode &&
           money1.endNode === money2.endNode;
  },

  // ---------------------------------------------------------------------------
  renderSingleMoneyBag: function(id, money, shouldAnimate, shouldFade, completeCB) {
    var linkLerp = money.percent;
    var pts = {
      start: getNodePosition(this.ui, money.startNode),
      end: getNodePosition(this.ui, money.endNode)
    };

    pts.start.x = parseFloat(pts.start.x);
    pts.start.y = parseFloat(pts.start.y);
    pts.end.x = parseFloat(pts.end.x);
    pts.end.y = parseFloat(pts.end.y);

    var lerpX = pts.start.x + (pts.end.x - pts.start.x) * linkLerp;
    var lerpY = pts.start.y + (pts.end.y - pts.start.y) * linkLerp;

    var $money = this.ui.find('#Money-' + id.toString());
    if ($money.length === 0) {
      $money = $(this.templateMoneyIcon);
      $money.attr('id', 'Money-' + id.toString());
      $money.data('startNode', money.startNode);
      $money.data('endNode', money.endNode);
      $money.hover(this.onMoneyBagMouseEnter, this.onMoneyBagMouseLeave);
      this.ui.append($money);

      var width = parseInt($money.css('width'), 10);
      var height = parseInt($money.css('height'), 10);

      // Center around the middle of the icon
      $money.css({'margin-top': (-height / 2).toString() + 'px',
                  'margin-left': (-width / 2).toString() + 'px'});

      $money.hide();
      //$money.show(200);
    } else if (!shouldAnimate) {
      $money.show();
    }

    // offset values
    $money.data('percent', money.percent);

    if (shouldAnimate) {
      var animationCompleteFunc = null;
      if (shouldFade) {
        animationCompleteFunc = function(){
          $(this).hide(200, function () {
            completeCB();
          });
        };
      }
      else {
        animationCompleteFunc = completeCB;
      }

      var queue = true;
      // If we are still animating clusters, queue this animation too.
      if (this.areClustersQueued) {
        queue = 'Cluster';
        this.addToClusterQueues($money);
      }

      $money.show({
        duration: 250,
        queue: queue,
      });

      $money.animate({
        'left': lerpX + 'px',
        'top': lerpY + 'px',
      }, {
        duration: 2000,
        queue: queue,
        easing: 'easeOutCubic',
        start: function() {
          $money.css('display', 'inline-block');
          $money.css('opacity', 1.0);
        },
        complete: animationCompleteFunc,
      });
    } else {
      $money.css({'left': lerpX + 'px',
                  'top': lerpY + 'px'});
      if (completeCB !== undefined) {
        completeCB();
      }
    }
  },

  // ---------------------------------------------------------------------------
  createCustomizedNode: function(nodeData, userRole) {

    var newNode;
    var tipTitle;
    var tipText;

    if (nodeData.type === NodeTypes.FUNDER) {
      if (userRole == 'State') {
        newNode = $(this.templateRedPlayerState);
      } else {
        newNode = $(this.templateRedPlayerTerrorist);
      }
      newNode.css({'margin-left': -this.terroristNodeWidth / 2, 'margin-top': -this.terroristNodeHeight / 2});
      newNode.children('.playerCardName').html(nodeData.name);
      tipTitle = Tooltips.NODES.FUNDER_NODE.TITLE;
      tipText  = Tooltips.NODES.FUNDER_NODE.TEXT;
      newNode.hover(this.onNodeMouseEnter, this.onNodeMouseLeave);
      newNode.click(this.onNodeClick);
    } else if (nodeData.type === NodeTypes.BANK) {
      newNode = $(this.templateNetNode);
      newNode.css({'margin-left': -this.financeNodeWidth / 2, 'margin-top': -this.financeNodeHeight / 2});
      newNode.find('.networkNodePortrait').addClass('networkNodePortrait-bank');
      newNode.find('.networkNodeName').html(nodeData.name);
      tipTitle = Tooltips.NODES.BANK_NODE.TITLE;
      tipText  = Tooltips.NODES.BANK_NODE.TEXT;
      newNode.hover(this.onNodeMouseEnter, this.onNodeMouseLeave);
      newNode.click(this.onNodeClick);
    } else if (nodeData.type === NodeTypes.HAWALA) {
      newNode = $(this.templateNetNode);
      newNode.css({'margin-left': -this.financeNodeWidth / 2, 'margin-top': -this.financeNodeHeight / 2});
      newNode.find('.networkNodePortrait').addClass('networkNodePortrait-hawala');
      newNode.find('.networkNodeName').html(nodeData.name);
      tipTitle = Tooltips.NODES.HAWALA_NODE.TITLE;
      tipText  = Tooltips.NODES.HAWALA_NODE.TEXT;
      newNode.hover(this.onNodeMouseEnter, this.onNodeMouseLeave);
      newNode.click(this.onNodeClick);
    } else if (nodeData.type === NodeTypes.TERRORIST) {
      newNode = $(this.templateRedTerrorist);
      newNode.css({'margin-left': -this.terroristNodeWidth / 2, 'margin-top': -this.terroristNodeHeight / 2});
      newNode.children('.playerCardName').html(nodeData.name);
      tipTitle = Tooltips.NODES.TERRORIST_NODE.TITLE;
      tipText  = Tooltips.NODES.TERRORIST_NODE.TEXT;
      newNode.hover(this.onNodeMouseEnter, this.onNodeMouseLeave);
      newNode.click(this.onNodeClick);
    } else if (nodeData.type === NodeTypes.LEADER) {
      newNode = $(this.templateRedLeader);
      newNode.css({'margin-left': -this.terroristNodeWidth / 2, 'margin-top': -this.terroristNodeHeight / 2});
      newNode.children('.playerCardName').html(nodeData.name);
      tipTitle = Tooltips.NODES.TERRORIST_LEADER_NODE.TITLE;
      tipText  = Tooltips.NODES.TERRORIST_LEADER_NODE.TEXT;
      newNode.hover(this.onNodeMouseEnter, this.onNodeMouseLeave);
      newNode.click(this.onNodeClick);
    }
    else if (nodeData.type === NodeTypes.UNSUB) {
      newNode = $(this.templateUnknownTerrorist);
      newNode.css({'margin-left': -this.terroristNodeWidth / 2, 'margin-top': -this.terroristNodeHeight / 2});
      tipTitle = Tooltips.NODES.UNSUB_NODE.TITLE;
      tipText = Tooltips.NODES.UNSUB_NODE.TEXT;
    }
    else { //default case
      newNode = $(this.templateUnknownTerrorist);
      newNode.css({'margin-left': -this.terroristNodeWidth / 2, 'margin-top': -this.terroristNodeHeight / 2});
      tipTitle = "Unknown Type";
      tipText = "unknown node type";
    }

    newNode.attr('id', "Node-" + nodeData.id);
    newNode.data('id', nodeData.id);
    newNode.data('type', nodeData.type);
    newNode.data('originalTooltip', tipText);

    // Setup the tooltip for the node.
    new Opentip(newNode[0], tipText, tipTitle);

    return newNode;
  },

  // ---------------------------------------------------------------------------
  attachPaymentSegments: function(root, numSegments, turnsleft) {
    if (turnsleft > -1) {
      var newSegment;
      var segmentWidth = parseInt(100 / numSegments, 10).toString() + '%';
      var turnsLeftBeforePayment = turnsleft % numSegments;
      turnsLeftBeforePayment = turnsLeftBeforePayment === 0 && turnsleft >= numSegments ? 5 : turnsLeftBeforePayment;

      var colorCode = turnsleft > 10 ? 'playerCardPaymentMeterFill-credit' : 'playerCardPaymentMeterFill-full';
      colorCode = turnsleft > 5 ? colorCode : 'playerCardPaymentMeterFill-critical';
      // todo divide the meter into the appropriate number of segments
      for (var i = 0; i < numSegments; i++) {
        newSegment = $(this.templatePaymentSegment);
        if (i < turnsLeftBeforePayment ) {
          newSegment.find('.playerCardPaymentMeterFill').toggleClass(colorCode, true);
        };
        newSegment.css('width', segmentWidth);
        root.append(newSegment);
      }
    }
  },

  // ---------------------------------------------------------------------------
  fadeIn: function() {
    this.ui.find('.networkNode,.networkLink,.playerCardPortrait').each(function() {
      if ($(this).data('appearing')) {
        return;
      }
      $(this).css('display', 'none');
      $(this).fadeIn('slow');
    });
  },

  // ---------------------------------------------------------------------------
  detachUI: function() {
    if (!navigator.userAgent.match(/Trident/i)){
      var self = this;
      var $renderParent = self.ui.parent();

      if ($renderParent.length > 0) {
        var $nextSibling = self.ui.next();

        // remove network ui from the DOM while we add all the nodes
        self.ui.detach();

        return function() {
          // Re-attach network ui (triggers a single reflow instead of one for each node + link)
          if ($nextSibling.length !== 0) {
            self.ui.insertBefore($nextSibling);
          } else {
            $renderParent.append(self.ui);
          }
        }
      } else {
        alert('nested network ui detachment detected');
        return function() { };
      }
    } else {
      return function() {};
    }
  }
});
