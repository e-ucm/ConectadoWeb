/**
 * @type {SeriousGameTracker}
 */
var xapiTracker = new SeriousGameTracker();
xapiTracker.trackerSettings.default_uri="ConectadoWeb";
xapiTracker.trackerSettings.generateSettingsFromURLParams=true;
//await xapiTracker.login(); // checkme this line fails
xapiTracker.start();

export default xapiTracker;