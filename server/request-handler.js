/*************************************************************

You should implement your request handler function in this file.

requestHandler is already getting passed to http.createServer()
in basic-server.js, but it won't work as is.

You'll have to figure out a way to export this function from
this file and include it in basic-server.js so that it actually works.

*Hint* Check out the node module documentation at http://nodejs.org/api/modules.html.

**************************************************************/
// List dependencies
var url = require('url');
var _ = require('underscore');

// Global variables FTL
var messages = {
  results: []
};

// Unique ID # of each message.
var id = 0;

exports.requestHandler = function(request, response) {

  console.log("Serving request type " + request.method + " for url " + request.url);

  // Default status code and return string
  var statusCode = 404;
  var retString = '';

  // Parse the URL and get the roomname
  var url_parts = url.parse(request.url, true);
  var query = url_parts.query;

  // Check if the url is valid, proceed if so
  if(request.url.substr(0,8) === '/classes') {

    //------- Begin POST request -------
    if(request.method === 'POST'){
      console.log("POST received.")
      statusCode = 201;

      // Assign a listener to handle POSTs asynchronously
      // We need to assign all the properties of the message
      // in here when we are adding it into our database
      request.addListener('data', function(data){
        var message = JSON.parse(data.toString('utf-8'));
        if(query.where){
         message.roomname = JSON.parse(query.where).roomname;
        }
        message.friend = false;
        message.objectId = id;
        messages.results.push(message);
        id++;
      });
    } //------ End POST request --------

    //------- Begin GET request --------
    else if (request.method === 'GET') {
      console.log("GET received.")
      statusCode = 200;

      // If the where property exists, filter by roomname
      // TODO: Handle the case if 'roomname' is not given in where
      if(query.where){
        var filteredMessages = _.filter(messages.results, function(message){
            var f = JSON.parse(query.where);
            if(message.roomname === f.roomname) {
              return true;
            }
            return false;
        });
        // Set the object to return as a new object with the filtered results
        retString = JSON.stringify({results: filteredMessages});
        console.log('retString: ' + retString);
      }
      else{
        retString = JSON.stringify(messages);
      }
    } //------ End GET request --------
    // Handle the OPTIONS case when backbone sends it
    else if(request.method === 'OPTIONS'){
      statusCode = 201;
    }
  }

  // See the note below about CORS headers.
  var headers = defaultCorsHeaders;

  // Tell the client we are sending them plain text.
  //
  // You will need to change this if you are sending something
  // other than plain text, like JSON or HTML.
  headers['Content-Type'] = "text/plain";

  // .writeHead() writes to the request line and headers of the response,
  // which includes the status and all headers.
  response.writeHead(statusCode, headers);

  // Make sure to always call response.end() - Node may not send
  // anything back to the client until you do. The string you pass to
  // response.end() will be the body of the response - i.e. what shows
  // up in the browser.
  //
  // Calling .end "flushes" the response's internal buffer, forcing
  // node to actually send all the data over to the client.

  response.end(retString);
};

// These headers will allow Cross-Origin Resource Sharing (CORS).
// This code allows this server to talk to websites that
// are on different domains, for instance, your chat client.
//
// Your chat client is running from a url like file://your/chat/client/index.html,
// which is considered a different domain.
//
// Another way to get around this restriction is to serve you chat
// client from this domain by setting up static file serving.
var defaultCorsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
  "access-control-allow-headers": "content-type, accept",
  "access-control-max-age": 10 // Seconds.
};

