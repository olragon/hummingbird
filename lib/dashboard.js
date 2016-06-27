var socketio     = require('socket.io');
var staticServer = require('node-static');
var Metric       = require('./metric');
var path         = require('path');
var fileServer = new(staticServer.Server)(path.resolve(__dirname, "../public"));

var defaultHandler = function(request, response) {
  console.log(" - " + request.url);
  fileServer.serve(request, response);
};

function Dashboard() {
  this.url = '';
}

Dashboard.prototype.attachSocketIo = function (server, config) {
  config = config || {
    path: '/'
  };
  var io = socketio.listen(server, config);
  console.log('socketio config', config)
  io.set("log level", 1);
  
  if(config.origins) {
    io.set("origins", config.origins);
    console.log("Restricting dashboard websockets to " + config.origins + ".");
  }

  setInterval(function() {
    var userCount = Object.keys(io.sockets.sockets).length;
    console.log(userCount + " users connected.");
  }, 60 * 1000);

  Metric.loadMetrics(function(metric) {
    metric.on('data', function(metricName, data) {
      io.sockets.volatile.emit(metricName, data);
    });

    metric.start();
  });
}

Dashboard.prototype.handleRequest = function (req, res) {
  req.url = req.url.replace(this.url, '/');
  fileServer.serve(req, res);
}

Dashboard.prototype.attach = function (server, dashboardUrl) {
  var self = this;
  self.url = dashboardUrl;
  var listeners = server.listeners('request').slice(0);
  server.removeAllListeners('request');

  // add request handler
  server.on('request', function(req, res){
    if (check(req)) {
      console.log('intercepting request for path "%s"', dashboardUrl);
      self.handleRequest(req, res);
    } else {
      for (var i = 0, l = listeners.length; i < l; i++) {
        listeners[i].call(server, req, res);
      }
    }
  });

  self.attachSocketIo(server, {
    path: dashboardUrl + 'socket.io'
  });

  function check (req) {
    return dashboardUrl == req.url.substr(0, dashboardUrl.length);
  }
}

Dashboard.prototype.listen = function () {
  var server = require('http').createServer(defaultHandler);
  var io = socketio.listen(server);
  io.set("log level", 1);

  if(config.origins) {
    io.set("origins", config.origins);
    console.log("Restricting dashboard websockets to " + config.origins + ".");
  }

  setInterval(function() {
    var userCount = Object.keys(io.sockets.sockets).length;
    console.log(userCount + " users connected.");
  }, 60 * 1000);

  Metric.loadMetrics(function(metric) {
    metric.on('data', function(metricName, data) {
      io.sockets.volatile.emit(metricName, data);
    });

    metric.start();
  });
}

module.exports = new Dashboard();
