const electron = require('electron');
const log      = require('electron-log');
const spawn    = require('child_process').spawn;
const rxIpc    = require('rx-ipc-electron/lib/main').default;

const _options      = require('../options');
const rpc           = require('../rpc/rpc');
const cookie        = require('../rpc/cookie');
const daemonManager = require('../daemon/daemonManager');
const multiwallet   = require('../multiwallet');

let daemon = undefined;
let exitCode = 0;
let chosenWallets = [];

function daemonData(data, logger) {
  data = data.toString().trim();
  logger(data);
}

exports.restart = function (cb) {
  log.info('restarting daemon...')

  const restarting = true;
  return exports.stop(restarting).then(function waitForShutdown() {
    log.debug('waiting for daemon shutdown...')

    exports.check().then(waitForShutdown).catch((err) => {
      if (err.status == 502) { /* daemon's net module shutdown  */
        log.debug('daemon stopped network, waiting 10s before restarting...');
        setTimeout(() => {     /* wait for full daemon shutdown */

          exports.start(chosenWallets, cb)
            .catch(error => log.error(error));

        }, 10 * 1000);
      } else {
        waitForShutdown();
      }
    });
  });
}

exports.start = function (wallets, callback) {
  return (new Promise((resolve, reject) => {

    chosenWallets    = wallets;

    exports.check().then(() => {
      log.info('daemon already started');
      resolve(undefined);

    }).catch(() => {

      let options      = _options.get();
      const daemonPath = options.customdaemon
                       ? options.customdaemon
                       : daemonManager.getPath();

      wallets = wallets.map(wallet => `-wallet=${wallet}`);
      log.info(`starting daemon ${daemonPath} ${process.argv} ${wallets}`);

      const child = spawn(daemonPath, [...process.argv, "-rpccorsdomain=http://localhost:4200", ...wallets])
      .on('close', code => {
        log.info('daemon exited - setting to undefined.');
        daemon = undefined;
        if (code !== 0) {
          reject();
          log.error(`daemon exited with code ${code}.\n${daemonPath}\n${process.argv}`);
        } else {
          log.info('daemon exited successfully');
        }
        // if (!restarting)
         // electron.app.quit();
      });

      // TODO change for logging
      child.stdout.on('data', data => daemonData(data, console.log));
      child.stderr.on('data', data => daemonData(data, console.log));

      daemon = child;
      callback = callback ? callback : () => { log.info('no callback specified') };
      exports.wait(wallets, callback).then(resolve).catch(reject);
    });

  }));
}

exports.wait = function(wallets, callback) {
  return new Promise((resolve, reject) => {

    const maxRetries  = 100; // Some slow computers...
    let   retries     = 0;
    let   errorString = '';

    const daemonStartup = () => {
      exports.check()
        .then(() => { callback(); resolve(); })
        .catch(() => {
          if (exitCode === 0 && retries < maxRetries)
            setTimeout(daemonStartup, 1000);
        });

      if (exitCode !== 0 || ++retries >= maxRetries) {
        // Rebuild block and transaction indexes
        if (errorString.includes('-reindex')) {
          log.info('Corrupted block database detected, '
                 + 'restarting the daemon with the -reindex flag.');
          process.argv.push('-reindex');
          exitCode = 0; // Hack a bit here...
          // We don't want it to exit at this stage if start was called..
          // it will probably error again if it has to.
          exports.start(wallets, callback);
          return;
        }
        log.error('Could not connect to daemon.')
        reject();
      }
    } /* daemonStartup */

    if (daemon && exitCode === 0) {
      daemon.stderr.on('data', data => errorString = data.toString('utf8'));
      setTimeout(daemonStartup, 1000);
    }

  });
}

exports.check = function() {
  return new Promise((resolve, reject) => {

    const _timeout = rpc.getTimeoutDelay();
    rpc.call('getnetworkinfo', null, (error, response) => {
      if (error) {
        reject(error);
      } else if (response) {
        resolve(response);
      }
    });
    rpc.setTimeoutDelay(_timeout);

  });
}

exports.stop = function(restarting) {
  log.info('daemon stop called..');
  return new Promise((resolve, reject) => {

    if (daemon) {

      // attach event to stop electron when daemon closes.
      // do not close electron when restarting (e.g encrypting wallet)
      if (!restarting) {
        daemon.on('close', code => {
          log.info('daemon exited successfully - we can now quit electron safely! :)');
          electron.app.quit();
        });
      }

      log.info('Call RPC stop!');
      rpc.call('stop', null, (error, response) => {
        if (error) {
          log.info('daemon errored to rpc stop - killing it brutally :(');
          daemon.kill('SIGINT');
          reject();
        } else {
          log.info('Daemon stopping gracefully...');
          resolve();
        }
      });
    } else
    {
        log.info('Daemon not managed by gui.');
        resolve();
    }

  });
}
