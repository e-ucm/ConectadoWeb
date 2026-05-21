/**
 * @type {SeriousGameTracker}
 */
var xapiTracker = new SeriousGameTracker();
xapiTracker.trackerSettings.defaultUri=`${window.location.origin}${window.location.pathname}`, // Base URL for xAPI statements (can be customized or set via URL params)
xapiTracker.trackerSettings.generateSettingsFromURLParams=true;

(async () => {
  await xapiTracker.login();
  xapiTracker.start();
})();

export default xapiTracker;