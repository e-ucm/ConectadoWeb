var xapiTracker = new JSTracker();
xapiTracker.generateXAPITrackerFromURLParams("ConectadoWeb");
xapiTracker.enqueue(xapiTracker.completableTracker.Initialized("ConectadoWeb", JSTracker.COMPLETABLETYPE.GAME));
export default xapiTracker;