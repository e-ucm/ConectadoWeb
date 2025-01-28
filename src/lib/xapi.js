export var xapiTracker = new generateXAPITrackerFromURLParams("ConectadoWeb");
export var accessibleXapiTracker = new AccessibleTracker(xapiTracker);
export var alternativeXapiTracker = new AlternativeTracker(xapiTracker);
export var completableXapiTracker = new CompletableTracker(xapiTracker);
export var gameObjectXapiTracker = new GameObjectTracker(xapiTracker);
//completableXapiTracker.enqueue(completableXapiTracker.Initialized("ConectadoWeb", COMPLETABLETYPE.GAME));
//completableXapiTracker.enqueue(completableXapiTracker.Progressed("ConectadoWeb", COMPLETABLETYPE.GAME, 0.5));
//completableXapiTracker.enqueue(completableXapiTracker.Completed("ConectadoWeb", COMPLETABLETYPE.GAME, true, false));
//completableXapiTracker.enqueue(completableXapiTracker.Completed("ConectadoWeb", COMPLETABLETYPE.GAME, true, true));