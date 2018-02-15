/* electron */
const rxIpc = require('rx-ipc-electron/lib/main').default;
const log = require('electron-log');
const Notification = require('node-notifier');

/* node */
const path = require('path');

const Observable = require('rxjs/Observable').Observable;

const util = require('../util/util');

/*
  Register and IPC listener and execute notification.
*/
exports.init = function () {
  rxIpc.registerListener('notification', function (title, desc) {

  notified = false;
  // whitelist character for regex (node-notifier executes these as arguments to command line, better sanitize ourselves).
  whitelist = new RegExp(/[^A-Za-z0-9!\.\? ]/);

  if ( title.match(whitelist) || desc.match(whitelist) ) {
    log.error( `notification regex sanity check failed for title=${title} desc=${desc}`);
   } else {
    const iconPath = path.join(util.getRootOrResourcePath(), 'resources/notification.png');
    log.debug(`sending notification ${title} : ${desc} `);
    log.debug(`iconPath ${iconPath}`);
  
    var data = {
      'title': title,
      'message': desc,
      'icon': iconPath,
      'sound': true,
      'wait': false,
    };

    // on osx, discard icon (custom node-notifier)
    if (process.platform === 'darwin') {
      delete data['icon'];
    }

    Notification.notify(data);
    notified = true;
   }

  return Observable.create(observer => {
    observer.complete(notified);
  });
  });
}

// todo: test
exports.destroy = function() {
  rxIpc.removeListeners('notification');
}