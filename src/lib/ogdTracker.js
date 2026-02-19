import {OGDLogger} from 'opengamedata-js-log'
let appName = 'CONECTADO';
let version = '1.0.0'; // checkme version should be detected automatically. also what about log version (js-tracker version?)
var ogdTracker = new OGDLogger(appName, version)

ogdTracker.initialized = false; // evitar volver a sobreescribir el send

export default ogdTracker;