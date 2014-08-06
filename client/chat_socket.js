/*******************************************************************************
 * Opens and maintains a connection to the chat server
 ******************************************************************************/

var chatSocket = new ChatSocket();

function ChatSocket() {

  this.onGameJoined = null;
  this.onOtherUserJoined = null;
  this.onOtherUserLeft = null;
  this.onOtherUserTyping = null;
  this.onReceivedChat = null;
  this.onConnected = null;

  var self = this;
  var socket = null;
  var firstConnect = true;

  //----------------------------------------------------------------------------
  this.connect = function(gid, user) {
    if (!socket) {

      //find the path prefix that comes before "/play", if any
      var prefix = '';
      if (window.location.pathname.match(/\//g).length > 1){
        prefix = /\/(.+\/)play/.exec(window.location.pathname)[1];
      };

      socket = io.connect(null, {
        'remember transport': false,
        'resource': prefix + 'socket.io'
      });

      socket.emit('join-game', { gid: gid, user: user });

      socket.on('game-joined', function(chatHistory) {
        socket.emit('request-chat-history', { gid: gid });
      });

      socket.on('game-left', function(user) {
        self.onOtherUserLeft && self.onOtherUserLeft(user);
      });

      // Once we've joined the game and received chat history,
      // consider the connection complete and execute the callback
      socket.on('chat-history', function(chatHistory) {
        self.onConnected && self.onConnected(chatHistory, firstConnect);
      });

      socket.on('other-user-joined-game', function(data) {
        self.onOtherUserJoined && self.onOtherUserJoined(data);
      });

      socket.on('other-user-typing', function(user) {
        self.onOtherUserTyping && self.onOtherUserTyping(user);
      });

      socket.on('client-chat', function(data) {
        self.onReceivedChat && self.onReceivedChat(data.user, data.text);
      });

    } else {
      firstConnect = false;

      // We're already connected so just grab the latest history
      socket.emit('request-chat-history', { gid: gid });
    }
  }

  //----------------------------------------------------------------------------
  this.submitChat = function(gid, user, text) {
    // Send the chat to server for redistribution
    socket.emit('chat', { gid: gid, user: user, text: text });
  }

  //----------------------------------------------------------------------------
  this.userTyping = function(gid, user) {
    // Let the other player know we're bangin away
    socket.emit('user-typing', { gid: gid, user: user });
  }

  //----------------------------------------------------------------------------
  this.reset = function() {
    this.onGameJoined = null;
    this.onOtherUserJoined = null;
    this.onOtherUserTyping = null;
    this.onReceivedChat = null;
    this.onConnected = null;
  }
}