// backbone implementation
var Message = Backbone.Model.extend({
  url : "http://127.0.0.1:3000/chatterbox",
  defaults : {username: '',
             text: ''}
});

var Messages = Backbone.Collection.extend({
  model : Message,
  url : "http://127.0.0.1:3000/chatterbox",
  filter : {
    order:"-updatedAt"
  },
  displayedMessages : {},
  friends: {},

  loadMessages: function (){
    this.fetch({data: this.filter});
  },

  parse: function(response, options) {
    results = [];
    for (var i = response.results.length-1; i >= 0; i--) {
      results.push(response.results[i]);
    }
    return results;
  }

});

var FormView = Backbone.View.extend({

  events: {
    "click #sendMessageButton": "handleSubmit",
    "click #roomChoiceButton": "handleRoomChange"
  },

  initialize: function(){
    this.collection.on('sync', this.stopSpinner, this);
  },

  handleSubmit: function() {
    var $text = this.$('#sendMessageBoxText');
    var $user = this.$('#sendMessageBoxUser');
    var room = $('#roomChoiceText').val();

    this.startSpinner();

    this.collection.create({
      username: $user.val(),
      text: $text.val(),
      roomname: room
    });

    $text.val('');
  },

  handleRoomChange: function() {
    var room = $('#roomChoiceText').val();
    this.collection.displayedMessages = {};

    this.startSpinner();

    if (room) {
      this.collection.filter.where = JSON.stringify({roomname: room});
    } else if (this.collection.filter.where) {
      delete this.collection.filter.where;
    }

    $('#messageBox').children().remove();

    this.collection.loadMessages();
  },

  startSpinner: function() {
    this.$('.spinner').show();
    this.$('#sendMessageButton').attr('disabled', 'true');
    this.$('#roomChoiceButton').attr('disabled', 'true');
  },

  stopSpinner: function() {
    this.$('.spinner').fadeOut('fast');
    this.$('#sendMessageButton').attr('disabled', null);
    this.$('#roomChoiceButton').attr('disabled', null);
  }

});

var MessageView = Backbone.View.extend({

  template: _.template('<div class="chat" data-id="<%= objectId %>"> \
                      <div class="user <%- friend %>" data-user="<%- username %>"><%- username %></div> \
                      <div class="text"><%- text %></div> \
                      </div>'),

  render: function() {
    this.$el.html(this.template(this.model.attributes));
    return this.$el;
  }
});

var MessagesView = Backbone.View.extend({

  events: {
    "click .user": "addFriend",
  },

  initialize: function() {
    this.collection.on('sync', this.render, this);
  },

  addFriend: function(event){
    var name = event.currentTarget.textContent;
    if(!this.collection.friends[name]){
      console.log("Adding " + name + " to friends list")
      this.collection.friends[name] = true;
      this.friendUser(name);
    }
    else {
      console.log("Removing " + name + " from friends list")
      delete this.collection.friends[name];
      this.unfriendUser(name);
    }
  },

  friendUser: function(name){
    $("[data-user='" + name + "']").addClass('friend');
  },

  unfriendUser: function(name){
    $("[data-user='" + name + "']").removeClass('friend');
  },

  render: function() {
    this.collection.forEach(this.renderMessage, this);
  },

  renderMessage: function(message) {
    if (!this.collection.displayedMessages[message.get('objectId')]) {
      var messageView = new MessageView({model: message});
      var name = message.get('username');

      // If the message's user is found in our friends list, add friend attribute
      if (this.collection.friends[name])
          message.set('friend', 'friend');
      else
          message.set('friend', '');

      var newElement = messageView.render();
      this.$el.prepend(newElement);
      this.collection.displayedMessages[message.get('objectId')] = true;
    }
  }
});



// jquery implementation
var url  = "https://api.parse.com/1/classes/chatterbox";
var roomName = '';
var friends = [];

var getMessages = function(){
  // if no filter provided, use this generic object
  filter = {
    order:"-updatedAt",
    limit:25,
  };

  // if there's a roomname, change the header and use for filter
  if (roomName) {
    $('h3').text( 'Where you at : ' + roomName );
    filter.where  = JSON.stringify({roomname:roomName});
  }

  $.ajax({
    url: url,
    data: filter,
    type: 'GET',
    success: function(data){
      console.log(data);
                displayMessages(data);
             }
  });
};

var updateMessages = function() {
  var latestMessageTime = getLatestMessageTime();
  var filter = {
    order:"-updatedAt",
    where: JSON.stringify({
      roomname: roomName,
      createdAt: {$gt:
                    {__type: "Date",
                      iso:latestMessageTime}
                  }
      }),
    limit: 100
  };

  $.ajax({
    url: url,
    data: filter,
    type: 'GET',
    success: function(data){
      console.log(data);
                displayMessages(data);
             }
  });

};

var getLatestMessageTime = function() {
  // jquery select the top message, return time string
  return $($('#messageBox').children('.messageBox')[0]).attr('data-updatedAt');
};

var displayMessages = function(msgObj){
  var messages = msgObj.results;

  for(var i = messages.length - 1; i >= 0; i--){ // change loop
    var messageBox = $("<div></div>").addClass('messageBox');
    messageBox.attr('data-updatedAt', messages[i].updatedAt);

    messageBox.append('<div class="username"></div>');
    $(messageBox.children('.username')).text(messages[i].username).html();

    messageBox.append('<div class="message"></div>');
    $(messageBox.children('.message')).text('Message: ' + messages[i].text).html();

    // Append to DOM
    $('#messageBox').prepend(messageBox); // change to prepend
  }

  $('.username').click(function(){
      addFriend.call(this);
      showFriends.call(this);
  });
  showFriends();
};

var sendMessage = function(){
  //get the shit from dom
  var user = $('#sendMessageBoxUser').val();
  var room = roomName;
  var text = $('#sendMessageBoxText').val();

  var message = {
    username: user,
    roomname: room,
    text: text
  };

  $.ajax({
    url: url,
    type: 'POST',
    data: JSON.stringify(message),
    contentType: 'application/json',
    success: function (data) {
      console.log('chatterbox: Message sent');
      updateMessages();
    },
    error: function (data) {
      // see: https://developer.mozilla.org/en-US/docs/Web/API/console.error
      console.error('chatterbox: Failed to send message');
    }
  });
};

var changeRoom = function() {
  roomName = $('#roomChoiceText').val();
  // clear messages
  $('#messageBox').children('.messageBox').remove();
  // display messages for that room
  getMessages();
  showFriends();
};

var addFriend = function(){
  if(!_.contains(friends, $(this).text())) {
    friends.push($(this).text());
  }
  else if(_.contains(friends, $(this).text())) {
    removeFriend($(this).text());
  }
}

var showFriends = function(){
  for(var i = 0; i < friends.length; i++){
    $('.messageBox:contains(' + friends[i] + ')' ).css('font-weight', 'bold');
  }
}

var removeFriend = function(friend){
    var idx = friends.indexOf(friend);
    friends.splice(idx, 1);

  $('.messageBox:contains(' + friend + ')' ).css('font-weight', 'normal');
}

// initialization
// $(document).ready(function(){
//   getMessages();

//   $('#refreshMessagesButton').click(function(){
//     updateMessages();
//   });

//   $('#sendMessageButton').click(function(){
//     sendMessage();
//   });

//   $('#roomChoiceButton').click(function(){
//     changeRoom();
//   });
// });



