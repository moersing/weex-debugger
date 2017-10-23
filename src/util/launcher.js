/**
 * Created by godsong on 16/6/13.
 */
const opn = require('opn');
function getChromeAppName () {
  switch (process.platform) {
    case 'darwin':
      return 'google chrome';
    case 'win32':
      return 'chrome';
    default:
      return 'google-chrome';
  }
}
const pendingList = [];
let pending = false;
exports.launchChrome = function (url, remoteDebugPort, wait, callback) {
  if (!pending) {
    pending = true;
    url = url.replace(/[&*]/g, '\\&');
        /* if (process.platform === 'darwin') {
         try {
         // Try our best to reuse existing tab
         // on OS X Google Chrome with AppleScript
         ExecSync('ps cax | grep "Google Chrome"')
         ExecSync(
         'osascript ' +
         Path.resolve(__dirname, '../../common/chrome.applescript') +
         ' ' + debuggerURL
         )
         return
         } catch (err) {
         // Ignore errors.
         }
         }*/
    const args = [getChromeAppName()];
    if (remoteDebugPort > 0) {
      args.push('-remote-debugging-port=' + remoteDebugPort);
    }

    opn(url, { app: args, wait: !!wait }).then((cp) => {
      cp.once('close', (e) => {
        callback && callback(null);
        if (pendingList.length > 0) {
          pending = false;
          pendingList.shift()();
        }
      });
      cp.once('error', (err) => {
        pending = false;
        callback && callback(err);
      });
    });
  }
  else {
    pendingList.push(function () {
      exports.launchChrome(url, remoteDebugPort, wait, callback);
    });
  }
};
exports.launchNewChrome = function (url, args) {

};