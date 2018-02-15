const { app } = require('electron');
const electron = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');

const Observable = require('rxjs/Observable').Observable;

/*
 * returns our real user path
 */
function getCustomUserPath() {
  // small hack, userData points to  ~/.config/brave/
  // instead of ~/.config/Particl\ Desktop
  const dir = path.join(path.dirname(app.getPath('userData')), 'particl-desktop');

  /*
   make the directory (also created by electron/muon)
   but we need it earlier for logging
   */
  if (!fs.existsSync(dir)) {
    fs.mkdir(dir);
  }

  return dir;
}

/*
 * electron-builder packs file into an 'asar'. This can cause issues
 * when we want to access files when ran from a packaged app. 
 * always ends with ../
 */
function getRootOrResourcePath() {
  var dir = __dirname;

  // pop dir 'util'
  dir = path.dirname(dir);
  // pop dir 'modules'
  dir = path.dirname(dir);

  // running from packaged
  // TODO: check if it doesn't add a / or \ at the end
  // else this check will fail
  if(dir.endsWith('app.asar')){
    // pop dir 'app.asar'
    dir = path.dirname(dir);
    dir = path.join(dir, 'app.asar.unpacked');
  } 
  return dir;
}

/*
 * Checks if the --no-sandbox flag was passed and warn user.
 */
function checkIfNoSandbox() {
  return Observable.create(observer => {
    if (process.argv.includes('--no-sandbox')) {
      electron.dialog.showMessageBox({
        type: 'warning',
        buttons: ['Stop', 'Continue'],
        message: `We've detected that you're running with the --no-sandbox flag. \n` + 
             `Are you sure you want to continue in this mode? \n \n` +
             `Note for Debian or Ubuntu:\n` +
             `If you get an error when starting, try this as a privileged user: \n` + 
             `echo 1 > /proc/sys/kernel/unprivileged_userns_clone`
      }, (response) => {
        switch(response){
          case 0:
            observer.error('User wishes to quit the application.')
            break;
          case 1:
            observer.next(true)
            break;
        }
      });
    } else {
      observer.next(true);
    }
  });


}

function strongRegexWhitelist(string) {
  
}

exports.checkIfNoSandbox = checkIfNoSandbox;
exports.getCustomUserPath = getCustomUserPath;
exports.getRootOrResourcePath = getRootOrResourcePath;