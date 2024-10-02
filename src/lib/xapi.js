import xAPITrackerAssetOAuth2 from "../xAPITracker/Auth/OAuth2.js"
import xAPITrackerAsset from "../xAPITracker/xAPITrackerAsset.js"
import {AccessibleTracker, ACCESSIBLETYPE } from "../xAPITracker/HighLevel/Accessible.js"
import { CompletableTracker , COMPLETABLETYPE } from "../xAPITracker/HighLevel/Completable.js";
import {AlternativeTracker , ALTERNATIVETYPE } from "../xAPITracker/HighLevel/Alternative.js"
import { GameObjectTracker , GAMEOBJECTTYPE } from "../xAPITracker/HighLevel/GameObject.js";
const xAPIConfig = {
    "grant_type": "code",
    "auth_endpoint": "https://sso.simva-beta.e-ucm.es:443/realms/simva/protocol/openid-connect/auth",
    "token_endpoint": "https://sso.simva-beta.e-ucm.es:443/realms/simva/protocol/openid-connect/token",
    "client_id": "simva-plugin",
    "code_challenge_method": "S256"
}
//var xapiTracker = new xAPITrackerAssetOAuth2("https://simva-api.simva-beta.e-ucm.es:443/activities/66eaa426a79dbf015d6f6206", xAPIConfig, "https://simva-beta.e-ucm.es/","testToken");
const urlParams = new URLSearchParams(window.location.search);
var simvaResultUri, authToken, username, homepage
if(urlParams.size > 0) {
    simvaResultUri = urlParams.get('url');
    authToken = "Bearer " + urlParams.get('authToken');
    username = urlParams.get('username');
    homepage = urlParams.get('homepage');
    console.debug(simvaResultUri);
    console.debug(authToken);
    console.debug(username);
    console.debug(homepage);
} else {
    simvaResultUri = null;
    authToken = null;
    username = null;
    homepage = null;
}
export var xapiTracker = new xAPITrackerAsset(simvaResultUri, authToken, homepage, username, "connectadoWeb");
export var accessibleXapiTracker = new AccessibleTracker(xapiTracker);
export var alternativeXapiTracker = new AlternativeTracker(xapiTracker);
export var completableXapiTracker = new CompletableTracker(xapiTracker);
export var gameObjectXapiTracker = new GameObjectTracker(xapiTracker);
completableXapiTracker.sendStatement(completableXapiTracker.Initialized("ConnectadoWeb",COMPLETABLETYPE.GAME));