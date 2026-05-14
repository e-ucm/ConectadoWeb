/**
 * @type {SeriousGameTracker}
 */
var xapiTracker = new SeriousGameTracker();
xapiTracker.trackerSettings.default_uri="ConectadoWeb";
xapiTracker.trackerSettings.generateSettingsFromURLParams=true;

(async () => {
  await xapiTracker.login();
  xapiTracker.start();
})();

export default xapiTracker;