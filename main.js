
/* electron */
const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const rxIpc = require('rx-ipc-electron/lib/main').default;


/* node */
const path = require('path');
const platform = require('os').platform();
const url = require('url');
const fs = require('fs');

const Observable = require('rxjs/Observable').Observable;

/* own*/
const util = require('./modules/util/util');
const _options = require('./modules/options');
const daemon = require('./modules/daemon/daemon');
const init = require('./modules/init');
const rpc = require('./modules/rpc/rpc');

/* Brave fix */
app.setPath("userData", util.getCustomUserPath());
// TODO: remove getCustomUserPath calls everywhere else

/* initialize logging */
const log = require('electron-log');
log.transports.file.level = 'debug';
log.transports.file.file = path.join(util.getCustomUserPath(), 'particl-debug.log');


log.debug(`console log level: ${log.transports.console.level}`);
log.debug(`file log level: ${log.transports.file.level}`);

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let tray;
let options;
let openDevTools = false;

if (process.argv.includes('-opendevtools'))
  openDevTools = true;

if (app.getVersion().includes('RC'))
  process.argv.push(...['-testnet', '-printtoconsole']);

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  log.debug('app ready')

  util.checkIfNoSandbox().subscribe(
    ok => {
      options = _options.parse();
      initMainWindow();
      init.start(mainWindow);
    },
    stop => {
      app.quit();
    }
  )

});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    initMainWindow()
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
app.on('browser-window-created', function (e, window) {
  window.setMenu(null);
});

/*
** initiates the Main Window
*/
function initMainWindow() {
  if (platform !== "darwin") {
    let trayImage = makeTray();
  }

  // Create the browser window.
  mainWindow = new BrowserWindow({
    // width: on Win, the width of app is few px smaller than it should be
    // (this triggers smaller breakpoints) - this size should cause
    // the same layout results on all OSes
    // minWidth/minHeight: both need to be specified or none will work
    width:     1270,
    minWidth:  1270,
    height:    675,
    minHeight: 675,
    icon:      path.join(__dirname, 'resources/icon.png'),

    webPreferences: {
      contextIsolation: true
    },
  });

  // and load the index.html of the app.
  if (options.dev) {
    mainWindow.loadURL('http://localhost:4200');
  } else {
    mainWindow.loadURL(url.format({
      protocol: 'chrome:',
      pathname: path.join('brave', __dirname, 'dist/index.html'),
      slashes: true
    }));
  }

  // Open the DevTools.
  if (openDevTools || options.devtools) {
    mainWindow.webContents.openDevTools()
  }

  // handle external URIs
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    electron.shell.openExternal(url);
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  });
}

/*
** creates the tray icon and menu
*/
function makeTray() {

  // Default tray image + icon
  let trayImage = path.join(__dirname, 'resources/icon.png');

  // Determine appropriate icon for platform
  // if (platform === 'darwin') {
  //    trayImage = path.join(__dirname, 'src/assets/icons/logo.icns');
  // }
  // else if (platform === 'win32' || platform === 'win64') {
  //   trayImage = path.join(__dirname, 'src/assets/icons/logo.ico');
  // }

  // The tray context menu
  const contextMenu = electron.Menu.buildFromTemplate([
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          click() { mainWindow.webContents.reloadIgnoringCache(); }
        },
        {
          label: 'Open Dev Tools',
          click() { mainWindow.openDevTools(); }
        }
      ]
    },
    {
      role: 'window',
      submenu: [
        {
          label: 'Close',
          click() { app.quit() }
        },
        {
          label: 'Hide',
          click() { mainWindow.hide(); }
        },
        {
          label: 'Show',
          click() { mainWindow.show(); }
        },
        {
          label: 'Maximize',
          click() { mainWindow.maximize(); }
        } /* TODO: stop full screen somehow,
        {
          label: 'Toggle Full Screen',
          click () {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
           }
        }*/
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'About ' + app.getName(),
          click() { electron.shell.openExternal('https://particl.io/#about'); }
        },
        {
          label: 'Visit Particl.io',
          click() { electron.shell.openExternal('https://particl.io'); }
        },
        {
          label: 'Visit Electron',
          click() { electron.shell.openExternal('https://electron.atom.io'); }
        }
      ]
    }
  ]);

  // Create the tray icon
  tray = new electron.Tray(trayImage)

  // TODO, tray pressed icon for OSX? :)
  // if (platform === "darwin") {
  //   tray.setPressedImage(imageFolder + '/osx/trayHighlight.png');
  // }

  // Set the tray icon
  tray.setToolTip('Particl ' + app.getVersion());
  tray.setContextMenu(contextMenu)

  // Always show window when tray icon clicked
  tray.on('click', function () {
    mainWindow.show();
  });

  return trayImage;
}

