import {OGDLogger} from 'opengamedata-js-log'
let appName = 'CONECTADO';
let version = '1.0.0'; // checkme version should be detected automatically. also what about log version (js-tracker version?)
var ogdTracker = new OGDLogger(appName, version)
ogdTracker.initialized = false; // evitar volver a sobreescribir el send

function encodeNonUtf8AsUnicode(object) {
    // para evitar problemas de encoding base64 (charset utf-8)
    let strObject = JSON.stringify(object);
    strObject = strObject.replace(/[^\x00-\x7F]/g, (c) => `\\\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);

    return JSON.parse(strObject);
}

function extractLastUrlSegment(url) {
    return url.substring(url.lastIndexOf('/') + 1);
}

let GAME_STATE = {
    GameDay: null,
    GameHour: null,
    gender: null,
    MobileMessages: 0,
    
    MariaFS: 50,
    AlisonFS: 50,
    AnaFS: 50,
    GuilleFS: 50,
    JoseFS: 50,
    AlexFS: 50,
    ParentsFS: 50,
    TeacherFS: 50,
    Risk: 50,

    Progress: 0,
    // Final: null,
}

ogdTracker.sendFromXAPI = function (statement) {
    let actor_id = statement.actor.accountName;
    // actor_id de xAPI (sobreescribe el generado con Date)
    if (actor_id) { 
        ogdTracker.setUserId(actor_id);
    }

    let verb_id = extractLastUrlSegment(statement.verb.verbId);
    let object_type = statement.object.type;
    let object_id = statement.object.id.replace("ConectadoWeb://", "");
    
    let event_name = object_type + "_" + verb_id;
    let event_data = statement.result ? statement.result.toXAPI() : {};
    event_data["object_id"] = object_id;

    if (event_data.score) {
        for (let key in event_data.score) {
            event_data["score_" + key] = event_data.score[key];
        }

        delete event_data.score;
    }
    
    if (event_data.extensions) {
        for (let key in event_data.extensions) {
            let field = key.replace("ConectadoWeb://", "");
            if (field.startsWith("http")) {
                field = extractLastUrlSegment(field);
            }

            // updating game state
            if (field in GAME_STATE) { 
                GAME_STATE[field] = event_data.extensions[key];
            } else if (field == "progress") {
                if (object_id in GAME_STATE) 
                    // progreso en friendships
                    GAME_STATE[object_id] = event_data.extensions[key];
                else
                    // progreso en el juego
                    GAME_STATE["Progress"] = event_data.extensions[key];
            }

            if (typeof event_data.extensions[key] === "object") {
                // nested object
                for (let subkey in event_data.extensions[key]) {
                    event_data[field + "_" + subkey] = event_data.extensions[key][subkey];
                }
            } else {
                event_data[field] = event_data.extensions[key];
            }
        }

        delete event_data.extensions;
    }

    // sending event to OGD (timestamp autofilled)
    event_name = encodeNonUtf8AsUnicode(event_name);
    event_data = encodeNonUtf8AsUnicode(event_data);
    GAME_STATE = encodeNonUtf8AsUnicode(GAME_STATE);
    ogdTracker.setGameState(GAME_STATE);
    ogdTracker.log(event_name, event_data);

    // checkme maybe add "if debug = true"
    console.log("Sending " + event_name + " to OPEN GAME DATA");
    // console.log(event_data);
}

export default ogdTracker;