//----- Dependencies -----
var url = require('url');
var _ = require('underscore');
var fs = require('fs');


//---- Global variables ----
var messages = {
  results: []
};
var id = 0; // Unique ID of a message

// Read in the previous messages
fs.readFileSync(__dirname+'/messages.txt').toString().split('\n').forEach(function (line) {
  if(line){
    messages.results.unshift(JSON.parse(line));
    id++;
  }
});

/// Function: requestHandler(request, response)
/// request: A request message to handle
/// response: A response message to send data back in
/// This function will accept a request message to the server and handle it appropriately.
/// - GET :     If the message is a GET request, the server will determine if
///             it needs to serve files for the client or simply return messages
/// - POST:     If the message is a POST request, the server will add the message
///             into its internal storage and assign a unique ID #.
/// - OPTIONS:  If the message is an OPTIONS request, the server will just allow
///             the message through and return a good response.
exports.requestHandler = function(request, response) {

  console.log("Serving request type " + request.method + " for url " + request.url);

  //----- Initialize Variables -----
  // Default status code and return string
  var statusCode = 404;
  var retString = '';
  var headers = defaultCorsHeaders;
  headers['Content-Type'] = "text/plain";

  // Parse the URL to get an object
  var url_parts = url.parse(request.url, true);
  var query = url_parts.query;
  var mimeTypes = {
    'js' : 'text/javascript',
    'gif': 'image/gif',
    'css': 'text/css',
    'html': 'text/html'
  };

  // Check the file extension
  var reqUrlArr = request.url.split('.');
  var fileType = reqUrlArr[reqUrlArr.length - 1]
  //----- End Initialize Variables -----

  //----- POST request -----
  if(request.method === 'POST'){
    // Assign a listener to handle POSTs asynchronously
    request.addListener('data', function(data){
      var message = JSON.parse(data.toString('utf-8'));
      if(query.where){
        message.roomname = JSON.parse(query.where).roomname;
      }
      message.friend = '';
      message.objectId = id;
      messages.results.unshift(message);
      id++;
      // Append the new entry to our messages file and save
      fs.appendFile(__dirname+'/messages.txt', JSON.stringify(message)+'\n', function(err) {
          if(err) {
              console.log(err);
          } else {
              console.log("The file was saved!");
          }
      });
    });

    response.writeHead(201, headers);
    response.end(retString);
  } //----- End POST request -----

  //----- GET request -----
  if (request.method === 'GET') {
    //----- Get messages -----
    if(request.url.substr(0,11) === '/chatterbox'){
      // If the 'where' property exists, filter by roomname
      // TODO: Handle the case if 'roomname' is not given in where
      if(query.where){
        var roomname = JSON.parse(query.where).roomname;
        var filteredMessages = getMessagesByRoomname(messages.results, roomname);

        // Set the object to return as a new object with the filtered results
        retString = JSON.stringify({results: filteredMessages});
      }
      else {
        // Otherwise, send all messages back
        retString = JSON.stringify(messages);
      }

      response.writeHead(200, headers);
      response.end(retString);
    }//----- End get messages -----

    //----- Serve files -----
    else {
      var pathToFile = __dirname + '/../client' + request.url;
      fs.readFile(pathToFile, function(error, data){
        if (error) {
          response.writeHead(404);
          response.end('404 - File not found');
        }
        else {
          response.writeHead(202, {'Content-Type' : mimeTypes[fileType]});
          response.end(data);
        }
      });
    } //----- End serve files -----

  } //----- End GET request -----

  //----- OPTIONS request -----
  if(request.method === 'OPTIONS'){
    response.writeHead(201, headers);
    response.end(retString);
  } //----- End OPTIONS request -----
};

/// Function: getMessagesByRoomname(collection, roomname)
/// collection: The collection to filter
/// roomname: The roomname to filter the collection on
/// This helper function will return a collection of messages
/// with a given roomname attribute
var getMessagesByRoomname = function(collection, roomname){
  var filteredMessages = _.filter(collection, function(message){
      if(message.roomname === roomname) {
        return true;
      }
      return false;
  });
  return filteredMessages;
}

var defaultCorsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
  "access-control-allow-headers": "content-type, accept",
  "access-control-max-age": 10 // Seconds.
};

