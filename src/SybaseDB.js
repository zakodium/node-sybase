var spawn = require('child_process').spawn;
var JSONStream = require('JSONStream');
var fs = require('fs');
var path = require('path');

const util = require('util');

function Sybase(
  host,
  port,
  dbname,
  username,
  password,
  timeout,
  logTiming,
  pathToJavaBridge,
) {
  this.connected = false;
  this.host = host;
  this.port = port;
  this.dbname = dbname;
  this.username = username;
  this.password = password;
  this.timeout = timeout;
  this.logTiming = logTiming == true;
  this.readyTimeout = 3000;

  this.pathToJavaBridge = pathToJavaBridge;
  if (this.pathToJavaBridge === undefined) {
    this.pathToJavaBridge = path.resolve(
      __dirname,
      '..',
      'JavaSybaseLink',
      'dist',
      'JavaSybaseLink.jar',
    );
  }

  this.queryCount = 0;
  this.currentMessages = {}; // look up msgId to message sent and call back details.
}

Sybase.prototype.connect = function (callback) {
  var that = this;
  if (this.connected) {
    callback(null);
    return;
  }
  this.javaDB = spawn('java', [
    '-jar',
    this.pathToJavaBridge,
    this.host,
    this.port,
    this.dbname,
    this.username,
    this.password,
  ]);

  this.javaDB.stdout.once('data', function (data) {
    if ((data + '').trim() != 'connected') {
      callback(new Error('Error connecting ' + data));
      return;
    }

    that.javaDB.stderr.removeAllListeners('data');
    that.connected = true;

    // set up normal listeners.
    that.javaDB.stdout
      .setEncoding('utf8')
      .pipe(JSONStream.parse())
      .on('data', function (jsonMsg) {
        that.onSQLResponse.call(that, jsonMsg);
      });
    that.javaDB.stderr.on('data', function (err) {
      that.onSQLError.call(that, err);
    });

    callback(null);
  });

  // handle connection issues.
  this.javaDB.stderr.once('data', function (data) {
    that.disconnect();
    callback(new Error(data));
  });
};

Sybase.prototype.disconnect = function () {
  if (this.javaDB) {
    this.javaDB.stdout.removeAllListeners('data');
    this.javaDB.kill();
  }
  this.javaDB = null;
  this.connected = false;
};

Sybase.prototype.isConnected = function () {
  return this.connected;
};

Sybase.prototype.query = function (sql, callback) {
  const that = this;
  if (this.connected === false) {
    callback(new Error("database isn't connected."));
    return;
  }
  var hrstart = process.hrtime();
  this.queryCount++;

  var msg = {};
  msg.msgId = this.queryCount;
  msg.sql = sql;
  msg.sentTime = new Date().getTime();
  var strMsg = JSON.stringify(msg).replace(/[\n]/g, '\\n');
  msg.callback = callback;
  msg.hrstart = hrstart;

  this.currentMessages[msg.msgId] = msg;

  this.javaDB.stdin.write(strMsg + '\n');

  if (this.timeout) {
    setTimeout(() => {
      const request = that.currentMessages[msg.msgId];
      if (request) {
        request.callback(new Error('timeout'));
        delete that.currentMessages[msg.msgId];
      }
    }, this.timeout);
  }
};

Sybase.prototype.onSQLResponse = function (jsonMsg) {
  var err = null;
  var request = this.currentMessages[jsonMsg.msgId];
  if (!request) return;
  delete this.currentMessages[jsonMsg.msgId];

  var result = jsonMsg.result;
  if (result.length === 1) result = result[0]; //if there is only one just return the first RS not a set of RS's

  var currentTime = new Date().getTime();
  var sendTimeMS = currentTime - jsonMsg.javaEndTime;
  hrend = process.hrtime(request.hrstart);
  var javaDuration = jsonMsg.javaEndTime - jsonMsg.javaStartTime;

  if (jsonMsg.error !== undefined) err = new Error(jsonMsg.error);

  if (this.logTiming)
    console.log(
      'Execution time (hr): %ds %dms dbTime: %dms dbSendTime: %d sql=%s',
      hrend[0],
      hrend[1] / 1000000,
      javaDuration,
      sendTimeMS,
      request.sql,
    );
  if (err && err.message.includes('JZ0C0')) {
    // this code means database is disconnected
    // The client will have to reconnect
    this.disconnect();
  }
  request.callback(err, result);
};

Sybase.prototype.onSQLError = function (data) {
  var error = new Error(data);

  var callBackFunctions = [];
  for (var k in this.currentMessages) {
    if (this.currentMessages.hasOwnProperty(k)) {
      callBackFunctions.push(this.currentMessages[k].callback);
    }
  }

  // clear the current messages before calling back with the error.
  this.currentMessages = [];
  callBackFunctions.forEach(function (cb) {
    cb(error);
  });
};

Sybase.prototype.query = util.promisify(Sybase.prototype.query);
Sybase.prototype.connect = util.promisify(Sybase.prototype.connect);

module.exports = Sybase;
