import JSTracker from "js-tracker";

var xapiTracker = new JSTracker();
xapiTracker.generateXAPITrackerFromURLParams("ConectadoWeb");
//xapiTracker.completableTracker.Initialized("ConectadoWeb", JSTracker.COMPLETABLETYPE.GAME);
export default xapiTracker;