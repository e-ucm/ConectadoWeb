/**
 * @type {SeriousGameTracker}
 */
var xapiTracker = new SeriousGameTracker();
xapiTracker.trackerSettings.default_uri="ConectadoWeb";
xapiTracker.trackerSettings.generateSettingsFromURLParams=true;
xapiTracker.Login();
export default xapiTracker;