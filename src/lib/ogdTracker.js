import {OGDLogger} from 'opengamedata-js-log'
let appName = 'CONECTADO';
let version = '1.0.0'; // checkme version should be detected automatically. also what about log version (js-tracker version?)
var ogdTracker = new OGDLogger(appName, version)
ogdTracker.enabled = true; // set to false to disable

export default ogdTracker;