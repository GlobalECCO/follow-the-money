/*******************************************************************************
 * Displays and controls chat functionality
 ******************************************************************************/

Kernel.module.define('UIChat', {

  templates: [{ file: 'ui.chat.full.html', property: 'templateChat' },
              { file: 'ui.chat.bar.html', property: 'templateChatBar' },
              { file: 'ui.chat.panel.html', property:'templateChatPanel'}],
  ui: null,
  entries: [],
  chatBarID: -1,  // used for fading out the chat bar after a brief delay
  $chatBar: null, // the jquery element to show the latest chat
  chatPanel: null, // UI showing the chat button

  // ---------------------------------------------------------------------------
  init: function() {
    this.render();
    this.hide();

    // Update socket callbacks to point to this object's function
    chatSocket.onOtherUserJoined = this.onOtherUserJoined;
    chatSocket.onOtherUserLeft = this.onOtherUserLeft;
    chatSocket.onOtherUserTyping = this.onOtherUserTyping;

    // called when the server broadcasts a chat back clients
    chatSocket.onReceivedChat = this.onReceivedChat;

    // Find out when we're ready to go!
    chatSocket.onConnected = this.onConnected;

    // Establish a connection in case it wasn't already done
    chatSocket.connect(this.hub.getGID(), this.hub.getUser());
  },

  // ---------------------------------------------------------------------------
  kill: function() {
    chatSocket.reset();
    if (this.ui) {
      this.ui.remove();
      this.ui = null;
    }
    if (this.chatBarID !== -1) {
      clearTimeout(this.chatBarID);
    }
    if (this.$chatBar) {
      this.$chatBar.remove();
      this.$chatBar = null;
    }
    if (this.chatPanel) {
      this.chatPanel.remove();
      this.chatPanel = null;
    }
  },

  // ---------------------------------------------------------------------------
  show: function() {
    if (this.ui) {
      this.ui.css('display', '');
      this.ui.find('#chat_text_entry').focus();
      this.scrollBottom();
    }
  },

  // ---------------------------------------------------------------------------
  hide: function(details) {
    if (this.ui) {
      this.ui.css('display', 'none');
    }
  },

  // ---------------------------------------------------------------------------
  isVisible: function() {
    return this.ui && this.ui.css('display') !== 'none';
  },

  // ---------------------------------------------------------------------------
  render: function() {

    this.ui = $(this.templateChat);
    this.ui.find('#chat_text_entry').on('keyup', this.onChatKeyUp);

    var submitButton = this.ui.find('.chat-fullwindow-submit');
    submitButton.click(this.submitChat);
    submitButton.addClass('Button-disabled');
    $(this.renderTo).append(this.ui);

    // Setup the chat bar
    this.$chatBar = $(this.templateChatBar);
    $(this.renderTo).append(this.$chatBar);

    this.ui.draggable().resizable();
    // Resizable tries to make this position: relative, so reset it
    this.ui.css('position', 'absolute');
    
    this.ui.find('.chat-close-button').click(this.onChatToggleVisibility);
  },

  // ---------------------------------------------------------------------------
  renderButton: function() {
    this.chatPanel = $(this.templateChatPanel);
    var bottomBar = $('.bottom-bar');
    bottomBar.append(this.chatPanel);
    $chatButton = bottomBar.find('.chatPanel-option');
    $chatButton.click(this.onChatToggleVisibility);
    new Opentip($chatButton[0], Tooltips.CHAT.CHAT_BUTTON.TEXT, Tooltips.CHAT.CHAT_BUTTON.TITLE);
  },

  // ---------------------------------------------------------------------------
  // Only works while the window is displayed
  scrollBottom: function() {
    var $chatElement = this.ui.find('.chat-fullWindow-textbox');
    $chatElement.scrollTop($chatElement[0].scrollHeight);
  },

  // ---------------------------------------------------------------------------
  // Create a new html div to add the chat showing plain text (no user name)
  addText: function(text) {
    var $chatDiv = $('<div class="chatMessage">' + text + '</div>');
    $chatDiv.css('color', '#f5c400');

    this.ui.find('.chat-fullWindow-textbox').append($chatDiv);
    this.scrollBottom();
  },

  // ---------------------------------------------------------------------------
  // Create a new html div containing the contents of the entry we received
  addEntry: function(user, text) {
    text = text.replace("<", "&lt");
    var chatHtml = '<strong style="color:' + this.getUserColor(user) + '">' + user + ":</strong> " + text;
    var $chatDiv = $('<div class="chatMessage"></div>');
    $chatDiv.css('color', '#ffffff');
    $chatDiv.html(chatHtml);

    this.ui.find('.chat-fullWindow-textbox').append($chatDiv);
    this.scrollBottom();

    if (this.chatBarID !== -1) {
      clearTimeout(this.chatBarID);
    }

    this.$chatBar.html(chatHtml);
    this.$chatBar.stop();
    this.$chatBar.show();

    var self = this;

    this.chatBarID = setTimeout(function() {
      self.$chatBar.fadeOut('slow');
    }, 10000);
  },

  // ---------------------------------------------------------------------------
  submitChat: function() {
    var $input = this.ui.find('#chat_text_entry');
    var inputText = $input[0].value;

    if (inputText.length > 0) {
      $input[0].value = "";

      // Send the chat to server for redistribution
      chatSocket.submitChat(this.hub.getGID(), this.hub.getUser(), inputText);
    }
  },

  // ---------------------------------------------------------------------------
  onConnected: function(chatHistory, firstConnect) {
    // We only render once and keep the elements are around to preserve chats
    this.renderButton();
    this.onReceivedChatHistory(chatHistory);

    // Only allow the chatbar to show on first visit or page refresh
    if (!firstConnect) {
      this.$chatBar.stop();
      this.$chatBar.hide();
    }
  },

  // ---------------------------------------------------------------------------
  onOtherUserJoined: function(data) {
    this.addText(data.user + ' joined the game.');
  },

  // ---------------------------------------------------------------------------
  onOtherUserLeft: function(user) {
    this.addText(user + ' left the game.');
  },

  // ---------------------------------------------------------------------------
  onReceivedChat: function(user, text, shouldAlertUser) {
    shouldAlertUser = (shouldAlertUser !== undefined) ? shouldAlertUser: true;

    var self = this;
    self.addEntry(user, text);

    // Flash the icon if appropriate
    if (!this.isVisible() && shouldAlertUser) {
      var button = self.chatPanel.find('.chatPanel-option');
      var toggle = true;

      // Start animating
      function animate() {
        // These colors should probably come from the css and use those styles to animate
        var color = (toggle) ? '#a61d00': '#d94f33';
        button.animate({'background-color': color }, 'fast', 'swing', onDoneAnimating);
      };

      // Either loop the animation or finish and restore the color
      function onDoneAnimating() {
        if (!self.isVisible())
        {
          toggle = !toggle;
          animate();
        }
      }

      button.stop(true, false);
      animate();

      self.hub.broadcast(self.hub.messages.CHAT_RECEIVED);
    }
  },

  // ---------------------------------------------------------------------------
  onReceivedChatHistory: function(entries) {
    for (var i = 0; i < entries.length; ++i) {
      this.onReceivedChat(entries[i].name, entries[i].text, false);
    }
  },

  // ---------------------------------------------------------------------------
  onOtherUserTyping: function(user) {
    var $infoText = this.ui.find('.chat-info-text');
    $infoText.html(user + ' is typing...');

    // Interrupt any previous fadeOut
    $infoText.stop(true, true);

    $infoText.show();
    $infoText.fadeOut(2000);
  },

  // ---------------------------------------------------------------------------
  onChatKeyUp: function(event) {
    // Enter key triggers submit
    if (event.which === 13) {
      this.submitChat();
    }

    var $submitButton = this.ui.find('.chat-fullwindow-submit');
    var text = this.ui.find('#chat_text_entry')[0].value;

    // Only enable the submit button if there is text
    if (text.length > 0) {
      $submitButton.removeClass('Button-disabled');
    } else {
      $submitButton.addClass('Button-disabled');
    }

    // Let the other player know we're bangin away
    chatSocket.userTyping(this.hub.getGID(), this.hub.getUser());
  },

  // ---------------------------------------------------------------------------
  onChatToggleVisibility: function() {
    this.isVisible() ? this.hide(): this.show();
    this.hub.broadcast(this.hub.messages.CHAT_SHOW_HIDE);

    var bottomBar = $('.bottom-bar');
    $chatButton = bottomBar.find('.chatPanel-option');
    $chatButton.toggleClass('Button-depressed', this.isVisible());

    var button = $(this.renderTo).find('.chatPanel-option');

    // Stop any animation such as flashing and restore the color
    button.stop(true, false);
    button.css('background-color', '#a61d00');
  },

  // ---------------------------------------------------------------------------
  getUserColor: function(user) {
    var myName = this.hub.getUser();
    var myRole = this.hub.getUserRole();

    // If the user is this client, use this client's role color, OW swap
    if (user === myName) {
      return (myRole === PlayerRoles.STATE) ? '#51a6f4': '#a61d00';
    } else {
      return (myRole === PlayerRoles.STATE) ? '#a61d00': '#51a6f4';
    }
  }
});
