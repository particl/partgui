const { ipcMain } = require('electron');
const log = require('electron-log');
const http = require('http');
const Observable = require('rxjs/Observable').Observable;
const rxIpc = require('rx-ipc-electron/lib/main').default;
const cookie = require('./cookie');
const daemon = require('./daemon');

let TIMEOUT = 15000;
let HOSTNAME;
let PORT;
let rpcOptions;

/*
** execute RPC call
*/
function rpcCall (method, params, auth, callback) {

  const postData = JSON.stringify({
    method: method,
    params: params
  });

  if (!rpcOptions) {
    rpcOptions = {
      hostname: HOSTNAME,
      port: PORT,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  }

  if (auth && rpcOptions.auth !== auth) {
    rpcOptions.auth = auth
  }

  rpcOptions.headers['Content-Length'] = postData.length;

  const request = http.request(rpcOptions, response => {
    let data = '';
    response.setEncoding('utf8');
    response.on('data', chunk => data += chunk);
    response.on('end', () => {
      if (response.statusCode === 401) {
        callback({
          status: 401,
          message: 'Unauthorized'
        });
        return ;
      }
      try {
        data = JSON.parse(data);
      } catch(e) {
        log.error('ERROR: should not happen', e, data);
        callback(e);
      }

      if (data.error !== null) {
        callback(data);
        return;
      }
      callback(null, data);
    });
  });

  request.on('error', error => {
    switch (error.code) {
      case 'ECONNRESET':
        callback({
          status: 0,
          message: 'Timeout'
        });
        break;
      case 'ECONNREFUSED':
        callback({
          status: 502,
          message: 'Connection Refused',
          _error: error
        });
        break;
      default:
        callback(error);
    }
  });

  request.setTimeout(TIMEOUT, error => {
    return request.abort();
  });
  request.write(postData);
  request.end();
}

/*******************************/
/****** Public functions *******/
/*******************************/

/*
** prepares `rpc-channel` to receive RPC calls from the renderer
*/
function init(options) {
  HOSTNAME = options.rpcbind || 'localhost';
  PORT = options.port;

  // This is a factory function that returns an Observable
  function createObservable(event, method, params) {
    let auth = cookie.getAuth(options);
    return Observable.create(observer => {
      if ('restart-daemon' === method) {
        daemon.startDaemon(true, () => observer.next(true));
      } else {
        rpcCall(method, params, auth, (error, response) => {
          if (error) {
            observer.error(error);
            return;
          }
          observer.next(response);
        });
      }
    });
  }
  rxIpc.registerListener('rpc-channel', createObservable);
}

function checkDaemon(options) {
  return new Promise((resolve, reject) => {
    const _timeout = TIMEOUT;
    TIMEOUT = 150;
    rpcCall('getnetworkinfo', null, cookie.getAuth(options),
      (error, response) => {
        rxIpc.removeListeners();
        if (error) {
          // console.log('ERROR:', error);
          reject();
        } else if (response) {
          resolve();
        }
      });
    TIMEOUT = _timeout;
  });
}

exports.init = init;
exports.checkDaemon = checkDaemon;
exports.rpcCall = rpcCall;