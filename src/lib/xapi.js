import { SeriousGameTracker } from "js-tracker";
/**
 * Instancia del tracker de xAPI para el juego. Se exporta para poder ser utilizado en cualquier parte del código.
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