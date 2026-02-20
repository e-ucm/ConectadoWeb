import {OGDLogger} from 'opengamedata-js-log'
let appName = 'CONECTADO';
let version = '1.0.0'; // checkme version should be detected automatically. also what about log version (js-tracker version?)
var ogdTracker = new OGDLogger(appName, version)
ogdTracker.initialized = false; // evitar volver a sobreescribir el send

const MAX_EV_NAME_LEN = 32

function removeNonUtf8Characters(object) {
    // para evitar problemas de encoding base64 (charset utf-8)
    let strObject = JSON.stringify(object);
    strObject = strObject.replace(/á/g, "a").replace(/é/g, "e").replace(/í/g, "i")
    .replace(/ó/g, "o").replace(/ú/g, "u").replace(/ñ/g, "ni")
    .replace(/ü/g, "u").replace(/¿/g, "");

    return JSON.parse(strObject);
}

ogdTracker.sendFromXAPI = function (statement) {
    let actor_id = statement.actor.accountName;
    // actor_id de xAPI (sobreescribe el generado con Date)
    if (actor_id) { 
        ogdTracker.setUserId(actor_id);
    }

    let verb_id = statement.verb.verbDisplay;
    let object_id = statement.object.id.replace("ConectadoWeb://", "");

    let event_name = object_id + "_" + verb_id;
    let event_data = statement.result ? statement.result.toXAPI() : {}; // checkme scorekey format


    if (statement.object.type === "storynode" && object_id.includes(" ")) {
        // dialogo - en vez de tener el texto del dialogo como id
        let speaker_name = object_id.split(" ")[0];
        event_name = "talk" + speaker_name + "_" + verb_id;
        event_data["message"] = object_id;
    }

    if (object_id.includes("comment_button")) {
        // comentario - en vez de tener el nombre del post como id
        event_name = "comment_button" + "_" + verb_id;
        let post = object_id.split("comment_button_")[1];
        event_data["post"] = post;
    }

    // acortamos event_name para evitar errores en el servidor OGD
    if (event_name.length > MAX_EV_NAME_LEN) {
        if (object_id.length <= MAX_EV_NAME_LEN) {
            // probamos a quitar el verbo
            event_name = object_id;
        } else {
            event_name = object_id.substring(0, MAX_EV_NAME_LEN);
            event_data["full_event_name"] = object_id;
        }
    }



    if (statement.object.type) {
        event_data["object_type"] = statement.object.type;
    }

    if (event_data.extensions) {
        for (let key in event_data.extensions) {
            let field = key.replace("ConectadoWeb://", "");
            event_data[field] = event_data.extensions[key];
        }

        delete event_data.extensions;
    }

    // sending event to OGD (timestamp autofilled)
    event_name = removeNonUtf8Characters(event_name);
    event_data = removeNonUtf8Characters(event_data);
    ogdTracker.log(event_name, event_data);

    // checkme maybe add "if debug = true"
    console.log("Sending " + event_name + " to OPEN GAME DATA");
}

export default ogdTracker;