
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
(function () {
'use strict';

let instance$1 = null;

class EventDispatcher {
    /**
    * Clase para tratar los mensajes sin tener en cuenta el ambito puesto que es un Singleton
    * De este modo cualquier objeto puede acceder a ella y emitir un mensaje y otro que se 
    * encuentre en otro lugar distinto puede suscribirse sin preocuparse del ambito
    */
    constructor() {
        // Patron singleton
        if (instance$1 === null) {
            instance$1 = this;
        }
        else {
            throw new Error('EventDispatcher is a Singleton class!');
        }

        // Emisor de eventos
        this.emitter = new Phaser.Events.EventEmitter();
        // Mapas para conseguir un mejor manejo de los eventos y poder eliminar los eventos segun propietario

        // EVENTOS TEMPORALES
        // Se usa para poder borrar por evento facilmente
        // Estructura: evento-propietario -> map<string, set<object>>
        this.eventsMap = new Map();
        // Se usa para poder borrar por propietario facilmente
        // Estructura: propietario-evento-funciones -> map<object, map<string, set<fn>>>
        this.ownersMap = new Map();

        // EVENTOS PERMANENTES
        // Guardar eventos permanentemente
        // Estructura: propietario-evento-funciones -> map<object, map<string, set<fn>>>
        this.ownersPermanentMap = new Map();
    }

    // metodo para generar y coger la instancia
    static getInstance() {
        if (instance$1 === null) {
            instance$1 = new EventDispatcher();
        }
        return instance$1;
    }

    /**
    * Metodo para emitir un evento
    * @param {String} event - nombre del evento
    * @param {Object} obj - objeto que reciben los objetos suscritos al evento (opcional)
    */
    dispatch(event, obj) {
        this.emitter.emit(event, obj);
    }

    /**
     * Metodo para comprobar si un evento TEMPORAL o PERMANENTE ya existe
     * @param {String} event - nombre del evento 
     * @param {Object} owner - objeto que se suscribe al evento
     * @param {Function} fn - funcion que se ejecuta al producirse el evento
     * @param {Map} ownersMap - mapa de propietarios en el que buscar el evento (TEMPORAL O PERMANENTE)
     */
    alreadyExists(event, owner, fn, ownersMap) {
        // Existe el propietario...
        if (ownersMap.has(owner)) {
            // El propietario esta suscrito a ese evento...
            let ownerAux = ownersMap.get(owner);
            if (ownerAux.has(event)) {
                // El propietario tiene esa funcion suscrita a ese evento...
                let eventAux = ownerAux.get(event);
                if (eventAux.has(fn)) {
                    // Entonces, ya existe esa suscripcion
                    return true;
                }
            }
        }
        return false;
    }


    /**
    * PUBLICO
    * Metodo para suscribir un objeto a un evento TEMPORAL o PERMANENTE
    * @param {String} event - nombre del evento
    * @param {Object} owner - objeto que se suscribe al evento (contexto/scope)
    * @param {Fn} fn - funcion que se ejecuta cuando se produce el evento
    * @param {Boolean} permanent - indica si la suscripcion es permanente (true) o temporal (false)
    */
    add(event, owner, fn, permanent) {
        let exists = false;

        // Si no existe como permanente...
        exists = this.alreadyExists(event, owner, fn, this.ownersPermanentMap);
        if (!exists) {
            // Se quiere anadir como permanente...
            if (permanent) {
                // Se anade como permanente
                // exists -> false
                this.addAsPermanent(event, owner, fn);

                // Si existia como temporal...
                if (this.alreadyExists(event, owner, fn, this.ownersMap)) {
                    // Se elimina porque ahora es permanente
                    this.deepRemove(event, owner, fn);
                }
            }
            // Se quiere anadir como temporal...
            else {
                // Si no existe como temporal...
                exists = this.alreadyExists(event, owner, fn, this.ownersMap);
                if (!exists) {
                    // Se anade como temporal
                    // exists -> false
                    this.addAsTemporary(event, owner, fn);
                }
            }
        }

        // Si no existe, se emite...
        if (!exists) {
            // Nota: aunque se ha tratado en la propia clase, EventEmitter hace que si ya se esta suscrito
            // al evento, no se vuelve a suscribir
            this.emitter.on(event, fn, owner);
        }
    }

    /**
     * Metodo para almacenar en los mapas un evento TEMPORAL
     * @param {String} event - nombre del evento 
     * @param {Object} owner - objeto que se suscribe al evento
     * @param {Function} fn - funcion que se ejecuta al producirse el evento
     */
    addAsTemporary(event, owner, fn) {
        // EVENTOS
        if (!this.eventsMap.has(event)) {
            // El evento no existe...
            // Se crea el evento en el mapa de eventos
            this.eventsMap.set(event, new Set());
        }
        let eventAux = this.eventsMap.get(event);
        if (!eventAux.has(owner)) {
            // El evento no tiene registrado a ese propietario...
            // Se anade ese propietario al evento en el mapa de eventos
            eventAux.add(owner);
        }

        // PROPIETARIOS
        this.addToOwnersMap(event, owner, fn, this.ownersMap);
    }

    /**
     * Metodo para almacenar en los mapas un evento PERMANENTE
     * @param {String} event - nombre del evento 
     * @param {Object} owner - objeto que se suscribe al evento
     * @param {Function} fn - funcion que se ejecuta al producirse el evento
     */
    addAsPermanent(event, owner, fn) {
        this.addToOwnersMap(event, owner, fn, this.ownersPermanentMap);
    }

    /**
     * Metodo para almacenar un evento en el mapa de propietarios
     * @param {String} event - nombre del evento 
     * @param {Object} owner - objeto que se suscribe al evento
     * @param {Function} fn - funcion que se ejecuta al producirse el evento
     * @param {Map} ownersMap - mapa de propietarios en el que se va a guardar el evento
     */
    addToOwnersMap(event, owner, fn, ownersMap) {
        // PROPIETARIOS
        if (!ownersMap.has(owner)) {
            // El propietario no existe...
            // Se crea el propietario en el mapa de propietarios correspondiente
            ownersMap.set(owner, new Map());
        }
        let ownerAux = ownersMap.get(owner);
        if (!ownerAux.has(event)) {
            // El propietario no esta suscrito a ese evento...
            // Se crea el evento para ese propietario en el mapa de propietarios correspondiente
            ownerAux.set(event, new Set());
        }
        let ownerEventAux = ownerAux.get(event);
        // Se anade la funcion de ese evento para ese propietario en el mapa de propietarios correspondiente
        // Nota: si se ha llegado a este punto esta funcion no esta registrada porque si lo estuviera habria salido que ya existe esa suscripcion
        ownerEventAux.add(fn);
    }

    /**
    * PUBLICO
    * Metodo para suscribir un objeto a un evento una sola vez
    * @param {String} event - nombre del evento
    * @param {Object} owner - objeto que se suscribe al event (contexto)
    * @param {Fn} fn - funcion que se ejecuta cuando se produce el evento
    */
    addOnce(event, owner, fn) {
        this.emitter.once(event, fn, owner);
    }

    /**
     * PUBLICO
     * @param {String} event - nombre del evento 
     * @param {String} owner - objeto suscrito al evento 
     * @param {Function} fn - funcion que ejecuta al producirse el evento
     */
    deepRemove(event, owner, fn) {
        // Si existe el propietario... 
        if (this.ownersMap.has(owner)) {
            let ownersAux = this.ownersMap.get(owner);
            // Si existe el evento...
            if (ownersAux.has(event)) {
                let ownerEventAux = ownersAux.get(event);
                // Si existe la funcion...
                if (ownerEventAux.has(fn)) {
                    // Se desuscribe la funcion del evento que corresponde a cierto propietario
                    ownerEventAux.delete(fn);

                    this.emitter.off(event, fn, owner);
                }
            }
        }
    }

    /**
    * PUBLICO
    * Metodo para desuscribir a todos los objetos de un evento concreto TEMPORAL
    * @param {String} event - nombre del evento
    */
    removeByEvent(event) {
        // Existe el evento...
        if (this.eventsMap.has(event)) {
            let owners = this.eventsMap.get(event);
            // Se actualiza el mapa de propietarios
            owners.forEach(owner => {
                this.ownersMap.get(owner).delete(event);
            });

            // Se elimina el evento
            this.emitter.off(event);

            // Se actualiza el mapa de eventos
            this.eventsMap.delete(event);
        }
    }

    /**
    * PUBLICO
    * Metodo para desuscribir a un objeto de todos sus eventos TEMPORALES
    * @param {Object} owner - objeto suscrito al evento
    */
    removeByOwner(owner) {
        // Si existe el propietario...
        if (this.ownersMap.has(owner)) {
            // Se obtienen todos los eventos del propietario (map)
            let events = this.ownersMap.get(owner);
            // Se recorre cada evento
            events.forEach((functions, eventName) => {
                // Se elimina el propietario de ese evento en el mapa de eventos
                this.eventsMap.get(eventName).delete(owner);

                // Se desuscribe el propietario de cada evento por cada funcion que tenga suscrita
                // (no es lo habitual, pero podria darse el caso que un
                // mismo propietario estuviera suscrito a un mismo evento con varias funciones)
                functions.forEach(fn => {
                    this.emitter.off(eventName, fn, owner);
                });
            });

            // Se actualiza el mapa de propietarios
            this.ownersMap.delete(owner);
        }
    }

    /**
    * PUBLICO
    * Metodo para desuscribir a un objeto de un evento concreto TEMPORAL
    * @param {String} event - nombre del evento
    * @param {Object} owner - objeto suscrito al evento
    */
    remove(event, owner) {
        // Existe el evento...
        if (this.eventsMap.has(event)) {
            // Existe el propietario...
            let eventAux = this.eventsMap.get(event);
            if (eventAux.has(owner)) {
                // Se actualiza el mapa de eventos
                eventAux.delete(owner);

                // Se desuscriben todas las funciones del propietarios que estan suscritas a ese evento
                // (a partir del mapa de propietarios)
                let ownerEventAux = this.ownersMap.get(owner).get(event);
                ownerEventAux.forEach(fn => {
                    this.emitter.off(event, fn, owner);
                });

                // Se actualiza el mapa de propietarios
                this.ownersMap.get(owner).delete(event);
            }
        }
    }

    /**
    * Metodo para eliminar todos los eventos TEMPORALES
    * Nota: si no hay comunicacion entre escenas, es recomendable llamarlo por cada
    * cambio de escenas para mejorar el rendimiento
    */
    removeAll() {
        this.emitter.shutdown();
        this.eventsMap.clear();
        this.ownersMap.clear();

        // Se recorre el mapa permanente de propietarios...
        this.ownersPermanentMap.forEach((events, owner) => {
            // Se recorren los eventos de ese propietario...
            events.forEach((functions, eventName) => {
                // Se recorre cada una de las funciones de ese evento...
                functions.forEach((fn) => {
                    // SE VUELVE A SUSCRIBIR PORQUE SON PERMANENTES
                    this.emitter.on(eventName, fn, owner);
                });
            });
        });
    }

    /**
     * Metodo para limpiar por completo el emisor, por lo tanto,
     * se eliminan tanto eventos TEMPORALES como PERMANENTES
     */
    clear() {
        this.emitter.shutdown();
        this.eventsMap.clear();
        this.ownersMap.clear();
        this.ownersPermanentMap.clear();
    }
}

/**
 * @type {SeriousGameTracker}
 */
var xapiTracker = new SeriousGameTracker();
xapiTracker.trackerSettings.default_uri=`${window.location.origin}${window.location.pathname}/`, // Base URL for xAPI statements (can be customized or set via URL params)
xapiTracker.trackerSettings.generateSettingsFromURLParams=true;

(async () => {
  await xapiTracker.login();
  xapiTracker.start();
})();

// Variable de nivel de modulo
// - Se puede acceder desde cualquier parte del modulo, pero no es visible
// al no pertenecer a la clase y no ser exportada
// - No cambia con las instancia puesto que no pertenece a la clase, sino
// al modulo y solo existe un modulo

let instance = null;
let locationUrl = `${window.location.origin}${window.location.pathname}`; // Base URL for xAPI statements (can be customized or set via URL params)

class GameManager {
    /**
    * Maneja el flujo de juego y variables de uso comun
    * @param {Scene} - se necesita una escena para poder acceder al ScenePlugin y cambiar de escena
    */
    constructor(scene) {
        // no deberia suceder, pero por si acaso se hace el new de la clase desde fuera
        if (instance === null) {
            instance = this;
        }
        else {
            throw new Error('GameManager is a Singleton class!');
        }

        // Se necesita una escena para poder acceder al ScenePlugin y cambiar de escena
        // Por lo tanto, se aprovecha para mantener la escena actual
        // El SceneManager tb incluye el cambio de escena, pero no es recomendable segun
        // la docu manejarlo a traves de el
        this.currentScene = scene;
        this.runningScenes = new Set();

        this.i18next = this.currentScene.plugins.get('rextexttranslationplugin');
        this.dispatcher = EventDispatcher.getInstance();

        // Blackboard de variables de todo el juego
        this.blackboard = new Map();

        // Escena de la UI
        this.UIManager = null;
        // Escena del ordenador
        this.computerScene = null;

        // Informacion del usuario
        this.userInfo = null;

        // Dia de la semana. Empieza en 0 porque al iniciarse la escena de la alarma, se va actualizando
        this.day = 0;
        this.dayText = null;
        this.hourId = null;
        this.hour = null;
        this.notificationAmount = null;
        //this.isRepeatedDay=false;
        this.startedTime=null;

        this.generateTextures();

        // Configuracion de texto por defecto
        this.textConfig = {
            fontFamily: 'Arial',        // Fuente (tiene que estar precargada en el html o el css)
            fontSize: 25 + 'px',        // Tamano de la fuente del dialogo
            fontStyle: 'normal',        // Estilo de la fuente
            backgroundColor: null,      // Color del fondo del texto
            color: '#ffffff',           // Color del texto
            stroke: '#000000',          // Color del borde del texto
            strokeThickness: 0,         // Grosor del borde del texto 
            align: 'left',              // Alineacion del texto ('left', 'center', 'right', 'justify')
            wordWrap: null,
            padding: null               // Separacion con el fondo (en el caso de que haya fondo)
        };

    }

    // metodo para generar y coger la instancia
    static create(scene) {
        if (instance === null) {
            instance = new GameManager(scene);
        }
        return instance;
    }

    // metodo para generar y coger la instancia
    static getInstance() {
        return this.create();
    }

    ///////////////////////////////////////
    /// Metodos para generar texturas ////
    //////////////////////////////////////

    /**
     * Se utiliza para generar las diferentes texturas que se van a usar en los menus y poder
     * tener un sencillo acceso a los diferentes parametros de cada una (nombre, tam...)
     */
    generateTextures() {
        // Se genera una textura en forma de circulo
        // Es necesario porque el emisor de particulas solo admite texturas, pero no shapes
        this.circleParticle = {
            name: 'circleParticle',
            radius: 50,
            color: 0xFF0808
        };
        // Se crea un render texture para poder generar texturas dinamicante a
        // partir de casi cualquier objeto
        // (x, y, width, height) --> 
        // --> el render texture se coloca en el centro del circulo y con el tam del circulo para que la textura resultante sea del tam del circulo
        let rt = this.currentScene.add.renderTexture(this.circleParticle.radius, this.circleParticle.radius, this.circleParticle.radius * 2, this.circleParticle.radius * 2);
        // Se crea un circlo
        let circle = this.currentScene.add.circle(0, 0, this.circleParticle.radius, this.circleParticle.color);
        // (entry, x, y) --> se dibuja el circulo
        rt.draw(circle, this.circleParticle.radius, this.circleParticle.radius);
        // Se guarda la textura con el nombre correspondiente
        rt.saveTexture(this.circleParticle.name);
        // Se destruye el circulo
        circle.destroy();

        // Se crea un objeto grafico, que sirve para formas primitivas (resulta muy util para dibujar elementos con bordes redondeados)
        // Ademas, si el objeto grafico no va a modificar durante el tiempo es recomendable convertirlo en una textura y usarla
        // para mejorar el rendimiento
        this.graphics = this.currentScene.add.graphics();

        // Se crea un cuadrado con bordes redondeados
        this.roundedSquare = {
            fillName: 'fillSquare',
            edgeName: 'edgeSquare',
            width: 100,
            height: 100,
            radius: 10,
            fillColor: 0xffffff,
            edgeColor: 0x000000,
            edgeWith: 2.6,
            offset: 10
        };
        this.generateBox(this.roundedSquare);

        // Se crea un rectangulo con bordes redondeados que sirve para una caja de texto
        this.textBox = {
            fillName: 'fillText',
            edgeName: 'edgeText',
            width: 335,
            height: 80,
            radius: 10,
            fillColor: 0xffffff,
            edgeColor: 0x000000,
            edgeWith: 1,
            offset: 10
        };
        this.generateBox(this.textBox);

        // Se crea un rectangulo alargado con bordes redondeados que sirve para una caja donde introducir input
        this.inputBox = {
            fillName: 'fillInput',
            edgeName: 'edgeInput',
            width: 420,
            height: 100,
            radius: 10,
            fillColor: 0xffffff,
            edgeColor: 0x000000,
            edgeWith: 2,
            offset: 10
        };
        this.generateBox(this.inputBox);

        // Se destruyen tanto el render texture como el graphics puesto que ya no se van a usar mas
        rt.destroy();
        this.graphics.destroy();
    }

    /**
     * Sirve para crear una forma primitva usando el objeto grafico creado anteriormente
     * Se van a crear tanto la parte interior como el borde de la forma
     * IMPORTANTE:
     * - La forma primitva no se puede crear pegada a uno de los bordes de la pantalla porque sino hay ciertos detalles que se pierden
     * - La textura generada a partir de la forma primitiva no puede ser exactamente del mismo detalle que la forma porque sino hay
     *      ciertos detalles que se pierden.
     * Por los motivos nombrados arriba se utiliza un pequeño offset. Sin embargo, esto va a provocar que la caja de colision
     * textura sea un poquito mas grande que la textura en si
     * Nota: a la hora de crear una forma primitiva con un objeto grafico, el (0, 0) esta arriba a la izquierda
     */
    generateBox(boxParams) {
        // parte interior
        this.graphics.fillStyle(boxParams.fillColor, 1);
        this.graphics.fillRoundedRect(boxParams.offset, boxParams.offset, boxParams.width, boxParams.height, boxParams.radius);
        this.graphics.generateTexture(boxParams.fillName, boxParams.width + boxParams.offset * 2, boxParams.height + boxParams.offset * 2);
        this.graphics.clear();

        // borde
        this.graphics.lineStyle(boxParams.edgeWith, boxParams.edgeColor, 1);
        this.graphics.strokeRoundedRect(boxParams.offset, boxParams.offset, boxParams.width, boxParams.height, boxParams.radius);
        this.graphics.generateTexture(boxParams.edgeName, boxParams.width + boxParams.offset * 2, boxParams.height + boxParams.offset * 2);
        this.graphics.clear();
    }

    // Tiene los campos: name, username, password, gender
    setUserInfo(userInfo) {
        this.userInfo = userInfo;
        this.blackboard.set("gender", userInfo.gender);
    }
    getUserInfo() {
        return this.userInfo;
    }

    ///////////////////////////////////////
    /// Metodos para cambiar de escena ///
    //////////////////////////////////////

    /**
     * Metodo para limpiar todo el estado del juego
     */
    resetGame() {
        // Se limpia el emisor de eventos completamente (tanto eventos TEMPORALES como PERMANENTES)
        this.dispatcher.clear();

        // Se anade a los eventos permanentes el evento de cambiar la amistad
        this.dispatcher.add("changeFriendship", this, (obj) => {
            this.changeFriendship(obj.character, obj.value);
        }, true);

        // Se anade a los eventos permanentes el evento terminar un chat para indicar que ya no hay nada mas que contestar
        this.dispatcher.add("endChat", this, (obj) => {
            let chatName = this.i18next.t("textMessages." + obj.chat, { ns: "phoneInfo", returnObjects: true });
            let nodes = this.currentScene.cache.json.get('everydayDialog');
            let phoneNode = this.currentScene.readNodes(nodes, "everydayDialog", "phone", true);
            this.UIManager.phoneManager.phone.setChatNode(chatName, phoneNode);
        }, true);


        // Se borran todas las escenas activas (por si acaso)
        this.clearRunningScenes();

        // Se borra la escena de la UI
        if (this.UIManager) {
            this.UIManager.scene.stop();
            this.UIManager = null;
        }

        // Se borra la escena del ordenador
        if (this.computerScene) {
            this.computerScene.scene.stop();
            this.computerScene = null;
        }

        // Se borra la blackboard
        this.blackboard.clear();

        // Se resetean los parametros iniciales a la blackboard
        // Nota: aunque luego se setean en AlarmScene, se setean restauran aqui por si acaso
        this.setValue("isLate", false);
        this.setValue("bagPicked", false);

        // Se borra la informacion del usuario
        this.userInfo = null;

        // Dia de la semana. Empieza en 0 porque al iniciarse la escena de la alarma, se va actualizando
        this.day = 0;
    }

    /**
     * El menu donde seleccionar el idioma se trata de la primera escena del juego
     * Nota: los botones de SALIR siempre llevan a esta pantalla
     */
    startLangMenu() {
        // Se limpia el estado del juego por completo
        this.resetGame();

        let sceneName = 'LanguageMenu';
        this.changeScene(sceneName);
    }

    startTitleMenu() {
        let sceneName = 'TitleMenu';
        this.changeScene(sceneName);
    }

    startLoginMenu() {
        let sceneName = 'LoginMenu';
        this.changeScene(sceneName);
    }

    startCreditsScene(endgame) {
        let params = {
            endgame: endgame
        };
        let sceneName = 'CreditsScene';
        this.changeScene(sceneName, params);
    }

    startTest() {
        this.initializedGame();
        this.blackboard.clear();
        let userInfo = {
            name: "Pepe",
            gender: "male",
        };
        this.setUserInfo(userInfo);

        let UIsceneName = 'UIManager';
        this.currentScene.scene.launch(UIsceneName);
        this.UIManager = this.currentScene.scene.get(UIsceneName);

        let computerSceneName = 'ComputerScene';
        this.currentScene.scene.run(computerSceneName);
        this.computerScene = this.currentScene.scene.get(computerSceneName);
        this.computerScene.scene.sleep();

        this.day = 3;
        this.changeScene("BedroomAfternoonDay3");
    }

    startGame(userInfo) {
        this.initializedGame();
        this.blackboard.clear();
        this.setUserInfo(userInfo);
        this.day = 0;
        // IMPORTANTE: Hay que lanzar primero el UIManager para que se inicialice
        // el DialogManager y las escenas puedan crear los dialogos correctamente
        let UIsceneName = 'UIManager';
        this.currentScene.scene.launch(UIsceneName);
        this.UIManager = this.currentScene.scene.get(UIsceneName);

        // run tiene 3 opciones:
        // - si esta pausada (no se actualiza), se reanuda
        // - si esta dormida (no se actualiza ni renderiza), se despierta
        // - si no esta corriendo, se inicia
        // La primera vez sucede que se inicio y luego, se va a despertar
        let computerSceneName = 'ComputerScene';
        this.currentScene.scene.run(computerSceneName);
        this.computerScene = this.currentScene.scene.get(computerSceneName);
        this.computerScene.scene.sleep();

        // Pasa a la escena inicial con los parametros text, onComplete y onCompleteDelay
        let sceneName = 'TextOnlyScene';
        let params = {
            // El texto de se coge del a archivo de traducciones
            text: this.i18next.t("day1.start", { ns: "transitionScenes", returnObjects: true }),
            onComplete: () => {
                // Al llamar a onComplete, se cambiara a la escena de la alarma
                this.changeScene('AlarmScene', null);
            },
            onCompleteDelay: 500
        };

        this.changeScene(sceneName, params);
    }

    /**
     * Metodo para borrar y cerrar todas las escenas activas
     */
    clearRunningScenes() {
        this.runningScenes.forEach(sc => {
            // Si la escena define shutdown, se llama antes de detenerla para
            // evitar problemas al limpiar recursos compartidos (p.ej. retratos).
            if (typeof sc.shutdown === 'function') {
                sc.shutdown();
            }
            sc.scene.stop(sc);
        });
        this.runningScenes.clear();
    }

    /**
    * Metodo para cambiar de escena
    * @param {String} scene - key de la escena a la que se va a pasar
    * @param {Object} params - informacion que pasar a la escena (opcional)
    * @param {Boolean} cantReturn - true si se puede regresar a la escena anterior, false en caso contrario
    */
    changeScene(scene, params, canReturn = false) {
        // Si no se puede volver a la escena anterior, se detienen todas las
        // escenas que ya estaban creadas porque ya no van a hacer falta 
        if (!canReturn) {
            this.clearRunningScenes();
        }
        // Si no, se se duerme la escena actual en vez de destruirla ya que
        // habria que mantener su estado por si se quiere volver a ella
        else {
            this.currentScene.scene.sleep();
        }

        // Se inicia y actualiza la escena actual
        this.currentScene.scene.run(scene, params);
        this.currentScene = this.currentScene.scene.get(scene);

        // Se anade la escena a las escenas que estan ejecutandose
        this.runningScenes.add(this.currentScene);

    }

    switchToComputer() {
        this.interacted("ShowComputerLogin", xapiTracker.GAMEOBJECTTYPE.ITEM)
                .send();
        // Se desactiva la interfaz del telefono
        this.UIManager.phoneManager.activate(false);
        
        // Se duerme la escena actual
        this.currentScene.scene.sleep();

        // Se cambia a la escena del ordenador
        this.computerScene.start();
        this.computerScene.scene.wake();
    }

    leaveComputer() {
        this.interacted("offComputer", xapiTracker.GAMEOBJECTTYPE.ITEM)
            .send();
        // Se reactiva la interfaz del telefono
        this.UIManager.phoneManager.activate(true);

        // Se duerme la escena del ordenador
        this.computerScene.scene.sleep();

        // Se cambia a la escena actual de vuelta, que deberia ser la
        // habitacion, y deberia ponerse la camara en la izquierda
        let params = {
            camPos: "left"
        };
        this.currentScene.scene.wake(this.currentScene.scene.key, params);
    }


    ///////////////////////////////////////
    ///// Metodos para la blackboard /////
    //////////////////////////////////////
    /**
    * Devuelve el valor buscado en la blackboard
    * @param {String} key - valor buscado
    * @param {Map} blackboard - blackboard en la que se busca el valor. Por defecto es la del gameManager 
    * @returns {object} - el objeto buscado en caso de que exista. null en caso contrario
    */
    getValue(key, blackboard = this.blackboard) {
        if (blackboard.has(key)) {
            return blackboard.get(key);
        }
        return null;
    }

    /**
    * Metodo que setea un valor en la blackboard
    * @param {String} key - valor que se va a cambiar
    * @param {Object} value - valor que se le va a poner al valor a cambiar
    * @param {Map} blackboard - blackboard en la que se cambia el valor. Por defecto es la del gameManager 
    * @returns {boolean} - true si se ha sobrescrito un valor. false en caso contrario
    */
    setValue(key, value, blackboard = this.blackboard) {
        let exists = false;
        if (blackboard.has(key)) {
            exists = true;
        }
        blackboard.set(key, value);
        return exists;
    }

    /**
    * Indica si un valor existe o no en la blackboard
    * @param {String} key - valor buscado
    * @param {Map} blackboard - blackboard en la que se busca el valor. Por defecto es la del gameManager
    * @returns {boolean} - true si existe el valor. false en caso contrario
    */
    hasValue(key, blackboard = this.blackboard) {
        return blackboard.has(key);
    }

    /**
     * Modifica el valor de amistad del personaje indicado
     * @param {String} character - personaje al que cambiar el valor de amistad
     * @param {Number} amount - cantidad de amistad que sumarle
     */
    changeFriendship(character, amount) {
        let varName = character + "FS";

        // Si no se encuentra el personaje en la blackboard, se anade con 50 de amistad por defecto
        if (!this.getValue(varName)) {
            xapiTracker.alternative("friend",xapiTracker.ALTERNATIVETYPE.ALTERNATIVE)
                        .unlocked(character)
                        .send();
            xapiTracker.completable(varName, xapiTracker.COMPLETABLETYPE.COMPLETABLE)
                        .initialized()
                        .send();
            this.setValue(varName, 50);
        }

        // Obtiene la cantidad a establecer y la actualiza
        let val = this.getValue(varName);
        val += amount;
        if(val > 100) {
            val = 100; 
        } else if (val < 0) {
            val = 0;
        }
        this.setValue(varName, val);
        xapiTracker.completable(varName, xapiTracker.COMPLETABLETYPE.COMPLETABLE)
                    .progressed(val)
                    .send();
        // Actualiza el valor tambien en la pantalla de relaciones del movil
        this.UIManager.phoneManager.phone.updateRelationShip(character, val);
    }

    interacted(id, type) {
        return xapiTracker.gameObject(id, type)
            .interacted()
            .withResultExtension("GameDay", `day.${this.day}`)
            .withResultExtension("GameHour", `${this.hourId}`)
            .withResultExtension("MobileMessages", this.notificationAmount)
            .withResultExtensions(this.blackboard);
    }

    initialized(id, type) {
        return xapiTracker.completable(id, type)
                          .initialized()
                          .withResultExtension("GameDay", `day.${this.day}`)
                          .withResultExtension("GameHour", `${this.hourId}`)
                          //.withResultExtension("IsRepeatedDay", this.isRepeatedDay) //TODO GlobalState.Repeated.ToString() 
                          .withResultExtension("MobileMessages", this.notificationAmount)
                          .withResultExtensions(this.blackboard);
    }

    completed(id, type, completion) {
        return xapiTracker.completable(id, type)
                          .completed(null, completion)
                          .withResultExtension("GameDay",`day.${this.day}`)
                          .withResultExtension("GameHour", `${this.hourId}`)
                          //.withResultExtension("IsRepeatedDay", this.isRepeatedDay) //TODO GlobalState.Repeated.ToString() 
                          .withResultExtension("MobileMessages", this.notificationAmount)
                          .withResultExtensions(this.blackboard);
    }

    addStateExtensions(statement) {
        statement.withResultExtension("Final", this.final);
        statement.withResultExtension("GameDay", `day.${this.day}`);
        statement.withResultExtension("GameHour", `${this.hourId}`);
        statement.withResultExtension("MariaFriendship",this.blackboard.get("MariaFS"));
        statement.withResultExtension("AlisonFriendship", this.blackboard.get("AlisonFS"));
        statement.withResultExtension("AnaFriendship", this.blackboard.get("AnaFS"));
        statement.withResultExtension("GuillermoFriendship", this.blackboard.get("GuilleFS"));
        statement.withResultExtension("JoseFriendship", this.blackboard.get("JoseFS"));
        statement.withResultExtension("AlejandroFriendship", this.blackboard.get("AlexFS"));
        statement.withResultExtension("ParentsFriendship", this.blackboard.get("ParentsFS"));
        statement.withResultExtension("TeacherFriendship", this.blackboard.get("TeacherFS"));
        statement.withResultExtension("RiskFriendship", this.blackboard.get("Risk"));
        statement.withProgress(this.day/5);
        return statement;
    }

    async initializedGame() {
        this.startedTime=new Date();
        this.Initialized=true;
        await xapiTracker.completable(locationUrl,xapiTracker.COMPLETABLETYPE.GAME)
                            .initialized()
                            .send();
        await xapiTracker.flush();
    }

    async progressedGame() {
        var actualTime = new Date();
        let statementBuilder=xapiTracker.completable(locationUrl,xapiTracker.COMPLETABLETYPE.GAME)
                    .progressed(this.day/5)
                    .withDuration(this.startedTime, actualTime);
        statementBuilder=this.addStateExtensions(statementBuilder);
        await statementBuilder.send();
        await xapiTracker.flush();
    }

    async completedGame(completion) {
        this.Initialized=false;
        await this.completed(locationUrl,xapiTracker.COMPLETABLETYPE.GAME, completion)
                    .send();
        await xapiTracker.flush({withBackup:true});
    }
}

// @ts-check
/**
 *   @fileoverview provides helpful methods for generating uris and identifiers used by the OGDLogger class refrencing the information in LogConsts
 *
 * Based on the implementation in LogUtils.cs in opengamedata-unity by Autumn Beauchesne
 *
 * @author Alex Grabowski <ajgrabowski@wisc.edu>
 *   @version 0.1.0
 */

/**
 *  a helper function used to calculate a piece of the uuid
 *  @param {number} uuid - uniquie user id
 *  @param {number} input - number to be used; i.e. date section
 *  @param {number} multiply - multiplier to be used in funciton
 *  @returns a section
 */
function UUIDAccumulate(uuid, input, multiply) {
    return uuid * multiply + ((input | 0) % multiply);
}

/**
 * @returns a 17-digit unique identifier using the current datetime.
 */
function UUIDint() {
    let uuid = 0;

    let now = new Date();

    uuid = UUIDAccumulate(uuid, now.getFullYear(), 100);
    uuid = UUIDAccumulate(uuid, now.getMonth(), 100);
    uuid = UUIDAccumulate(uuid, now.getDate(), 100);
    uuid = UUIDAccumulate(uuid, now.getHours(), 100);
    uuid = UUIDAccumulate(uuid, now.getMinutes(), 100);
    uuid = UUIDAccumulate(uuid, now.getSeconds(), 100);
    uuid = UUIDAccumulate(uuid, Math.random() * 10, 10);
    uuid = UUIDAccumulate(uuid, Math.random() * 10, 10);
    uuid = UUIDAccumulate(uuid, Math.random() * 10, 10);
    uuid = UUIDAccumulate(uuid, Math.random() * 10, 10);
    uuid = UUIDAccumulate(uuid, Math.random() * 10, 10);

    return uuid;
}

/**
 * replaces confusing or ambigious characters in a given sting for sending JSON objects to the database
 *
 * @param {string} text - string to be formatted
 */
function EscapeJSONString(text) {
    if (text.length == 0 || text == null) return;

    const escapedText = text
        .replace(/\\n/g, "\\n")
        .replace(/\\'/g, "\\'")
        .replace(/\\"/g, '\\"')
        .replace(/\\&/g, "\\&")
        .replace(/\\r/g, "\\r")
        .replace(/\\t/g, "\\t")
        .replace(/\\b/g, "\\b")
        .replace(/\\f/g, "\\f");

    return escapedText;
}

/**
 * @returns {string} generates the Open Game Data uri from information in ./LogConsts
 */
function BuildOGDUrl() {
    let params = [
        "?app_id=",
        OGDLogConsts.AppId.toUpperCase(), //done automatically to force convention
        "&app_version=",
        OGDLogConsts.AppVersion,
        ...(OGDLogConsts.AppBranch ? ["&appbranch=", encodeURIComponent(OGDLogConsts.AppBranch)] : []),
        "&log_version=",
        OGDLogConsts.ClientLogVersion.toString(),
        "&session_id=",
        SessionConsts.SessionId.toString(),
        ...(SessionConsts.UserId ? ["&user_id=", encodeURIComponent(SessionConsts.UserId)] : []),
        ...(SessionConsts.UserData ? ["&user_data=", encodeURIComponent(SessionConsts.UserData)] : []),
    ];

    return OGDLogEndpoint.concat(...params); // base for the logging endpoint
}

// @ts-check
/**
 * @fileoverview these objects store logging relevant session information to be referenced later by the OGDLogger and LogUtils
 *
 * @version 1.1.0
 */

/**
 * @typedef SessionConsts
 * @property {number} SessionId - Unique session identifier
 * @property {string} [UserId] - The player's unique personal identifier
 * @property {object} [UserData] - Additional data associated with the UserId.
 */

/**
 * @type {SessionConsts}
 */
const SessionConsts = {
    SessionId: UUIDint(),
    UserId: null,
    UserData: null
};

Object.seal(SessionConsts);

/**
 * @typedef OGDLogConsts
 * @property {string} AppId - Identifier for the app. Should match the name of the game in the database.
 * @property {string} AppVersion - The current version of the app.
 * @property {string} [AppBranch] - The current branch of the app.
 * @property {string} ClientLogVersion - Client logging version
 */

const OGDLogVersion = "opengamedata";
const OGDLogEndpoint = "https://ogdlogger.fielddaylab.wisc.edu/logger/log.php";

/**
 * @type {OGDLogConsts}
 */
const OGDLogConsts = {
    AppId: "mashopolis",
    AppVersion: "0.1.0",
    AppBranch: null,
    ClientLogVersion: "v0.1.1"
};

Object.seal(OGDLogConsts);

/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @fileoverview Firebase constants.  Some of these (@defines) can be overridden at compile-time.
 */
const CONSTANTS = {
    /**
     * @define {boolean} Whether this is the client Node.js SDK.
     */
    NODE_CLIENT: false,
    /**
     * @define {boolean} Whether this is the Admin Node.js SDK.
     */
    NODE_ADMIN: false,
    /**
     * Firebase SDK Version
     */
    SDK_VERSION: '${JSCORE_VERSION}'
};

/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Throws an error if the provided assertion is falsy
 */
const assert = function (assertion, message) {
    if (!assertion) {
        throw assertionError(message);
    }
};
/**
 * Returns an Error object suitable for throwing.
 */
const assertionError = function (message) {
    return new Error('Firebase Database (' +
        CONSTANTS.SDK_VERSION +
        ') INTERNAL ASSERT FAILED: ' +
        message);
};

/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const stringToByteArray$1 = function (str) {
    // TODO(user): Use native implementations if/when available
    const out = [];
    let p = 0;
    for (let i = 0; i < str.length; i++) {
        let c = str.charCodeAt(i);
        if (c < 128) {
            out[p++] = c;
        }
        else if (c < 2048) {
            out[p++] = (c >> 6) | 192;
            out[p++] = (c & 63) | 128;
        }
        else if ((c & 0xfc00) === 0xd800 &&
            i + 1 < str.length &&
            (str.charCodeAt(i + 1) & 0xfc00) === 0xdc00) {
            // Surrogate Pair
            c = 0x10000 + ((c & 0x03ff) << 10) + (str.charCodeAt(++i) & 0x03ff);
            out[p++] = (c >> 18) | 240;
            out[p++] = ((c >> 12) & 63) | 128;
            out[p++] = ((c >> 6) & 63) | 128;
            out[p++] = (c & 63) | 128;
        }
        else {
            out[p++] = (c >> 12) | 224;
            out[p++] = ((c >> 6) & 63) | 128;
            out[p++] = (c & 63) | 128;
        }
    }
    return out;
};
/**
 * Turns an array of numbers into the string given by the concatenation of the
 * characters to which the numbers correspond.
 * @param bytes Array of numbers representing characters.
 * @return Stringification of the array.
 */
const byteArrayToString = function (bytes) {
    // TODO(user): Use native implementations if/when available
    const out = [];
    let pos = 0, c = 0;
    while (pos < bytes.length) {
        const c1 = bytes[pos++];
        if (c1 < 128) {
            out[c++] = String.fromCharCode(c1);
        }
        else if (c1 > 191 && c1 < 224) {
            const c2 = bytes[pos++];
            out[c++] = String.fromCharCode(((c1 & 31) << 6) | (c2 & 63));
        }
        else if (c1 > 239 && c1 < 365) {
            // Surrogate Pair
            const c2 = bytes[pos++];
            const c3 = bytes[pos++];
            const c4 = bytes[pos++];
            const u = (((c1 & 7) << 18) | ((c2 & 63) << 12) | ((c3 & 63) << 6) | (c4 & 63)) -
                0x10000;
            out[c++] = String.fromCharCode(0xd800 + (u >> 10));
            out[c++] = String.fromCharCode(0xdc00 + (u & 1023));
        }
        else {
            const c2 = bytes[pos++];
            const c3 = bytes[pos++];
            out[c++] = String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
        }
    }
    return out.join('');
};
// We define it as an object literal instead of a class because a class compiled down to es5 can't
// be treeshaked. https://github.com/rollup/rollup/issues/1691
// Static lookup maps, lazily populated by init_()
const base64 = {
    /**
     * Maps bytes to characters.
     */
    byteToCharMap_: null,
    /**
     * Maps characters to bytes.
     */
    charToByteMap_: null,
    /**
     * Maps bytes to websafe characters.
     * @private
     */
    byteToCharMapWebSafe_: null,
    /**
     * Maps websafe characters to bytes.
     * @private
     */
    charToByteMapWebSafe_: null,
    /**
     * Our default alphabet, shared between
     * ENCODED_VALS and ENCODED_VALS_WEBSAFE
     */
    ENCODED_VALS_BASE: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 'abcdefghijklmnopqrstuvwxyz' + '0123456789',
    /**
     * Our default alphabet. Value 64 (=) is special; it means "nothing."
     */
    get ENCODED_VALS() {
        return this.ENCODED_VALS_BASE + '+/=';
    },
    /**
     * Our websafe alphabet.
     */
    get ENCODED_VALS_WEBSAFE() {
        return this.ENCODED_VALS_BASE + '-_.';
    },
    /**
     * Whether this browser supports the atob and btoa functions. This extension
     * started at Mozilla but is now implemented by many browsers. We use the
     * ASSUME_* variables to avoid pulling in the full useragent detection library
     * but still allowing the standard per-browser compilations.
     *
     */
    HAS_NATIVE_SUPPORT: typeof atob === 'function',
    /**
     * Base64-encode an array of bytes.
     *
     * @param input An array of bytes (numbers with
     *     value in [0, 255]) to encode.
     * @param webSafe Boolean indicating we should use the
     *     alternative alphabet.
     * @return The base64 encoded string.
     */
    encodeByteArray(input, webSafe) {
        if (!Array.isArray(input)) {
            throw Error('encodeByteArray takes an array as a parameter');
        }
        this.init_();
        const byteToCharMap = webSafe
            ? this.byteToCharMapWebSafe_
            : this.byteToCharMap_;
        const output = [];
        for (let i = 0; i < input.length; i += 3) {
            const byte1 = input[i];
            const haveByte2 = i + 1 < input.length;
            const byte2 = haveByte2 ? input[i + 1] : 0;
            const haveByte3 = i + 2 < input.length;
            const byte3 = haveByte3 ? input[i + 2] : 0;
            const outByte1 = byte1 >> 2;
            const outByte2 = ((byte1 & 0x03) << 4) | (byte2 >> 4);
            let outByte3 = ((byte2 & 0x0f) << 2) | (byte3 >> 6);
            let outByte4 = byte3 & 0x3f;
            if (!haveByte3) {
                outByte4 = 64;
                if (!haveByte2) {
                    outByte3 = 64;
                }
            }
            output.push(byteToCharMap[outByte1], byteToCharMap[outByte2], byteToCharMap[outByte3], byteToCharMap[outByte4]);
        }
        return output.join('');
    },
    /**
     * Base64-encode a string.
     *
     * @param input A string to encode.
     * @param webSafe If true, we should use the
     *     alternative alphabet.
     * @return The base64 encoded string.
     */
    encodeString(input, webSafe) {
        // Shortcut for Mozilla browsers that implement
        // a native base64 encoder in the form of "btoa/atob"
        if (this.HAS_NATIVE_SUPPORT && !webSafe) {
            return btoa(input);
        }
        return this.encodeByteArray(stringToByteArray$1(input), webSafe);
    },
    /**
     * Base64-decode a string.
     *
     * @param input to decode.
     * @param webSafe True if we should use the
     *     alternative alphabet.
     * @return string representing the decoded value.
     */
    decodeString(input, webSafe) {
        // Shortcut for Mozilla browsers that implement
        // a native base64 encoder in the form of "btoa/atob"
        if (this.HAS_NATIVE_SUPPORT && !webSafe) {
            return atob(input);
        }
        return byteArrayToString(this.decodeStringToByteArray(input, webSafe));
    },
    /**
     * Base64-decode a string.
     *
     * In base-64 decoding, groups of four characters are converted into three
     * bytes.  If the encoder did not apply padding, the input length may not
     * be a multiple of 4.
     *
     * In this case, the last group will have fewer than 4 characters, and
     * padding will be inferred.  If the group has one or two characters, it decodes
     * to one byte.  If the group has three characters, it decodes to two bytes.
     *
     * @param input Input to decode.
     * @param webSafe True if we should use the web-safe alphabet.
     * @return bytes representing the decoded value.
     */
    decodeStringToByteArray(input, webSafe) {
        this.init_();
        const charToByteMap = webSafe
            ? this.charToByteMapWebSafe_
            : this.charToByteMap_;
        const output = [];
        for (let i = 0; i < input.length;) {
            const byte1 = charToByteMap[input.charAt(i++)];
            const haveByte2 = i < input.length;
            const byte2 = haveByte2 ? charToByteMap[input.charAt(i)] : 0;
            ++i;
            const haveByte3 = i < input.length;
            const byte3 = haveByte3 ? charToByteMap[input.charAt(i)] : 64;
            ++i;
            const haveByte4 = i < input.length;
            const byte4 = haveByte4 ? charToByteMap[input.charAt(i)] : 64;
            ++i;
            if (byte1 == null || byte2 == null || byte3 == null || byte4 == null) {
                throw new DecodeBase64StringError();
            }
            const outByte1 = (byte1 << 2) | (byte2 >> 4);
            output.push(outByte1);
            if (byte3 !== 64) {
                const outByte2 = ((byte2 << 4) & 0xf0) | (byte3 >> 2);
                output.push(outByte2);
                if (byte4 !== 64) {
                    const outByte3 = ((byte3 << 6) & 0xc0) | byte4;
                    output.push(outByte3);
                }
            }
        }
        return output;
    },
    /**
     * Lazy static initialization function. Called before
     * accessing any of the static map variables.
     * @private
     */
    init_() {
        if (!this.byteToCharMap_) {
            this.byteToCharMap_ = {};
            this.charToByteMap_ = {};
            this.byteToCharMapWebSafe_ = {};
            this.charToByteMapWebSafe_ = {};
            // We want quick mappings back and forth, so we precompute two maps.
            for (let i = 0; i < this.ENCODED_VALS.length; i++) {
                this.byteToCharMap_[i] = this.ENCODED_VALS.charAt(i);
                this.charToByteMap_[this.byteToCharMap_[i]] = i;
                this.byteToCharMapWebSafe_[i] = this.ENCODED_VALS_WEBSAFE.charAt(i);
                this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[i]] = i;
                // Be forgiving when decoding and correctly decode both encodings.
                if (i >= this.ENCODED_VALS_BASE.length) {
                    this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(i)] = i;
                    this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(i)] = i;
                }
            }
        }
    }
};
/**
 * An error encountered while decoding base64 string.
 */
class DecodeBase64StringError extends Error {
    constructor() {
        super(...arguments);
        this.name = 'DecodeBase64StringError';
    }
}
/**
 * URL-safe base64 encoding
 */
const base64Encode = function (str) {
    const utf8Bytes = stringToByteArray$1(str);
    return base64.encodeByteArray(utf8Bytes, true);
};
/**
 * URL-safe base64 encoding (without "." padding in the end).
 * e.g. Used in JSON Web Token (JWT) parts.
 */
const base64urlEncodeWithoutPadding = function (str) {
    // Use base64url encoding and remove padding in the end (dot characters).
    return base64Encode(str).replace(/\./g, '');
};
/**
 * URL-safe base64 decoding
 *
 * NOTE: DO NOT use the global atob() function - it does NOT support the
 * base64Url variant encoding.
 *
 * @param str To be decoded
 * @return Decoded result, if possible
 */
const base64Decode = function (str) {
    try {
        return base64.decodeString(str, true);
    }
    catch (e) {
        console.error('base64Decode failed: ', e);
    }
    return null;
};

/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Do a deep-copy of basic JavaScript Objects or Arrays.
 */
function deepCopy(value) {
    return deepExtend(undefined, value);
}
/**
 * Copy properties from source to target (recursively allows extension
 * of Objects and Arrays).  Scalar values in the target are over-written.
 * If target is undefined, an object of the appropriate type will be created
 * (and returned).
 *
 * We recursively copy all child properties of plain Objects in the source- so
 * that namespace- like dictionaries are merged.
 *
 * Note that the target can be a function, in which case the properties in
 * the source Object are copied onto it as static properties of the Function.
 *
 * Note: we don't merge __proto__ to prevent prototype pollution
 */
function deepExtend(target, source) {
    if (!(source instanceof Object)) {
        return source;
    }
    switch (source.constructor) {
        case Date:
            // Treat Dates like scalars; if the target date object had any child
            // properties - they will be lost!
            const dateValue = source;
            return new Date(dateValue.getTime());
        case Object:
            if (target === undefined) {
                target = {};
            }
            break;
        case Array:
            // Always copy the array source and overwrite the target.
            target = [];
            break;
        default:
            // Not a plain Object - treat it as a scalar.
            return source;
    }
    for (const prop in source) {
        // use isValidKey to guard against prototype pollution. See https://snyk.io/vuln/SNYK-JS-LODASH-450202
        if (!source.hasOwnProperty(prop) || !isValidKey(prop)) {
            continue;
        }
        target[prop] = deepExtend(target[prop], source[prop]);
    }
    return target;
}
function isValidKey(key) {
    return key !== '__proto__';
}

/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Polyfill for `globalThis` object.
 * @returns the `globalThis` object for the given environment.
 * @public
 */
function getGlobal() {
    if (typeof self !== 'undefined') {
        return self;
    }
    if (typeof window !== 'undefined') {
        return window;
    }
    if (typeof global !== 'undefined') {
        return global;
    }
    throw new Error('Unable to locate global object.');
}

/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const getDefaultsFromGlobal = () => getGlobal().__FIREBASE_DEFAULTS__;
/**
 * Attempt to read defaults from a JSON string provided to
 * process(.)env(.)__FIREBASE_DEFAULTS__ or a JSON file whose path is in
 * process(.)env(.)__FIREBASE_DEFAULTS_PATH__
 * The dots are in parens because certain compilers (Vite?) cannot
 * handle seeing that variable in comments.
 * See https://github.com/firebase/firebase-js-sdk/issues/6838
 */
const getDefaultsFromEnvVariable = () => {
    if (typeof process === 'undefined' || typeof process.env === 'undefined') {
        return;
    }
    const defaultsJsonString = process.env.__FIREBASE_DEFAULTS__;
    if (defaultsJsonString) {
        return JSON.parse(defaultsJsonString);
    }
};
const getDefaultsFromCookie = () => {
    if (typeof document === 'undefined') {
        return;
    }
    let match;
    try {
        match = document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/);
    }
    catch (e) {
        // Some environments such as Angular Universal SSR have a
        // `document` object but error on accessing `document.cookie`.
        return;
    }
    const decoded = match && base64Decode(match[1]);
    return decoded && JSON.parse(decoded);
};
/**
 * Get the __FIREBASE_DEFAULTS__ object. It checks in order:
 * (1) if such an object exists as a property of `globalThis`
 * (2) if such an object was provided on a shell environment variable
 * (3) if such an object exists in a cookie
 * @public
 */
const getDefaults = () => {
    try {
        return (getDefaultsFromGlobal() ||
            getDefaultsFromEnvVariable() ||
            getDefaultsFromCookie());
    }
    catch (e) {
        /**
         * Catch-all for being unable to get __FIREBASE_DEFAULTS__ due
         * to any environment case we have not accounted for. Log to
         * info instead of swallowing so we can find these unknown cases
         * and add paths for them if needed.
         */
        console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${e}`);
        return;
    }
};
/**
 * Returns emulator host stored in the __FIREBASE_DEFAULTS__ object
 * for the given product.
 * @returns a URL host formatted like `127.0.0.1:9999` or `[::1]:4000` if available
 * @public
 */
const getDefaultEmulatorHost = (productName) => { var _a, _b; return (_b = (_a = getDefaults()) === null || _a === void 0 ? void 0 : _a.emulatorHosts) === null || _b === void 0 ? void 0 : _b[productName]; };
/**
 * Returns emulator hostname and port stored in the __FIREBASE_DEFAULTS__ object
 * for the given product.
 * @returns a pair of hostname and port like `["::1", 4000]` if available
 * @public
 */
const getDefaultEmulatorHostnameAndPort = (productName) => {
    const host = getDefaultEmulatorHost(productName);
    if (!host) {
        return undefined;
    }
    const separatorIndex = host.lastIndexOf(':'); // Finding the last since IPv6 addr also has colons.
    if (separatorIndex <= 0 || separatorIndex + 1 === host.length) {
        throw new Error(`Invalid host ${host} with no separate hostname and port!`);
    }
    // eslint-disable-next-line no-restricted-globals
    const port = parseInt(host.substring(separatorIndex + 1), 10);
    if (host[0] === '[') {
        // Bracket-quoted `[ipv6addr]:port` => return "ipv6addr" (without brackets).
        return [host.substring(1, separatorIndex - 1), port];
    }
    else {
        return [host.substring(0, separatorIndex), port];
    }
};
/**
 * Returns Firebase app config stored in the __FIREBASE_DEFAULTS__ object.
 * @public
 */
const getDefaultAppConfig = () => { var _a; return (_a = getDefaults()) === null || _a === void 0 ? void 0 : _a.config; };
/**
 * Returns an experimental setting on the __FIREBASE_DEFAULTS__ object (properties
 * prefixed by "_")
 * @public
 */
const getExperimentalSetting = (name) => { var _a; return (_a = getDefaults()) === null || _a === void 0 ? void 0 : _a[`_${name}`]; };

/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class Deferred {
    constructor() {
        this.reject = () => { };
        this.resolve = () => { };
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
    /**
     * Our API internals are not promiseified and cannot because our callback APIs have subtle expectations around
     * invoking promises inline, which Promises are forbidden to do. This method accepts an optional node-style callback
     * and returns a node-style callback which will resolve or reject the Deferred's promise.
     */
    wrapCallback(callback) {
        return (error, value) => {
            if (error) {
                this.reject(error);
            }
            else {
                this.resolve(value);
            }
            if (typeof callback === 'function') {
                // Attaching noop handler just in case developer wasn't expecting
                // promises
                this.promise.catch(() => { });
                // Some of our callbacks don't expect a value and our own tests
                // assert that the parameter length is 1
                if (callback.length === 1) {
                    callback(error);
                }
                else {
                    callback(error, value);
                }
            }
        };
    }
}

/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function createMockUserToken(token, projectId) {
    if (token.uid) {
        throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');
    }
    // Unsecured JWTs use "none" as the algorithm.
    const header = {
        alg: 'none',
        type: 'JWT'
    };
    const project = projectId || 'demo-project';
    const iat = token.iat || 0;
    const sub = token.sub || token.user_id;
    if (!sub) {
        throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");
    }
    const payload = Object.assign({ 
        // Set all required fields to decent defaults
        iss: `https://securetoken.google.com/${project}`, aud: project, iat, exp: iat + 3600, auth_time: iat, sub, user_id: sub, firebase: {
            sign_in_provider: 'custom',
            identities: {}
        } }, token);
    // Unsecured JWTs use the empty string as a signature.
    const signature = '';
    return [
        base64urlEncodeWithoutPadding(JSON.stringify(header)),
        base64urlEncodeWithoutPadding(JSON.stringify(payload)),
        signature
    ].join('.');
}

/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Returns navigator.userAgent string or '' if it's not defined.
 * @return user agent string
 */
function getUA() {
    if (typeof navigator !== 'undefined' &&
        typeof navigator['userAgent'] === 'string') {
        return navigator['userAgent'];
    }
    else {
        return '';
    }
}
/**
 * Detect Cordova / PhoneGap / Ionic frameworks on a mobile device.
 *
 * Deliberately does not rely on checking `file://` URLs (as this fails PhoneGap
 * in the Ripple emulator) nor Cordova `onDeviceReady`, which would normally
 * wait for a callback.
 */
function isMobileCordova() {
    return (typeof window !== 'undefined' &&
        // @ts-ignore Setting up an broadly applicable index signature for Window
        // just to deal with this case would probably be a bad idea.
        !!(window['cordova'] || window['phonegap'] || window['PhoneGap']) &&
        /ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(getUA()));
}
/**
 * Detect Node.js.
 *
 * @return true if Node.js environment is detected or specified.
 */
// Node detection logic from: https://github.com/iliakan/detect-node/
function isNode() {
    var _a;
    const forceEnvironment = (_a = getDefaults()) === null || _a === void 0 ? void 0 : _a.forceEnvironment;
    if (forceEnvironment === 'node') {
        return true;
    }
    else if (forceEnvironment === 'browser') {
        return false;
    }
    try {
        return (Object.prototype.toString.call(global.process) === '[object process]');
    }
    catch (e) {
        return false;
    }
}
/**
 * Detect Browser Environment
 */
function isBrowser() {
    return typeof self === 'object' && self.self === self;
}
function isBrowserExtension() {
    const runtime = typeof chrome === 'object'
        ? chrome.runtime
        : typeof browser === 'object'
            ? browser.runtime
            : undefined;
    return typeof runtime === 'object' && runtime.id !== undefined;
}
/**
 * Detect React Native.
 *
 * @return true if ReactNative environment is detected.
 */
function isReactNative() {
    return (typeof navigator === 'object' && navigator['product'] === 'ReactNative');
}
/** Detects Electron apps. */
function isElectron() {
    return getUA().indexOf('Electron/') >= 0;
}
/** Detects Internet Explorer. */
function isIE() {
    const ua = getUA();
    return ua.indexOf('MSIE ') >= 0 || ua.indexOf('Trident/') >= 0;
}
/** Detects Universal Windows Platform apps. */
function isUWP() {
    return getUA().indexOf('MSAppHost/') >= 0;
}
/**
 * Detect whether the current SDK build is the Node version.
 *
 * @return true if it's the Node SDK build.
 */
function isNodeSdk() {
    return CONSTANTS.NODE_CLIENT === true || CONSTANTS.NODE_ADMIN === true;
}
/** Returns true if we are running in Safari. */
function isSafari() {
    return (!isNode() &&
        navigator.userAgent.includes('Safari') &&
        !navigator.userAgent.includes('Chrome'));
}
/**
 * This method checks if indexedDB is supported by current browser/service worker context
 * @return true if indexedDB is supported by current browser/service worker context
 */
function isIndexedDBAvailable() {
    try {
        return typeof indexedDB === 'object';
    }
    catch (e) {
        return false;
    }
}
/**
 * This method validates browser/sw context for indexedDB by opening a dummy indexedDB database and reject
 * if errors occur during the database open operation.
 *
 * @throws exception if current browser/sw context can't run idb.open (ex: Safari iframe, Firefox
 * private browsing)
 */
function validateIndexedDBOpenable() {
    return new Promise((resolve, reject) => {
        try {
            let preExist = true;
            const DB_CHECK_NAME = 'validate-browser-context-for-indexeddb-analytics-module';
            const request = self.indexedDB.open(DB_CHECK_NAME);
            request.onsuccess = () => {
                request.result.close();
                // delete database only when it doesn't pre-exist
                if (!preExist) {
                    self.indexedDB.deleteDatabase(DB_CHECK_NAME);
                }
                resolve(true);
            };
            request.onupgradeneeded = () => {
                preExist = false;
            };
            request.onerror = () => {
                var _a;
                reject(((_a = request.error) === null || _a === void 0 ? void 0 : _a.message) || '');
            };
        }
        catch (error) {
            reject(error);
        }
    });
}
/**
 *
 * This method checks whether cookie is enabled within current browser
 * @return true if cookie is enabled within current browser
 */
function areCookiesEnabled() {
    if (typeof navigator === 'undefined' || !navigator.cookieEnabled) {
        return false;
    }
    return true;
}

/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @fileoverview Standardized Firebase Error.
 *
 * Usage:
 *
 *   // Typescript string literals for type-safe codes
 *   type Err =
 *     'unknown' |
 *     'object-not-found'
 *     ;
 *
 *   // Closure enum for type-safe error codes
 *   // at-enum {string}
 *   var Err = {
 *     UNKNOWN: 'unknown',
 *     OBJECT_NOT_FOUND: 'object-not-found',
 *   }
 *
 *   let errors: Map<Err, string> = {
 *     'generic-error': "Unknown error",
 *     'file-not-found': "Could not find file: {$file}",
 *   };
 *
 *   // Type-safe function - must pass a valid error code as param.
 *   let error = new ErrorFactory<Err>('service', 'Service', errors);
 *
 *   ...
 *   throw error.create(Err.GENERIC);
 *   ...
 *   throw error.create(Err.FILE_NOT_FOUND, {'file': fileName});
 *   ...
 *   // Service: Could not file file: foo.txt (service/file-not-found).
 *
 *   catch (e) {
 *     assert(e.message === "Could not find file: foo.txt.");
 *     if ((e as FirebaseError)?.code === 'service/file-not-found') {
 *       console.log("Could not read file: " + e['file']);
 *     }
 *   }
 */
const ERROR_NAME = 'FirebaseError';
// Based on code from:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#Custom_Error_Types
class FirebaseError extends Error {
    constructor(
    /** The error code for this error. */
    code, message, 
    /** Custom data for this error. */
    customData) {
        super(message);
        this.code = code;
        this.customData = customData;
        /** The custom name for all FirebaseErrors. */
        this.name = ERROR_NAME;
        // Fix For ES5
        // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
        Object.setPrototypeOf(this, FirebaseError.prototype);
        // Maintains proper stack trace for where our error was thrown.
        // Only available on V8.
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ErrorFactory.prototype.create);
        }
    }
}
class ErrorFactory {
    constructor(service, serviceName, errors) {
        this.service = service;
        this.serviceName = serviceName;
        this.errors = errors;
    }
    create(code, ...data) {
        const customData = data[0] || {};
        const fullCode = `${this.service}/${code}`;
        const template = this.errors[code];
        const message = template ? replaceTemplate(template, customData) : 'Error';
        // Service Name: Error message (service/code).
        const fullMessage = `${this.serviceName}: ${message} (${fullCode}).`;
        const error = new FirebaseError(fullCode, fullMessage, customData);
        return error;
    }
}
function replaceTemplate(template, data) {
    return template.replace(PATTERN, (_, key) => {
        const value = data[key];
        return value != null ? String(value) : `<${key}?>`;
    });
}
const PATTERN = /\{\$([^}]+)}/g;

/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Evaluates a JSON string into a javascript object.
 *
 * @param {string} str A string containing JSON.
 * @return {*} The javascript object representing the specified JSON.
 */
function jsonEval(str) {
    return JSON.parse(str);
}
/**
 * Returns JSON representing a javascript object.
 * @param {*} data Javascript object to be stringified.
 * @return {string} The JSON contents of the object.
 */
function stringify(data) {
    return JSON.stringify(data);
}

/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Decodes a Firebase auth. token into constituent parts.
 *
 * Notes:
 * - May return with invalid / incomplete claims if there's no native base64 decoding support.
 * - Doesn't check if the token is actually valid.
 */
const decode = function (token) {
    let header = {}, claims = {}, data = {}, signature = '';
    try {
        const parts = token.split('.');
        header = jsonEval(base64Decode(parts[0]) || '');
        claims = jsonEval(base64Decode(parts[1]) || '');
        signature = parts[2];
        data = claims['d'] || {};
        delete claims['d'];
    }
    catch (e) { }
    return {
        header,
        claims,
        data,
        signature
    };
};
/**
 * Decodes a Firebase auth. token and checks the validity of its time-based claims. Will return true if the
 * token is within the time window authorized by the 'nbf' (not-before) and 'iat' (issued-at) claims.
 *
 * Notes:
 * - May return a false negative if there's no native base64 decoding support.
 * - Doesn't check if the token is actually valid.
 */
const isValidTimestamp = function (token) {
    const claims = decode(token).claims;
    const now = Math.floor(new Date().getTime() / 1000);
    let validSince = 0, validUntil = 0;
    if (typeof claims === 'object') {
        if (claims.hasOwnProperty('nbf')) {
            validSince = claims['nbf'];
        }
        else if (claims.hasOwnProperty('iat')) {
            validSince = claims['iat'];
        }
        if (claims.hasOwnProperty('exp')) {
            validUntil = claims['exp'];
        }
        else {
            // token will expire after 24h by default
            validUntil = validSince + 86400;
        }
    }
    return (!!now &&
        !!validSince &&
        !!validUntil &&
        now >= validSince &&
        now <= validUntil);
};
/**
 * Decodes a Firebase auth. token and returns its issued at time if valid, null otherwise.
 *
 * Notes:
 * - May return null if there's no native base64 decoding support.
 * - Doesn't check if the token is actually valid.
 */
const issuedAtTime = function (token) {
    const claims = decode(token).claims;
    if (typeof claims === 'object' && claims.hasOwnProperty('iat')) {
        return claims['iat'];
    }
    return null;
};
/**
 * Decodes a Firebase auth. token and checks the validity of its format. Expects a valid issued-at time.
 *
 * Notes:
 * - May return a false negative if there's no native base64 decoding support.
 * - Doesn't check if the token is actually valid.
 */
const isValidFormat = function (token) {
    const decoded = decode(token), claims = decoded.claims;
    return !!claims && typeof claims === 'object' && claims.hasOwnProperty('iat');
};
/**
 * Attempts to peer into an auth token and determine if it's an admin auth token by looking at the claims portion.
 *
 * Notes:
 * - May return a false negative if there's no native base64 decoding support.
 * - Doesn't check if the token is actually valid.
 */
const isAdmin = function (token) {
    const claims = decode(token).claims;
    return typeof claims === 'object' && claims['admin'] === true;
};

/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function contains(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}
function safeGet(obj, key) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
        return obj[key];
    }
    else {
        return undefined;
    }
}
function isEmpty(obj) {
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            return false;
        }
    }
    return true;
}
function map(obj, fn, contextObj) {
    const res = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            res[key] = fn.call(contextObj, obj[key], key, obj);
        }
    }
    return res;
}
/**
 * Deep equal two objects. Support Arrays and Objects.
 */
function deepEqual(a, b) {
    if (a === b) {
        return true;
    }
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    for (const k of aKeys) {
        if (!bKeys.includes(k)) {
            return false;
        }
        const aProp = a[k];
        const bProp = b[k];
        if (isObject(aProp) && isObject(bProp)) {
            if (!deepEqual(aProp, bProp)) {
                return false;
            }
        }
        else if (aProp !== bProp) {
            return false;
        }
    }
    for (const k of bKeys) {
        if (!aKeys.includes(k)) {
            return false;
        }
    }
    return true;
}
function isObject(thing) {
    return thing !== null && typeof thing === 'object';
}

/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Rejects if the given promise doesn't resolve in timeInMS milliseconds.
 * @internal
 */
function promiseWithTimeout(promise, timeInMS = 2000) {
    const deferredPromise = new Deferred();
    setTimeout(() => deferredPromise.reject('timeout!'), timeInMS);
    promise.then(deferredPromise.resolve, deferredPromise.reject);
    return deferredPromise.promise;
}

/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Returns a querystring-formatted string (e.g. &arg=val&arg2=val2) from a
 * params object (e.g. {arg: 'val', arg2: 'val2'})
 * Note: You must prepend it with ? when adding it to a URL.
 */
function querystring(querystringParams) {
    const params = [];
    for (const [key, value] of Object.entries(querystringParams)) {
        if (Array.isArray(value)) {
            value.forEach(arrayVal => {
                params.push(encodeURIComponent(key) + '=' + encodeURIComponent(arrayVal));
            });
        }
        else {
            params.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
        }
    }
    return params.length ? '&' + params.join('&') : '';
}
/**
 * Decodes a querystring (e.g. ?arg=val&arg2=val2) into a params object
 * (e.g. {arg: 'val', arg2: 'val2'})
 */
function querystringDecode(querystring) {
    const obj = {};
    const tokens = querystring.replace(/^\?/, '').split('&');
    tokens.forEach(token => {
        if (token) {
            const [key, value] = token.split('=');
            obj[decodeURIComponent(key)] = decodeURIComponent(value);
        }
    });
    return obj;
}
/**
 * Extract the query string part of a URL, including the leading question mark (if present).
 */
function extractQuerystring(url) {
    const queryStart = url.indexOf('?');
    if (!queryStart) {
        return '';
    }
    const fragmentStart = url.indexOf('#', queryStart);
    return url.substring(queryStart, fragmentStart > 0 ? fragmentStart : undefined);
}

/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @fileoverview SHA-1 cryptographic hash.
 * Variable names follow the notation in FIPS PUB 180-3:
 * http://csrc.nist.gov/publications/fips/fips180-3/fips180-3_final.pdf.
 *
 * Usage:
 *   var sha1 = new sha1();
 *   sha1.update(bytes);
 *   var hash = sha1.digest();
 *
 * Performance:
 *   Chrome 23:   ~400 Mbit/s
 *   Firefox 16:  ~250 Mbit/s
 *
 */
/**
 * SHA-1 cryptographic hash constructor.
 *
 * The properties declared here are discussed in the above algorithm document.
 * @constructor
 * @final
 * @struct
 */
class Sha1 {
    constructor() {
        /**
         * Holds the previous values of accumulated variables a-e in the compress_
         * function.
         * @private
         */
        this.chain_ = [];
        /**
         * A buffer holding the partially computed hash result.
         * @private
         */
        this.buf_ = [];
        /**
         * An array of 80 bytes, each a part of the message to be hashed.  Referred to
         * as the message schedule in the docs.
         * @private
         */
        this.W_ = [];
        /**
         * Contains data needed to pad messages less than 64 bytes.
         * @private
         */
        this.pad_ = [];
        /**
         * @private {number}
         */
        this.inbuf_ = 0;
        /**
         * @private {number}
         */
        this.total_ = 0;
        this.blockSize = 512 / 8;
        this.pad_[0] = 128;
        for (let i = 1; i < this.blockSize; ++i) {
            this.pad_[i] = 0;
        }
        this.reset();
    }
    reset() {
        this.chain_[0] = 0x67452301;
        this.chain_[1] = 0xefcdab89;
        this.chain_[2] = 0x98badcfe;
        this.chain_[3] = 0x10325476;
        this.chain_[4] = 0xc3d2e1f0;
        this.inbuf_ = 0;
        this.total_ = 0;
    }
    /**
     * Internal compress helper function.
     * @param buf Block to compress.
     * @param offset Offset of the block in the buffer.
     * @private
     */
    compress_(buf, offset) {
        if (!offset) {
            offset = 0;
        }
        const W = this.W_;
        // get 16 big endian words
        if (typeof buf === 'string') {
            for (let i = 0; i < 16; i++) {
                // TODO(user): [bug 8140122] Recent versions of Safari for Mac OS and iOS
                // have a bug that turns the post-increment ++ operator into pre-increment
                // during JIT compilation.  We have code that depends heavily on SHA-1 for
                // correctness and which is affected by this bug, so I've removed all uses
                // of post-increment ++ in which the result value is used.  We can revert
                // this change once the Safari bug
                // (https://bugs.webkit.org/show_bug.cgi?id=109036) has been fixed and
                // most clients have been updated.
                W[i] =
                    (buf.charCodeAt(offset) << 24) |
                        (buf.charCodeAt(offset + 1) << 16) |
                        (buf.charCodeAt(offset + 2) << 8) |
                        buf.charCodeAt(offset + 3);
                offset += 4;
            }
        }
        else {
            for (let i = 0; i < 16; i++) {
                W[i] =
                    (buf[offset] << 24) |
                        (buf[offset + 1] << 16) |
                        (buf[offset + 2] << 8) |
                        buf[offset + 3];
                offset += 4;
            }
        }
        // expand to 80 words
        for (let i = 16; i < 80; i++) {
            const t = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16];
            W[i] = ((t << 1) | (t >>> 31)) & 0xffffffff;
        }
        let a = this.chain_[0];
        let b = this.chain_[1];
        let c = this.chain_[2];
        let d = this.chain_[3];
        let e = this.chain_[4];
        let f, k;
        // TODO(user): Try to unroll this loop to speed up the computation.
        for (let i = 0; i < 80; i++) {
            if (i < 40) {
                if (i < 20) {
                    f = d ^ (b & (c ^ d));
                    k = 0x5a827999;
                }
                else {
                    f = b ^ c ^ d;
                    k = 0x6ed9eba1;
                }
            }
            else {
                if (i < 60) {
                    f = (b & c) | (d & (b | c));
                    k = 0x8f1bbcdc;
                }
                else {
                    f = b ^ c ^ d;
                    k = 0xca62c1d6;
                }
            }
            const t = (((a << 5) | (a >>> 27)) + f + e + k + W[i]) & 0xffffffff;
            e = d;
            d = c;
            c = ((b << 30) | (b >>> 2)) & 0xffffffff;
            b = a;
            a = t;
        }
        this.chain_[0] = (this.chain_[0] + a) & 0xffffffff;
        this.chain_[1] = (this.chain_[1] + b) & 0xffffffff;
        this.chain_[2] = (this.chain_[2] + c) & 0xffffffff;
        this.chain_[3] = (this.chain_[3] + d) & 0xffffffff;
        this.chain_[4] = (this.chain_[4] + e) & 0xffffffff;
    }
    update(bytes, length) {
        // TODO(johnlenz): tighten the function signature and remove this check
        if (bytes == null) {
            return;
        }
        if (length === undefined) {
            length = bytes.length;
        }
        const lengthMinusBlock = length - this.blockSize;
        let n = 0;
        // Using local instead of member variables gives ~5% speedup on Firefox 16.
        const buf = this.buf_;
        let inbuf = this.inbuf_;
        // The outer while loop should execute at most twice.
        while (n < length) {
            // When we have no data in the block to top up, we can directly process the
            // input buffer (assuming it contains sufficient data). This gives ~25%
            // speedup on Chrome 23 and ~15% speedup on Firefox 16, but requires that
            // the data is provided in large chunks (or in multiples of 64 bytes).
            if (inbuf === 0) {
                while (n <= lengthMinusBlock) {
                    this.compress_(bytes, n);
                    n += this.blockSize;
                }
            }
            if (typeof bytes === 'string') {
                while (n < length) {
                    buf[inbuf] = bytes.charCodeAt(n);
                    ++inbuf;
                    ++n;
                    if (inbuf === this.blockSize) {
                        this.compress_(buf);
                        inbuf = 0;
                        // Jump to the outer loop so we use the full-block optimization.
                        break;
                    }
                }
            }
            else {
                while (n < length) {
                    buf[inbuf] = bytes[n];
                    ++inbuf;
                    ++n;
                    if (inbuf === this.blockSize) {
                        this.compress_(buf);
                        inbuf = 0;
                        // Jump to the outer loop so we use the full-block optimization.
                        break;
                    }
                }
            }
        }
        this.inbuf_ = inbuf;
        this.total_ += length;
    }
    /** @override */
    digest() {
        const digest = [];
        let totalBits = this.total_ * 8;
        // Add pad 0x80 0x00*.
        if (this.inbuf_ < 56) {
            this.update(this.pad_, 56 - this.inbuf_);
        }
        else {
            this.update(this.pad_, this.blockSize - (this.inbuf_ - 56));
        }
        // Add # bits.
        for (let i = this.blockSize - 1; i >= 56; i--) {
            this.buf_[i] = totalBits & 255;
            totalBits /= 256; // Don't use bit-shifting here!
        }
        this.compress_(this.buf_);
        let n = 0;
        for (let i = 0; i < 5; i++) {
            for (let j = 24; j >= 0; j -= 8) {
                digest[n] = (this.chain_[i] >> j) & 255;
                ++n;
            }
        }
        return digest;
    }
}

/**
 * Helper to make a Subscribe function (just like Promise helps make a
 * Thenable).
 *
 * @param executor Function which can make calls to a single Observer
 *     as a proxy.
 * @param onNoObservers Callback when count of Observers goes to zero.
 */
function createSubscribe(executor, onNoObservers) {
    const proxy = new ObserverProxy(executor, onNoObservers);
    return proxy.subscribe.bind(proxy);
}
/**
 * Implement fan-out for any number of Observers attached via a subscribe
 * function.
 */
class ObserverProxy {
    /**
     * @param executor Function which can make calls to a single Observer
     *     as a proxy.
     * @param onNoObservers Callback when count of Observers goes to zero.
     */
    constructor(executor, onNoObservers) {
        this.observers = [];
        this.unsubscribes = [];
        this.observerCount = 0;
        // Micro-task scheduling by calling task.then().
        this.task = Promise.resolve();
        this.finalized = false;
        this.onNoObservers = onNoObservers;
        // Call the executor asynchronously so subscribers that are called
        // synchronously after the creation of the subscribe function
        // can still receive the very first value generated in the executor.
        this.task
            .then(() => {
            executor(this);
        })
            .catch(e => {
            this.error(e);
        });
    }
    next(value) {
        this.forEachObserver((observer) => {
            observer.next(value);
        });
    }
    error(error) {
        this.forEachObserver((observer) => {
            observer.error(error);
        });
        this.close(error);
    }
    complete() {
        this.forEachObserver((observer) => {
            observer.complete();
        });
        this.close();
    }
    /**
     * Subscribe function that can be used to add an Observer to the fan-out list.
     *
     * - We require that no event is sent to a subscriber sychronously to their
     *   call to subscribe().
     */
    subscribe(nextOrObserver, error, complete) {
        let observer;
        if (nextOrObserver === undefined &&
            error === undefined &&
            complete === undefined) {
            throw new Error('Missing Observer.');
        }
        // Assemble an Observer object when passed as callback functions.
        if (implementsAnyMethods(nextOrObserver, [
            'next',
            'error',
            'complete'
        ])) {
            observer = nextOrObserver;
        }
        else {
            observer = {
                next: nextOrObserver,
                error,
                complete
            };
        }
        if (observer.next === undefined) {
            observer.next = noop;
        }
        if (observer.error === undefined) {
            observer.error = noop;
        }
        if (observer.complete === undefined) {
            observer.complete = noop;
        }
        const unsub = this.unsubscribeOne.bind(this, this.observers.length);
        // Attempt to subscribe to a terminated Observable - we
        // just respond to the Observer with the final error or complete
        // event.
        if (this.finalized) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.task.then(() => {
                try {
                    if (this.finalError) {
                        observer.error(this.finalError);
                    }
                    else {
                        observer.complete();
                    }
                }
                catch (e) {
                    // nothing
                }
                return;
            });
        }
        this.observers.push(observer);
        return unsub;
    }
    // Unsubscribe is synchronous - we guarantee that no events are sent to
    // any unsubscribed Observer.
    unsubscribeOne(i) {
        if (this.observers === undefined || this.observers[i] === undefined) {
            return;
        }
        delete this.observers[i];
        this.observerCount -= 1;
        if (this.observerCount === 0 && this.onNoObservers !== undefined) {
            this.onNoObservers(this);
        }
    }
    forEachObserver(fn) {
        if (this.finalized) {
            // Already closed by previous event....just eat the additional values.
            return;
        }
        // Since sendOne calls asynchronously - there is no chance that
        // this.observers will become undefined.
        for (let i = 0; i < this.observers.length; i++) {
            this.sendOne(i, fn);
        }
    }
    // Call the Observer via one of it's callback function. We are careful to
    // confirm that the observe has not been unsubscribed since this asynchronous
    // function had been queued.
    sendOne(i, fn) {
        // Execute the callback asynchronously
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.task.then(() => {
            if (this.observers !== undefined && this.observers[i] !== undefined) {
                try {
                    fn(this.observers[i]);
                }
                catch (e) {
                    // Ignore exceptions raised in Observers or missing methods of an
                    // Observer.
                    // Log error to console. b/31404806
                    if (typeof console !== 'undefined' && console.error) {
                        console.error(e);
                    }
                }
            }
        });
    }
    close(err) {
        if (this.finalized) {
            return;
        }
        this.finalized = true;
        if (err !== undefined) {
            this.finalError = err;
        }
        // Proxy is no longer needed - garbage collect references
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.task.then(() => {
            this.observers = undefined;
            this.onNoObservers = undefined;
        });
    }
}
/** Turn synchronous function into one called asynchronously. */
// eslint-disable-next-line @typescript-eslint/ban-types
function async(fn, onError) {
    return (...args) => {
        Promise.resolve(true)
            .then(() => {
            fn(...args);
        })
            .catch((error) => {
            if (onError) {
                onError(error);
            }
        });
    };
}
/**
 * Return true if the object passed in implements any of the named methods.
 */
function implementsAnyMethods(obj, methods) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    for (const method of methods) {
        if (method in obj && typeof obj[method] === 'function') {
            return true;
        }
    }
    return false;
}
function noop() {
    // do nothing
}

/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Check to make sure the appropriate number of arguments are provided for a public function.
 * Throws an error if it fails.
 *
 * @param fnName The function name
 * @param minCount The minimum number of arguments to allow for the function call
 * @param maxCount The maximum number of argument to allow for the function call
 * @param argCount The actual number of arguments provided.
 */
const validateArgCount = function (fnName, minCount, maxCount, argCount) {
    let argError;
    if (argCount < minCount) {
        argError = 'at least ' + minCount;
    }
    else if (argCount > maxCount) {
        argError = maxCount === 0 ? 'none' : 'no more than ' + maxCount;
    }
    if (argError) {
        const error = fnName +
            ' failed: Was called with ' +
            argCount +
            (argCount === 1 ? ' argument.' : ' arguments.') +
            ' Expects ' +
            argError +
            '.';
        throw new Error(error);
    }
};
/**
 * Generates a string to prefix an error message about failed argument validation
 *
 * @param fnName The function name
 * @param argName The name of the argument
 * @return The prefix to add to the error thrown for validation.
 */
function errorPrefix(fnName, argName) {
    return `${fnName} failed: ${argName} argument `;
}
/**
 * @param fnName
 * @param argumentNumber
 * @param namespace
 * @param optional
 */
function validateNamespace(fnName, namespace, optional) {
    if (optional && !namespace) {
        return;
    }
    if (typeof namespace !== 'string') {
        //TODO: I should do more validation here. We only allow certain chars in namespaces.
        throw new Error(errorPrefix(fnName, 'namespace') + 'must be a valid firebase namespace.');
    }
}
function validateCallback(fnName, argumentName, 
// eslint-disable-next-line @typescript-eslint/ban-types
callback, optional) {
    if (optional && !callback) {
        return;
    }
    if (typeof callback !== 'function') {
        throw new Error(errorPrefix(fnName, argumentName) + 'must be a valid function.');
    }
}
function validateContextObject(fnName, argumentName, context, optional) {
    if (optional && !context) {
        return;
    }
    if (typeof context !== 'object' || context === null) {
        throw new Error(errorPrefix(fnName, argumentName) + 'must be a valid context object.');
    }
}

/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// Code originally came from goog.crypt.stringToUtf8ByteArray, but for some reason they
// automatically replaced '\r\n' with '\n', and they didn't handle surrogate pairs,
// so it's been modified.
// Note that not all Unicode characters appear as single characters in JavaScript strings.
// fromCharCode returns the UTF-16 encoding of a character - so some Unicode characters
// use 2 characters in Javascript.  All 4-byte UTF-8 characters begin with a first
// character in the range 0xD800 - 0xDBFF (the first character of a so-called surrogate
// pair).
// See http://www.ecma-international.org/ecma-262/5.1/#sec-15.1.3
/**
 * @param {string} str
 * @return {Array}
 */
const stringToByteArray = function (str) {
    const out = [];
    let p = 0;
    for (let i = 0; i < str.length; i++) {
        let c = str.charCodeAt(i);
        // Is this the lead surrogate in a surrogate pair?
        if (c >= 0xd800 && c <= 0xdbff) {
            const high = c - 0xd800; // the high 10 bits.
            i++;
            assert(i < str.length, 'Surrogate pair missing trail surrogate.');
            const low = str.charCodeAt(i) - 0xdc00; // the low 10 bits.
            c = 0x10000 + (high << 10) + low;
        }
        if (c < 128) {
            out[p++] = c;
        }
        else if (c < 2048) {
            out[p++] = (c >> 6) | 192;
            out[p++] = (c & 63) | 128;
        }
        else if (c < 65536) {
            out[p++] = (c >> 12) | 224;
            out[p++] = ((c >> 6) & 63) | 128;
            out[p++] = (c & 63) | 128;
        }
        else {
            out[p++] = (c >> 18) | 240;
            out[p++] = ((c >> 12) & 63) | 128;
            out[p++] = ((c >> 6) & 63) | 128;
            out[p++] = (c & 63) | 128;
        }
    }
    return out;
};
/**
 * Calculate length without actually converting; useful for doing cheaper validation.
 * @param {string} str
 * @return {number}
 */
const stringLength = function (str) {
    let p = 0;
    for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        if (c < 128) {
            p++;
        }
        else if (c < 2048) {
            p += 2;
        }
        else if (c >= 0xd800 && c <= 0xdbff) {
            // Lead surrogate of a surrogate pair.  The pair together will take 4 bytes to represent.
            p += 4;
            i++; // skip trail surrogate.
        }
        else {
            p += 3;
        }
    }
    return p;
};

/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Copied from https://stackoverflow.com/a/2117523
 * Generates a new uuid.
 * @public
 */
const uuidv4 = function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0, v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * The amount of milliseconds to exponentially increase.
 */
const DEFAULT_INTERVAL_MILLIS = 1000;
/**
 * The factor to backoff by.
 * Should be a number greater than 1.
 */
const DEFAULT_BACKOFF_FACTOR = 2;
/**
 * The maximum milliseconds to increase to.
 *
 * <p>Visible for testing
 */
const MAX_VALUE_MILLIS = 4 * 60 * 60 * 1000; // Four hours, like iOS and Android.
/**
 * The percentage of backoff time to randomize by.
 * See
 * http://go/safe-client-behavior#step-1-determine-the-appropriate-retry-interval-to-handle-spike-traffic
 * for context.
 *
 * <p>Visible for testing
 */
const RANDOM_FACTOR = 0.5;
/**
 * Based on the backoff method from
 * https://github.com/google/closure-library/blob/master/closure/goog/math/exponentialbackoff.js.
 * Extracted here so we don't need to pass metadata and a stateful ExponentialBackoff object around.
 */
function calculateBackoffMillis(backoffCount, intervalMillis = DEFAULT_INTERVAL_MILLIS, backoffFactor = DEFAULT_BACKOFF_FACTOR) {
    // Calculates an exponentially increasing value.
    // Deviation: calculates value from count and a constant interval, so we only need to save value
    // and count to restore state.
    const currBaseValue = intervalMillis * Math.pow(backoffFactor, backoffCount);
    // A random "fuzz" to avoid waves of retries.
    // Deviation: randomFactor is required.
    const randomWait = Math.round(
    // A fraction of the backoff value to add/subtract.
    // Deviation: changes multiplication order to improve readability.
    RANDOM_FACTOR *
        currBaseValue *
        // A random float (rounded to int by Math.round above) in the range [-1, 1]. Determines
        // if we add or subtract.
        (Math.random() - 0.5) *
        2);
    // Limits backoff to max to avoid effectively permanent backoff.
    return Math.min(MAX_VALUE_MILLIS, currBaseValue + randomWait);
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Provide English ordinal letters after a number
 */
function ordinal(i) {
    if (!Number.isFinite(i)) {
        return `${i}`;
    }
    return i + indicator(i);
}
function indicator(i) {
    i = Math.abs(i);
    const cent = i % 100;
    if (cent >= 10 && cent <= 20) {
        return 'th';
    }
    const dec = i % 10;
    if (dec === 1) {
        return 'st';
    }
    if (dec === 2) {
        return 'nd';
    }
    if (dec === 3) {
        return 'rd';
    }
    return 'th';
}

/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function getModularInstance(service) {
    if (service && service._delegate) {
        return service._delegate;
    }
    else {
        return service;
    }
}

/**
 * Component for service name T, e.g. `auth`, `auth-internal`
 */
class Component {
    /**
     *
     * @param name The public service name, e.g. app, auth, firestore, database
     * @param instanceFactory Service factory responsible for creating the public interface
     * @param type whether the service provided by the component is public or private
     */
    constructor(name, instanceFactory, type) {
        this.name = name;
        this.instanceFactory = instanceFactory;
        this.type = type;
        this.multipleInstances = false;
        /**
         * Properties to be added to the service namespace
         */
        this.serviceProps = {};
        this.instantiationMode = "LAZY" /* InstantiationMode.LAZY */;
        this.onInstanceCreated = null;
    }
    setInstantiationMode(mode) {
        this.instantiationMode = mode;
        return this;
    }
    setMultipleInstances(multipleInstances) {
        this.multipleInstances = multipleInstances;
        return this;
    }
    setServiceProps(props) {
        this.serviceProps = props;
        return this;
    }
    setInstanceCreatedCallback(callback) {
        this.onInstanceCreated = callback;
        return this;
    }
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const DEFAULT_ENTRY_NAME$1 = '[DEFAULT]';

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Provider for instance for service name T, e.g. 'auth', 'auth-internal'
 * NameServiceMapping[T] is an alias for the type of the instance
 */
class Provider {
    constructor(name, container) {
        this.name = name;
        this.container = container;
        this.component = null;
        this.instances = new Map();
        this.instancesDeferred = new Map();
        this.instancesOptions = new Map();
        this.onInitCallbacks = new Map();
    }
    /**
     * @param identifier A provider can provide mulitple instances of a service
     * if this.component.multipleInstances is true.
     */
    get(identifier) {
        // if multipleInstances is not supported, use the default name
        const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
        if (!this.instancesDeferred.has(normalizedIdentifier)) {
            const deferred = new Deferred();
            this.instancesDeferred.set(normalizedIdentifier, deferred);
            if (this.isInitialized(normalizedIdentifier) ||
                this.shouldAutoInitialize()) {
                // initialize the service if it can be auto-initialized
                try {
                    const instance = this.getOrInitializeService({
                        instanceIdentifier: normalizedIdentifier
                    });
                    if (instance) {
                        deferred.resolve(instance);
                    }
                }
                catch (e) {
                    // when the instance factory throws an exception during get(), it should not cause
                    // a fatal error. We just return the unresolved promise in this case.
                }
            }
        }
        return this.instancesDeferred.get(normalizedIdentifier).promise;
    }
    getImmediate(options) {
        var _a;
        // if multipleInstances is not supported, use the default name
        const normalizedIdentifier = this.normalizeInstanceIdentifier(options === null || options === void 0 ? void 0 : options.identifier);
        const optional = (_a = options === null || options === void 0 ? void 0 : options.optional) !== null && _a !== void 0 ? _a : false;
        if (this.isInitialized(normalizedIdentifier) ||
            this.shouldAutoInitialize()) {
            try {
                return this.getOrInitializeService({
                    instanceIdentifier: normalizedIdentifier
                });
            }
            catch (e) {
                if (optional) {
                    return null;
                }
                else {
                    throw e;
                }
            }
        }
        else {
            // In case a component is not initialized and should/can not be auto-initialized at the moment, return null if the optional flag is set, or throw
            if (optional) {
                return null;
            }
            else {
                throw Error(`Service ${this.name} is not available`);
            }
        }
    }
    getComponent() {
        return this.component;
    }
    setComponent(component) {
        if (component.name !== this.name) {
            throw Error(`Mismatching Component ${component.name} for Provider ${this.name}.`);
        }
        if (this.component) {
            throw Error(`Component for ${this.name} has already been provided`);
        }
        this.component = component;
        // return early without attempting to initialize the component if the component requires explicit initialization (calling `Provider.initialize()`)
        if (!this.shouldAutoInitialize()) {
            return;
        }
        // if the service is eager, initialize the default instance
        if (isComponentEager(component)) {
            try {
                this.getOrInitializeService({ instanceIdentifier: DEFAULT_ENTRY_NAME$1 });
            }
            catch (e) {
                // when the instance factory for an eager Component throws an exception during the eager
                // initialization, it should not cause a fatal error.
                // TODO: Investigate if we need to make it configurable, because some component may want to cause
                // a fatal error in this case?
            }
        }
        // Create service instances for the pending promises and resolve them
        // NOTE: if this.multipleInstances is false, only the default instance will be created
        // and all promises with resolve with it regardless of the identifier.
        for (const [instanceIdentifier, instanceDeferred] of this.instancesDeferred.entries()) {
            const normalizedIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
            try {
                // `getOrInitializeService()` should always return a valid instance since a component is guaranteed. use ! to make typescript happy.
                const instance = this.getOrInitializeService({
                    instanceIdentifier: normalizedIdentifier
                });
                instanceDeferred.resolve(instance);
            }
            catch (e) {
                // when the instance factory throws an exception, it should not cause
                // a fatal error. We just leave the promise unresolved.
            }
        }
    }
    clearInstance(identifier = DEFAULT_ENTRY_NAME$1) {
        this.instancesDeferred.delete(identifier);
        this.instancesOptions.delete(identifier);
        this.instances.delete(identifier);
    }
    // app.delete() will call this method on every provider to delete the services
    // TODO: should we mark the provider as deleted?
    async delete() {
        const services = Array.from(this.instances.values());
        await Promise.all([
            ...services
                .filter(service => 'INTERNAL' in service) // legacy services
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map(service => service.INTERNAL.delete()),
            ...services
                .filter(service => '_delete' in service) // modularized services
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map(service => service._delete())
        ]);
    }
    isComponentSet() {
        return this.component != null;
    }
    isInitialized(identifier = DEFAULT_ENTRY_NAME$1) {
        return this.instances.has(identifier);
    }
    getOptions(identifier = DEFAULT_ENTRY_NAME$1) {
        return this.instancesOptions.get(identifier) || {};
    }
    initialize(opts = {}) {
        const { options = {} } = opts;
        const normalizedIdentifier = this.normalizeInstanceIdentifier(opts.instanceIdentifier);
        if (this.isInitialized(normalizedIdentifier)) {
            throw Error(`${this.name}(${normalizedIdentifier}) has already been initialized`);
        }
        if (!this.isComponentSet()) {
            throw Error(`Component ${this.name} has not been registered yet`);
        }
        const instance = this.getOrInitializeService({
            instanceIdentifier: normalizedIdentifier,
            options
        });
        // resolve any pending promise waiting for the service instance
        for (const [instanceIdentifier, instanceDeferred] of this.instancesDeferred.entries()) {
            const normalizedDeferredIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
            if (normalizedIdentifier === normalizedDeferredIdentifier) {
                instanceDeferred.resolve(instance);
            }
        }
        return instance;
    }
    /**
     *
     * @param callback - a function that will be invoked  after the provider has been initialized by calling provider.initialize().
     * The function is invoked SYNCHRONOUSLY, so it should not execute any longrunning tasks in order to not block the program.
     *
     * @param identifier An optional instance identifier
     * @returns a function to unregister the callback
     */
    onInit(callback, identifier) {
        var _a;
        const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
        const existingCallbacks = (_a = this.onInitCallbacks.get(normalizedIdentifier)) !== null && _a !== void 0 ? _a : new Set();
        existingCallbacks.add(callback);
        this.onInitCallbacks.set(normalizedIdentifier, existingCallbacks);
        const existingInstance = this.instances.get(normalizedIdentifier);
        if (existingInstance) {
            callback(existingInstance, normalizedIdentifier);
        }
        return () => {
            existingCallbacks.delete(callback);
        };
    }
    /**
     * Invoke onInit callbacks synchronously
     * @param instance the service instance`
     */
    invokeOnInitCallbacks(instance, identifier) {
        const callbacks = this.onInitCallbacks.get(identifier);
        if (!callbacks) {
            return;
        }
        for (const callback of callbacks) {
            try {
                callback(instance, identifier);
            }
            catch (_a) {
                // ignore errors in the onInit callback
            }
        }
    }
    getOrInitializeService({ instanceIdentifier, options = {} }) {
        let instance = this.instances.get(instanceIdentifier);
        if (!instance && this.component) {
            instance = this.component.instanceFactory(this.container, {
                instanceIdentifier: normalizeIdentifierForFactory(instanceIdentifier),
                options
            });
            this.instances.set(instanceIdentifier, instance);
            this.instancesOptions.set(instanceIdentifier, options);
            /**
             * Invoke onInit listeners.
             * Note this.component.onInstanceCreated is different, which is used by the component creator,
             * while onInit listeners are registered by consumers of the provider.
             */
            this.invokeOnInitCallbacks(instance, instanceIdentifier);
            /**
             * Order is important
             * onInstanceCreated() should be called after this.instances.set(instanceIdentifier, instance); which
             * makes `isInitialized()` return true.
             */
            if (this.component.onInstanceCreated) {
                try {
                    this.component.onInstanceCreated(this.container, instanceIdentifier, instance);
                }
                catch (_a) {
                    // ignore errors in the onInstanceCreatedCallback
                }
            }
        }
        return instance || null;
    }
    normalizeInstanceIdentifier(identifier = DEFAULT_ENTRY_NAME$1) {
        if (this.component) {
            return this.component.multipleInstances ? identifier : DEFAULT_ENTRY_NAME$1;
        }
        else {
            return identifier; // assume multiple instances are supported before the component is provided.
        }
    }
    shouldAutoInitialize() {
        return (!!this.component &&
            this.component.instantiationMode !== "EXPLICIT" /* InstantiationMode.EXPLICIT */);
    }
}
// undefined should be passed to the service factory for the default instance
function normalizeIdentifierForFactory(identifier) {
    return identifier === DEFAULT_ENTRY_NAME$1 ? undefined : identifier;
}
function isComponentEager(component) {
    return component.instantiationMode === "EAGER" /* InstantiationMode.EAGER */;
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * ComponentContainer that provides Providers for service name T, e.g. `auth`, `auth-internal`
 */
class ComponentContainer {
    constructor(name) {
        this.name = name;
        this.providers = new Map();
    }
    /**
     *
     * @param component Component being added
     * @param overwrite When a component with the same name has already been registered,
     * if overwrite is true: overwrite the existing component with the new component and create a new
     * provider with the new component. It can be useful in tests where you want to use different mocks
     * for different tests.
     * if overwrite is false: throw an exception
     */
    addComponent(component) {
        const provider = this.getProvider(component.name);
        if (provider.isComponentSet()) {
            throw new Error(`Component ${component.name} has already been registered with ${this.name}`);
        }
        provider.setComponent(component);
    }
    addOrOverwriteComponent(component) {
        const provider = this.getProvider(component.name);
        if (provider.isComponentSet()) {
            // delete the existing provider from the container, so we can register the new component
            this.providers.delete(component.name);
        }
        this.addComponent(component);
    }
    /**
     * getProvider provides a type safe interface where it can only be called with a field name
     * present in NameServiceMapping interface.
     *
     * Firebase SDKs providing services should extend NameServiceMapping interface to register
     * themselves.
     */
    getProvider(name) {
        if (this.providers.has(name)) {
            return this.providers.get(name);
        }
        // create a Provider for a service that hasn't registered with Firebase
        const provider = new Provider(name, this);
        this.providers.set(name, provider);
        return provider;
    }
    getProviders() {
        return Array.from(this.providers.values());
    }
}

/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * A container for all of the Logger instances
 */
const instances = [];
/**
 * The JS SDK supports 5 log levels and also allows a user the ability to
 * silence the logs altogether.
 *
 * The order is a follows:
 * DEBUG < VERBOSE < INFO < WARN < ERROR
 *
 * All of the log types above the current log level will be captured (i.e. if
 * you set the log level to `INFO`, errors will still be logged, but `DEBUG` and
 * `VERBOSE` logs will not)
 */
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["VERBOSE"] = 1] = "VERBOSE";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["WARN"] = 3] = "WARN";
    LogLevel[LogLevel["ERROR"] = 4] = "ERROR";
    LogLevel[LogLevel["SILENT"] = 5] = "SILENT";
})(LogLevel || (LogLevel = {}));
const levelStringToEnum = {
    'debug': LogLevel.DEBUG,
    'verbose': LogLevel.VERBOSE,
    'info': LogLevel.INFO,
    'warn': LogLevel.WARN,
    'error': LogLevel.ERROR,
    'silent': LogLevel.SILENT
};
/**
 * The default log level
 */
const defaultLogLevel = LogLevel.INFO;
/**
 * By default, `console.debug` is not displayed in the developer console (in
 * chrome). To avoid forcing users to have to opt-in to these logs twice
 * (i.e. once for firebase, and once in the console), we are sending `DEBUG`
 * logs to the `console.log` function.
 */
const ConsoleMethod = {
    [LogLevel.DEBUG]: 'log',
    [LogLevel.VERBOSE]: 'log',
    [LogLevel.INFO]: 'info',
    [LogLevel.WARN]: 'warn',
    [LogLevel.ERROR]: 'error'
};
/**
 * The default log handler will forward DEBUG, VERBOSE, INFO, WARN, and ERROR
 * messages on to their corresponding console counterparts (if the log method
 * is supported by the current log level)
 */
const defaultLogHandler = (instance, logType, ...args) => {
    if (logType < instance.logLevel) {
        return;
    }
    const now = new Date().toISOString();
    const method = ConsoleMethod[logType];
    if (method) {
        console[method](`[${now}]  ${instance.name}:`, ...args);
    }
    else {
        throw new Error(`Attempted to log a message with an invalid logType (value: ${logType})`);
    }
};
class Logger {
    /**
     * Gives you an instance of a Logger to capture messages according to
     * Firebase's logging scheme.
     *
     * @param name The name that the logs will be associated with
     */
    constructor(name) {
        this.name = name;
        /**
         * The log level of the given Logger instance.
         */
        this._logLevel = defaultLogLevel;
        /**
         * The main (internal) log handler for the Logger instance.
         * Can be set to a new function in internal package code but not by user.
         */
        this._logHandler = defaultLogHandler;
        /**
         * The optional, additional, user-defined log handler for the Logger instance.
         */
        this._userLogHandler = null;
        /**
         * Capture the current instance for later use
         */
        instances.push(this);
    }
    get logLevel() {
        return this._logLevel;
    }
    set logLevel(val) {
        if (!(val in LogLevel)) {
            throw new TypeError(`Invalid value "${val}" assigned to \`logLevel\``);
        }
        this._logLevel = val;
    }
    // Workaround for setter/getter having to be the same type.
    setLogLevel(val) {
        this._logLevel = typeof val === 'string' ? levelStringToEnum[val] : val;
    }
    get logHandler() {
        return this._logHandler;
    }
    set logHandler(val) {
        if (typeof val !== 'function') {
            throw new TypeError('Value assigned to `logHandler` must be a function');
        }
        this._logHandler = val;
    }
    get userLogHandler() {
        return this._userLogHandler;
    }
    set userLogHandler(val) {
        this._userLogHandler = val;
    }
    /**
     * The functions below are all based on the `console` interface
     */
    debug(...args) {
        this._userLogHandler && this._userLogHandler(this, LogLevel.DEBUG, ...args);
        this._logHandler(this, LogLevel.DEBUG, ...args);
    }
    log(...args) {
        this._userLogHandler &&
            this._userLogHandler(this, LogLevel.VERBOSE, ...args);
        this._logHandler(this, LogLevel.VERBOSE, ...args);
    }
    info(...args) {
        this._userLogHandler && this._userLogHandler(this, LogLevel.INFO, ...args);
        this._logHandler(this, LogLevel.INFO, ...args);
    }
    warn(...args) {
        this._userLogHandler && this._userLogHandler(this, LogLevel.WARN, ...args);
        this._logHandler(this, LogLevel.WARN, ...args);
    }
    error(...args) {
        this._userLogHandler && this._userLogHandler(this, LogLevel.ERROR, ...args);
        this._logHandler(this, LogLevel.ERROR, ...args);
    }
}
function setLogLevel$1(level) {
    instances.forEach(inst => {
        inst.setLogLevel(level);
    });
}
function setUserLogHandler(logCallback, options) {
    for (const instance of instances) {
        let customLogLevel = null;
        if (options && options.level) {
            customLogLevel = levelStringToEnum[options.level];
        }
        if (logCallback === null) {
            instance.userLogHandler = null;
        }
        else {
            instance.userLogHandler = (instance, level, ...args) => {
                const message = args
                    .map(arg => {
                    if (arg == null) {
                        return null;
                    }
                    else if (typeof arg === 'string') {
                        return arg;
                    }
                    else if (typeof arg === 'number' || typeof arg === 'boolean') {
                        return arg.toString();
                    }
                    else if (arg instanceof Error) {
                        return arg.message;
                    }
                    else {
                        try {
                            return JSON.stringify(arg);
                        }
                        catch (ignored) {
                            return null;
                        }
                    }
                })
                    .filter(arg => arg)
                    .join(' ');
                if (level >= (customLogLevel !== null && customLogLevel !== void 0 ? customLogLevel : instance.logLevel)) {
                    logCallback({
                        level: LogLevel[level].toLowerCase(),
                        message,
                        args,
                        type: instance.name
                    });
                }
            };
        }
    }
}

const instanceOfAny$1 = (object, constructors) => constructors.some((c) => object instanceof c);

let idbProxyableTypes$1;
let cursorAdvanceMethods$1;
// This is a function to prevent it throwing up in node environments.
function getIdbProxyableTypes$1() {
    return (idbProxyableTypes$1 ||
        (idbProxyableTypes$1 = [
            IDBDatabase,
            IDBObjectStore,
            IDBIndex,
            IDBCursor,
            IDBTransaction,
        ]));
}
// This is a function to prevent it throwing up in node environments.
function getCursorAdvanceMethods$1() {
    return (cursorAdvanceMethods$1 ||
        (cursorAdvanceMethods$1 = [
            IDBCursor.prototype.advance,
            IDBCursor.prototype.continue,
            IDBCursor.prototype.continuePrimaryKey,
        ]));
}
const cursorRequestMap$1 = new WeakMap();
const transactionDoneMap$1 = new WeakMap();
const transactionStoreNamesMap$1 = new WeakMap();
const transformCache$1 = new WeakMap();
const reverseTransformCache$1 = new WeakMap();
function promisifyRequest$1(request) {
    const promise = new Promise((resolve, reject) => {
        const unlisten = () => {
            request.removeEventListener('success', success);
            request.removeEventListener('error', error);
        };
        const success = () => {
            resolve(wrap$1(request.result));
            unlisten();
        };
        const error = () => {
            reject(request.error);
            unlisten();
        };
        request.addEventListener('success', success);
        request.addEventListener('error', error);
    });
    promise
        .then((value) => {
        // Since cursoring reuses the IDBRequest (*sigh*), we cache it for later retrieval
        // (see wrapFunction).
        if (value instanceof IDBCursor) {
            cursorRequestMap$1.set(value, request);
        }
        // Catching to avoid "Uncaught Promise exceptions"
    })
        .catch(() => { });
    // This mapping exists in reverseTransformCache but doesn't doesn't exist in transformCache. This
    // is because we create many promises from a single IDBRequest.
    reverseTransformCache$1.set(promise, request);
    return promise;
}
function cacheDonePromiseForTransaction$1(tx) {
    // Early bail if we've already created a done promise for this transaction.
    if (transactionDoneMap$1.has(tx))
        return;
    const done = new Promise((resolve, reject) => {
        const unlisten = () => {
            tx.removeEventListener('complete', complete);
            tx.removeEventListener('error', error);
            tx.removeEventListener('abort', error);
        };
        const complete = () => {
            resolve();
            unlisten();
        };
        const error = () => {
            reject(tx.error || new DOMException('AbortError', 'AbortError'));
            unlisten();
        };
        tx.addEventListener('complete', complete);
        tx.addEventListener('error', error);
        tx.addEventListener('abort', error);
    });
    // Cache it for later retrieval.
    transactionDoneMap$1.set(tx, done);
}
let idbProxyTraps$1 = {
    get(target, prop, receiver) {
        if (target instanceof IDBTransaction) {
            // Special handling for transaction.done.
            if (prop === 'done')
                return transactionDoneMap$1.get(target);
            // Polyfill for objectStoreNames because of Edge.
            if (prop === 'objectStoreNames') {
                return target.objectStoreNames || transactionStoreNamesMap$1.get(target);
            }
            // Make tx.store return the only store in the transaction, or undefined if there are many.
            if (prop === 'store') {
                return receiver.objectStoreNames[1]
                    ? undefined
                    : receiver.objectStore(receiver.objectStoreNames[0]);
            }
        }
        // Else transform whatever we get back.
        return wrap$1(target[prop]);
    },
    set(target, prop, value) {
        target[prop] = value;
        return true;
    },
    has(target, prop) {
        if (target instanceof IDBTransaction &&
            (prop === 'done' || prop === 'store')) {
            return true;
        }
        return prop in target;
    },
};
function replaceTraps$1(callback) {
    idbProxyTraps$1 = callback(idbProxyTraps$1);
}
function wrapFunction$1(func) {
    // Due to expected object equality (which is enforced by the caching in `wrap`), we
    // only create one new func per func.
    // Edge doesn't support objectStoreNames (booo), so we polyfill it here.
    if (func === IDBDatabase.prototype.transaction &&
        !('objectStoreNames' in IDBTransaction.prototype)) {
        return function (storeNames, ...args) {
            const tx = func.call(unwrap$1(this), storeNames, ...args);
            transactionStoreNamesMap$1.set(tx, storeNames.sort ? storeNames.sort() : [storeNames]);
            return wrap$1(tx);
        };
    }
    // Cursor methods are special, as the behaviour is a little more different to standard IDB. In
    // IDB, you advance the cursor and wait for a new 'success' on the IDBRequest that gave you the
    // cursor. It's kinda like a promise that can resolve with many values. That doesn't make sense
    // with real promises, so each advance methods returns a new promise for the cursor object, or
    // undefined if the end of the cursor has been reached.
    if (getCursorAdvanceMethods$1().includes(func)) {
        return function (...args) {
            // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
            // the original object.
            func.apply(unwrap$1(this), args);
            return wrap$1(cursorRequestMap$1.get(this));
        };
    }
    return function (...args) {
        // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
        // the original object.
        return wrap$1(func.apply(unwrap$1(this), args));
    };
}
function transformCachableValue$1(value) {
    if (typeof value === 'function')
        return wrapFunction$1(value);
    // This doesn't return, it just creates a 'done' promise for the transaction,
    // which is later returned for transaction.done (see idbObjectHandler).
    if (value instanceof IDBTransaction)
        cacheDonePromiseForTransaction$1(value);
    if (instanceOfAny$1(value, getIdbProxyableTypes$1()))
        return new Proxy(value, idbProxyTraps$1);
    // Return the same value back if we're not going to transform it.
    return value;
}
function wrap$1(value) {
    // We sometimes generate multiple promises from a single IDBRequest (eg when cursoring), because
    // IDB is weird and a single IDBRequest can yield many responses, so these can't be cached.
    if (value instanceof IDBRequest)
        return promisifyRequest$1(value);
    // If we've already transformed this value before, reuse the transformed value.
    // This is faster, but it also provides object equality.
    if (transformCache$1.has(value))
        return transformCache$1.get(value);
    const newValue = transformCachableValue$1(value);
    // Not all types are transformed.
    // These may be primitive types, so they can't be WeakMap keys.
    if (newValue !== value) {
        transformCache$1.set(value, newValue);
        reverseTransformCache$1.set(newValue, value);
    }
    return newValue;
}
const unwrap$1 = (value) => reverseTransformCache$1.get(value);

/**
 * Open a database.
 *
 * @param name Name of the database.
 * @param version Schema version.
 * @param callbacks Additional callbacks.
 */
function openDB$1(name, version, { blocked, upgrade, blocking, terminated } = {}) {
    const request = indexedDB.open(name, version);
    const openPromise = wrap$1(request);
    if (upgrade) {
        request.addEventListener('upgradeneeded', (event) => {
            upgrade(wrap$1(request.result), event.oldVersion, event.newVersion, wrap$1(request.transaction), event);
        });
    }
    if (blocked) {
        request.addEventListener('blocked', (event) => blocked(
        // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
        event.oldVersion, event.newVersion, event));
    }
    openPromise
        .then((db) => {
        if (terminated)
            db.addEventListener('close', () => terminated());
        if (blocking) {
            db.addEventListener('versionchange', (event) => blocking(event.oldVersion, event.newVersion, event));
        }
    })
        .catch(() => { });
    return openPromise;
}
/**
 * Delete a database.
 *
 * @param name Name of the database.
 */
function deleteDB$1(name, { blocked } = {}) {
    const request = indexedDB.deleteDatabase(name);
    if (blocked) {
        request.addEventListener('blocked', (event) => blocked(
        // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
        event.oldVersion, event));
    }
    return wrap$1(request).then(() => undefined);
}

const readMethods$1 = ['get', 'getKey', 'getAll', 'getAllKeys', 'count'];
const writeMethods$1 = ['put', 'add', 'delete', 'clear'];
const cachedMethods$1 = new Map();
function getMethod$1(target, prop) {
    if (!(target instanceof IDBDatabase &&
        !(prop in target) &&
        typeof prop === 'string')) {
        return;
    }
    if (cachedMethods$1.get(prop))
        return cachedMethods$1.get(prop);
    const targetFuncName = prop.replace(/FromIndex$/, '');
    const useIndex = prop !== targetFuncName;
    const isWrite = writeMethods$1.includes(targetFuncName);
    if (
    // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
    !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) ||
        !(isWrite || readMethods$1.includes(targetFuncName))) {
        return;
    }
    const method = async function (storeName, ...args) {
        // isWrite ? 'readwrite' : undefined gzipps better, but fails in Edge :(
        const tx = this.transaction(storeName, isWrite ? 'readwrite' : 'readonly');
        let target = tx.store;
        if (useIndex)
            target = target.index(args.shift());
        // Must reject if op rejects.
        // If it's a write operation, must reject if tx.done rejects.
        // Must reject with op rejection first.
        // Must resolve with op value.
        // Must handle both promises (no unhandled rejections)
        return (await Promise.all([
            target[targetFuncName](...args),
            isWrite && tx.done,
        ]))[0];
    };
    cachedMethods$1.set(prop, method);
    return method;
}
replaceTraps$1((oldTraps) => ({
    ...oldTraps,
    get: (target, prop, receiver) => getMethod$1(target, prop) || oldTraps.get(target, prop, receiver),
    has: (target, prop) => !!getMethod$1(target, prop) || oldTraps.has(target, prop),
}));

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class PlatformLoggerServiceImpl {
    constructor(container) {
        this.container = container;
    }
    // In initial implementation, this will be called by installations on
    // auth token refresh, and installations will send this string.
    getPlatformInfoString() {
        const providers = this.container.getProviders();
        // Loop through providers and get library/version pairs from any that are
        // version components.
        return providers
            .map(provider => {
            if (isVersionServiceProvider(provider)) {
                const service = provider.getImmediate();
                return `${service.library}/${service.version}`;
            }
            else {
                return null;
            }
        })
            .filter(logString => logString)
            .join(' ');
    }
}
/**
 *
 * @param provider check if this provider provides a VersionService
 *
 * NOTE: Using Provider<'app-version'> is a hack to indicate that the provider
 * provides VersionService. The provider is not necessarily a 'app-version'
 * provider.
 */
function isVersionServiceProvider(provider) {
    const component = provider.getComponent();
    return (component === null || component === void 0 ? void 0 : component.type) === "VERSION" /* ComponentType.VERSION */;
}

const name$o = "@firebase/app";
const version$1$1 = "0.9.13";

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const logger$1 = new Logger('@firebase/app');

const name$n = "@firebase/app-compat";

const name$m = "@firebase/analytics-compat";

const name$l = "@firebase/analytics";

const name$k = "@firebase/app-check-compat";

const name$j = "@firebase/app-check";

const name$i = "@firebase/auth";

const name$h = "@firebase/auth-compat";

const name$g = "@firebase/database";

const name$f = "@firebase/database-compat";

const name$e = "@firebase/functions";

const name$d = "@firebase/functions-compat";

const name$c = "@firebase/installations";

const name$b = "@firebase/installations-compat";

const name$a = "@firebase/messaging";

const name$9 = "@firebase/messaging-compat";

const name$8 = "@firebase/performance";

const name$7 = "@firebase/performance-compat";

const name$6 = "@firebase/remote-config";

const name$5 = "@firebase/remote-config-compat";

const name$4 = "@firebase/storage";

const name$3 = "@firebase/storage-compat";

const name$2$1 = "@firebase/firestore";

const name$1$1 = "@firebase/firestore-compat";

const name$p = "firebase";
const version$4 = "9.23.0";

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * The default app name
 *
 * @internal
 */
const DEFAULT_ENTRY_NAME = '[DEFAULT]';
const PLATFORM_LOG_STRING = {
    [name$o]: 'fire-core',
    [name$n]: 'fire-core-compat',
    [name$l]: 'fire-analytics',
    [name$m]: 'fire-analytics-compat',
    [name$j]: 'fire-app-check',
    [name$k]: 'fire-app-check-compat',
    [name$i]: 'fire-auth',
    [name$h]: 'fire-auth-compat',
    [name$g]: 'fire-rtdb',
    [name$f]: 'fire-rtdb-compat',
    [name$e]: 'fire-fn',
    [name$d]: 'fire-fn-compat',
    [name$c]: 'fire-iid',
    [name$b]: 'fire-iid-compat',
    [name$a]: 'fire-fcm',
    [name$9]: 'fire-fcm-compat',
    [name$8]: 'fire-perf',
    [name$7]: 'fire-perf-compat',
    [name$6]: 'fire-rc',
    [name$5]: 'fire-rc-compat',
    [name$4]: 'fire-gcs',
    [name$3]: 'fire-gcs-compat',
    [name$2$1]: 'fire-fst',
    [name$1$1]: 'fire-fst-compat',
    'fire-js': 'fire-js',
    [name$p]: 'fire-js-all'
};

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @internal
 */
const _apps = new Map();
/**
 * Registered components.
 *
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _components = new Map();
/**
 * @param component - the component being added to this app's container
 *
 * @internal
 */
function _addComponent(app, component) {
    try {
        app.container.addComponent(component);
    }
    catch (e) {
        logger$1.debug(`Component ${component.name} failed to register with FirebaseApp ${app.name}`, e);
    }
}
/**
 *
 * @internal
 */
function _addOrOverwriteComponent(app, component) {
    app.container.addOrOverwriteComponent(component);
}
/**
 *
 * @param component - the component to register
 * @returns whether or not the component is registered successfully
 *
 * @internal
 */
function _registerComponent(component) {
    const componentName = component.name;
    if (_components.has(componentName)) {
        logger$1.debug(`There were multiple attempts to register component ${componentName}.`);
        return false;
    }
    _components.set(componentName, component);
    // add the component to existing app instances
    for (const app of _apps.values()) {
        _addComponent(app, component);
    }
    return true;
}
/**
 *
 * @param app - FirebaseApp instance
 * @param name - service name
 *
 * @returns the provider for the service with the matching name
 *
 * @internal
 */
function _getProvider(app, name) {
    const heartbeatController = app.container
        .getProvider('heartbeat')
        .getImmediate({ optional: true });
    if (heartbeatController) {
        void heartbeatController.triggerHeartbeat();
    }
    return app.container.getProvider(name);
}
/**
 *
 * @param app - FirebaseApp instance
 * @param name - service name
 * @param instanceIdentifier - service instance identifier in case the service supports multiple instances
 *
 * @internal
 */
function _removeServiceInstance(app, name, instanceIdentifier = DEFAULT_ENTRY_NAME) {
    _getProvider(app, name).clearInstance(instanceIdentifier);
}
/**
 * Test only
 *
 * @internal
 */
function _clearComponents() {
    _components.clear();
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const ERRORS$1 = {
    ["no-app" /* AppError.NO_APP */]: "No Firebase App '{$appName}' has been created - " +
        'call initializeApp() first',
    ["bad-app-name" /* AppError.BAD_APP_NAME */]: "Illegal App name: '{$appName}",
    ["duplicate-app" /* AppError.DUPLICATE_APP */]: "Firebase App named '{$appName}' already exists with different options or config",
    ["app-deleted" /* AppError.APP_DELETED */]: "Firebase App named '{$appName}' already deleted",
    ["no-options" /* AppError.NO_OPTIONS */]: 'Need to provide options, when not being deployed to hosting via source.',
    ["invalid-app-argument" /* AppError.INVALID_APP_ARGUMENT */]: 'firebase.{$appName}() takes either no argument or a ' +
        'Firebase App instance.',
    ["invalid-log-argument" /* AppError.INVALID_LOG_ARGUMENT */]: 'First argument to `onLog` must be null or a function.',
    ["idb-open" /* AppError.IDB_OPEN */]: 'Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.',
    ["idb-get" /* AppError.IDB_GET */]: 'Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.',
    ["idb-set" /* AppError.IDB_WRITE */]: 'Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.',
    ["idb-delete" /* AppError.IDB_DELETE */]: 'Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.'
};
const ERROR_FACTORY$2 = new ErrorFactory('app', 'Firebase', ERRORS$1);

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class FirebaseAppImpl {
    constructor(options, config, container) {
        this._isDeleted = false;
        this._options = Object.assign({}, options);
        this._config = Object.assign({}, config);
        this._name = config.name;
        this._automaticDataCollectionEnabled =
            config.automaticDataCollectionEnabled;
        this._container = container;
        this.container.addComponent(new Component('app', () => this, "PUBLIC" /* ComponentType.PUBLIC */));
    }
    get automaticDataCollectionEnabled() {
        this.checkDestroyed();
        return this._automaticDataCollectionEnabled;
    }
    set automaticDataCollectionEnabled(val) {
        this.checkDestroyed();
        this._automaticDataCollectionEnabled = val;
    }
    get name() {
        this.checkDestroyed();
        return this._name;
    }
    get options() {
        this.checkDestroyed();
        return this._options;
    }
    get config() {
        this.checkDestroyed();
        return this._config;
    }
    get container() {
        return this._container;
    }
    get isDeleted() {
        return this._isDeleted;
    }
    set isDeleted(val) {
        this._isDeleted = val;
    }
    /**
     * This function will throw an Error if the App has already been deleted -
     * use before performing API actions on the App.
     */
    checkDestroyed() {
        if (this.isDeleted) {
            throw ERROR_FACTORY$2.create("app-deleted" /* AppError.APP_DELETED */, { appName: this._name });
        }
    }
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * The current SDK version.
 *
 * @public
 */
const SDK_VERSION = version$4;
function initializeApp(_options, rawConfig = {}) {
    let options = _options;
    if (typeof rawConfig !== 'object') {
        const name = rawConfig;
        rawConfig = { name };
    }
    const config = Object.assign({ name: DEFAULT_ENTRY_NAME, automaticDataCollectionEnabled: false }, rawConfig);
    const name = config.name;
    if (typeof name !== 'string' || !name) {
        throw ERROR_FACTORY$2.create("bad-app-name" /* AppError.BAD_APP_NAME */, {
            appName: String(name)
        });
    }
    options || (options = getDefaultAppConfig());
    if (!options) {
        throw ERROR_FACTORY$2.create("no-options" /* AppError.NO_OPTIONS */);
    }
    const existingApp = _apps.get(name);
    if (existingApp) {
        // return the existing app if options and config deep equal the ones in the existing app.
        if (deepEqual(options, existingApp.options) &&
            deepEqual(config, existingApp.config)) {
            return existingApp;
        }
        else {
            throw ERROR_FACTORY$2.create("duplicate-app" /* AppError.DUPLICATE_APP */, { appName: name });
        }
    }
    const container = new ComponentContainer(name);
    for (const component of _components.values()) {
        container.addComponent(component);
    }
    const newApp = new FirebaseAppImpl(options, config, container);
    _apps.set(name, newApp);
    return newApp;
}
/**
 * Retrieves a {@link @firebase/app#FirebaseApp} instance.
 *
 * When called with no arguments, the default app is returned. When an app name
 * is provided, the app corresponding to that name is returned.
 *
 * An exception is thrown if the app being retrieved has not yet been
 * initialized.
 *
 * @example
 * ```javascript
 * // Return the default app
 * const app = getApp();
 * ```
 *
 * @example
 * ```javascript
 * // Return a named app
 * const otherApp = getApp("otherApp");
 * ```
 *
 * @param name - Optional name of the app to return. If no name is
 *   provided, the default is `"[DEFAULT]"`.
 *
 * @returns The app corresponding to the provided app name.
 *   If no app name is provided, the default app is returned.
 *
 * @public
 */
function getApp(name = DEFAULT_ENTRY_NAME) {
    const app = _apps.get(name);
    if (!app && name === DEFAULT_ENTRY_NAME && getDefaultAppConfig()) {
        return initializeApp();
    }
    if (!app) {
        throw ERROR_FACTORY$2.create("no-app" /* AppError.NO_APP */, { appName: name });
    }
    return app;
}
/**
 * A (read-only) array of all initialized apps.
 * @public
 */
function getApps() {
    return Array.from(_apps.values());
}
/**
 * Renders this app unusable and frees the resources of all associated
 * services.
 *
 * @example
 * ```javascript
 * deleteApp(app)
 *   .then(function() {
 *     console.log("App deleted successfully");
 *   })
 *   .catch(function(error) {
 *     console.log("Error deleting app:", error);
 *   });
 * ```
 *
 * @public
 */
async function deleteApp(app) {
    const name = app.name;
    if (_apps.has(name)) {
        _apps.delete(name);
        await Promise.all(app.container
            .getProviders()
            .map(provider => provider.delete()));
        app.isDeleted = true;
    }
}
/**
 * Registers a library's name and version for platform logging purposes.
 * @param library - Name of 1p or 3p library (e.g. firestore, angularfire)
 * @param version - Current version of that library.
 * @param variant - Bundle variant, e.g., node, rn, etc.
 *
 * @public
 */
function registerVersion(libraryKeyOrName, version, variant) {
    var _a;
    // TODO: We can use this check to whitelist strings when/if we set up
    // a good whitelist system.
    let library = (_a = PLATFORM_LOG_STRING[libraryKeyOrName]) !== null && _a !== void 0 ? _a : libraryKeyOrName;
    if (variant) {
        library += `-${variant}`;
    }
    const libraryMismatch = library.match(/\s|\//);
    const versionMismatch = version.match(/\s|\//);
    if (libraryMismatch || versionMismatch) {
        const warning = [
            `Unable to register library "${library}" with version "${version}":`
        ];
        if (libraryMismatch) {
            warning.push(`library name "${library}" contains illegal characters (whitespace or "/")`);
        }
        if (libraryMismatch && versionMismatch) {
            warning.push('and');
        }
        if (versionMismatch) {
            warning.push(`version name "${version}" contains illegal characters (whitespace or "/")`);
        }
        logger$1.warn(warning.join(' '));
        return;
    }
    _registerComponent(new Component(`${library}-version`, () => ({ library, version }), "VERSION" /* ComponentType.VERSION */));
}
/**
 * Sets log handler for all Firebase SDKs.
 * @param logCallback - An optional custom log handler that executes user code whenever
 * the Firebase SDK makes a logging call.
 *
 * @public
 */
function onLog(logCallback, options) {
    if (logCallback !== null && typeof logCallback !== 'function') {
        throw ERROR_FACTORY$2.create("invalid-log-argument" /* AppError.INVALID_LOG_ARGUMENT */);
    }
    setUserLogHandler(logCallback, options);
}
/**
 * Sets log level for all Firebase SDKs.
 *
 * All of the log types above the current log level are captured (i.e. if
 * you set the log level to `info`, errors are logged, but `debug` and
 * `verbose` logs are not).
 *
 * @public
 */
function setLogLevel(logLevel) {
    setLogLevel$1(logLevel);
}

/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const DB_NAME = 'firebase-heartbeat-database';
const DB_VERSION = 1;
const STORE_NAME = 'firebase-heartbeat-store';
let dbPromise$1 = null;
function getDbPromise$1() {
    if (!dbPromise$1) {
        dbPromise$1 = openDB$1(DB_NAME, DB_VERSION, {
            upgrade: (db, oldVersion) => {
                // We don't use 'break' in this switch statement, the fall-through
                // behavior is what we want, because if there are multiple versions between
                // the old version and the current version, we want ALL the migrations
                // that correspond to those versions to run, not only the last one.
                // eslint-disable-next-line default-case
                switch (oldVersion) {
                    case 0:
                        db.createObjectStore(STORE_NAME);
                }
            }
        }).catch(e => {
            throw ERROR_FACTORY$2.create("idb-open" /* AppError.IDB_OPEN */, {
                originalErrorMessage: e.message
            });
        });
    }
    return dbPromise$1;
}
async function readHeartbeatsFromIndexedDB(app) {
    try {
        const db = await getDbPromise$1();
        const result = await db
            .transaction(STORE_NAME)
            .objectStore(STORE_NAME)
            .get(computeKey(app));
        return result;
    }
    catch (e) {
        if (e instanceof FirebaseError) {
            logger$1.warn(e.message);
        }
        else {
            const idbGetError = ERROR_FACTORY$2.create("idb-get" /* AppError.IDB_GET */, {
                originalErrorMessage: e === null || e === void 0 ? void 0 : e.message
            });
            logger$1.warn(idbGetError.message);
        }
    }
}
async function writeHeartbeatsToIndexedDB(app, heartbeatObject) {
    try {
        const db = await getDbPromise$1();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const objectStore = tx.objectStore(STORE_NAME);
        await objectStore.put(heartbeatObject, computeKey(app));
        await tx.done;
    }
    catch (e) {
        if (e instanceof FirebaseError) {
            logger$1.warn(e.message);
        }
        else {
            const idbGetError = ERROR_FACTORY$2.create("idb-set" /* AppError.IDB_WRITE */, {
                originalErrorMessage: e === null || e === void 0 ? void 0 : e.message
            });
            logger$1.warn(idbGetError.message);
        }
    }
}
function computeKey(app) {
    return `${app.name}!${app.options.appId}`;
}

/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const MAX_HEADER_BYTES = 1024;
// 30 days
const STORED_HEARTBEAT_RETENTION_MAX_MILLIS = 30 * 24 * 60 * 60 * 1000;
class HeartbeatServiceImpl {
    constructor(container) {
        this.container = container;
        /**
         * In-memory cache for heartbeats, used by getHeartbeatsHeader() to generate
         * the header string.
         * Stores one record per date. This will be consolidated into the standard
         * format of one record per user agent string before being sent as a header.
         * Populated from indexedDB when the controller is instantiated and should
         * be kept in sync with indexedDB.
         * Leave public for easier testing.
         */
        this._heartbeatsCache = null;
        const app = this.container.getProvider('app').getImmediate();
        this._storage = new HeartbeatStorageImpl(app);
        this._heartbeatsCachePromise = this._storage.read().then(result => {
            this._heartbeatsCache = result;
            return result;
        });
    }
    /**
     * Called to report a heartbeat. The function will generate
     * a HeartbeatsByUserAgent object, update heartbeatsCache, and persist it
     * to IndexedDB.
     * Note that we only store one heartbeat per day. So if a heartbeat for today is
     * already logged, subsequent calls to this function in the same day will be ignored.
     */
    async triggerHeartbeat() {
        const platformLogger = this.container
            .getProvider('platform-logger')
            .getImmediate();
        // This is the "Firebase user agent" string from the platform logger
        // service, not the browser user agent.
        const agent = platformLogger.getPlatformInfoString();
        const date = getUTCDateString();
        if (this._heartbeatsCache === null) {
            this._heartbeatsCache = await this._heartbeatsCachePromise;
        }
        // Do not store a heartbeat if one is already stored for this day
        // or if a header has already been sent today.
        if (this._heartbeatsCache.lastSentHeartbeatDate === date ||
            this._heartbeatsCache.heartbeats.some(singleDateHeartbeat => singleDateHeartbeat.date === date)) {
            return;
        }
        else {
            // There is no entry for this date. Create one.
            this._heartbeatsCache.heartbeats.push({ date, agent });
        }
        // Remove entries older than 30 days.
        this._heartbeatsCache.heartbeats = this._heartbeatsCache.heartbeats.filter(singleDateHeartbeat => {
            const hbTimestamp = new Date(singleDateHeartbeat.date).valueOf();
            const now = Date.now();
            return now - hbTimestamp <= STORED_HEARTBEAT_RETENTION_MAX_MILLIS;
        });
        return this._storage.overwrite(this._heartbeatsCache);
    }
    /**
     * Returns a base64 encoded string which can be attached to the heartbeat-specific header directly.
     * It also clears all heartbeats from memory as well as in IndexedDB.
     *
     * NOTE: Consuming product SDKs should not send the header if this method
     * returns an empty string.
     */
    async getHeartbeatsHeader() {
        if (this._heartbeatsCache === null) {
            await this._heartbeatsCachePromise;
        }
        // If it's still null or the array is empty, there is no data to send.
        if (this._heartbeatsCache === null ||
            this._heartbeatsCache.heartbeats.length === 0) {
            return '';
        }
        const date = getUTCDateString();
        // Extract as many heartbeats from the cache as will fit under the size limit.
        const { heartbeatsToSend, unsentEntries } = extractHeartbeatsForHeader(this._heartbeatsCache.heartbeats);
        const headerString = base64urlEncodeWithoutPadding(JSON.stringify({ version: 2, heartbeats: heartbeatsToSend }));
        // Store last sent date to prevent another being logged/sent for the same day.
        this._heartbeatsCache.lastSentHeartbeatDate = date;
        if (unsentEntries.length > 0) {
            // Store any unsent entries if they exist.
            this._heartbeatsCache.heartbeats = unsentEntries;
            // This seems more likely than emptying the array (below) to lead to some odd state
            // since the cache isn't empty and this will be called again on the next request,
            // and is probably safest if we await it.
            await this._storage.overwrite(this._heartbeatsCache);
        }
        else {
            this._heartbeatsCache.heartbeats = [];
            // Do not wait for this, to reduce latency.
            void this._storage.overwrite(this._heartbeatsCache);
        }
        return headerString;
    }
}
function getUTCDateString() {
    const today = new Date();
    // Returns date format 'YYYY-MM-DD'
    return today.toISOString().substring(0, 10);
}
function extractHeartbeatsForHeader(heartbeatsCache, maxSize = MAX_HEADER_BYTES) {
    // Heartbeats grouped by user agent in the standard format to be sent in
    // the header.
    const heartbeatsToSend = [];
    // Single date format heartbeats that are not sent.
    let unsentEntries = heartbeatsCache.slice();
    for (const singleDateHeartbeat of heartbeatsCache) {
        // Look for an existing entry with the same user agent.
        const heartbeatEntry = heartbeatsToSend.find(hb => hb.agent === singleDateHeartbeat.agent);
        if (!heartbeatEntry) {
            // If no entry for this user agent exists, create one.
            heartbeatsToSend.push({
                agent: singleDateHeartbeat.agent,
                dates: [singleDateHeartbeat.date]
            });
            if (countBytes(heartbeatsToSend) > maxSize) {
                // If the header would exceed max size, remove the added heartbeat
                // entry and stop adding to the header.
                heartbeatsToSend.pop();
                break;
            }
        }
        else {
            heartbeatEntry.dates.push(singleDateHeartbeat.date);
            // If the header would exceed max size, remove the added date
            // and stop adding to the header.
            if (countBytes(heartbeatsToSend) > maxSize) {
                heartbeatEntry.dates.pop();
                break;
            }
        }
        // Pop unsent entry from queue. (Skipped if adding the entry exceeded
        // quota and the loop breaks early.)
        unsentEntries = unsentEntries.slice(1);
    }
    return {
        heartbeatsToSend,
        unsentEntries
    };
}
class HeartbeatStorageImpl {
    constructor(app) {
        this.app = app;
        this._canUseIndexedDBPromise = this.runIndexedDBEnvironmentCheck();
    }
    async runIndexedDBEnvironmentCheck() {
        if (!isIndexedDBAvailable()) {
            return false;
        }
        else {
            return validateIndexedDBOpenable()
                .then(() => true)
                .catch(() => false);
        }
    }
    /**
     * Read all heartbeats.
     */
    async read() {
        const canUseIndexedDB = await this._canUseIndexedDBPromise;
        if (!canUseIndexedDB) {
            return { heartbeats: [] };
        }
        else {
            const idbHeartbeatObject = await readHeartbeatsFromIndexedDB(this.app);
            return idbHeartbeatObject || { heartbeats: [] };
        }
    }
    // overwrite the storage with the provided heartbeats
    async overwrite(heartbeatsObject) {
        var _a;
        const canUseIndexedDB = await this._canUseIndexedDBPromise;
        if (!canUseIndexedDB) {
            return;
        }
        else {
            const existingHeartbeatsObject = await this.read();
            return writeHeartbeatsToIndexedDB(this.app, {
                lastSentHeartbeatDate: (_a = heartbeatsObject.lastSentHeartbeatDate) !== null && _a !== void 0 ? _a : existingHeartbeatsObject.lastSentHeartbeatDate,
                heartbeats: heartbeatsObject.heartbeats
            });
        }
    }
    // add heartbeats
    async add(heartbeatsObject) {
        var _a;
        const canUseIndexedDB = await this._canUseIndexedDBPromise;
        if (!canUseIndexedDB) {
            return;
        }
        else {
            const existingHeartbeatsObject = await this.read();
            return writeHeartbeatsToIndexedDB(this.app, {
                lastSentHeartbeatDate: (_a = heartbeatsObject.lastSentHeartbeatDate) !== null && _a !== void 0 ? _a : existingHeartbeatsObject.lastSentHeartbeatDate,
                heartbeats: [
                    ...existingHeartbeatsObject.heartbeats,
                    ...heartbeatsObject.heartbeats
                ]
            });
        }
    }
}
/**
 * Calculate bytes of a HeartbeatsByUserAgent array after being wrapped
 * in a platform logging header JSON object, stringified, and converted
 * to base 64.
 */
function countBytes(heartbeatsCache) {
    // base64 has a restricted set of characters, all of which should be 1 byte.
    return base64urlEncodeWithoutPadding(
    // heartbeatsCache wrapper properties
    JSON.stringify({ version: 2, heartbeats: heartbeatsCache })).length;
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function registerCoreComponents(variant) {
    _registerComponent(new Component('platform-logger', container => new PlatformLoggerServiceImpl(container), "PRIVATE" /* ComponentType.PRIVATE */));
    _registerComponent(new Component('heartbeat', container => new HeartbeatServiceImpl(container), "PRIVATE" /* ComponentType.PRIVATE */));
    // Register `app` package.
    registerVersion(name$o, version$1$1, variant);
    // BUILD_TARGET will be replaced by values like esm5, esm2017, cjs5, etc during the compilation
    registerVersion(name$o, version$1$1, 'esm2017');
    // Register platform SDK identifier (no version).
    registerVersion('fire-js', '');
}

/**
 * Firebase App
 *
 * @remarks This package coordinates the communication between the different Firebase components
 * @packageDocumentation
 */
registerCoreComponents('');

var name$2 = "firebase";
var version$3 = "9.23.0";

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
registerVersion(name$2, version$3, 'app');

const instanceOfAny = (object, constructors) => constructors.some((c) => object instanceof c);

let idbProxyableTypes;
let cursorAdvanceMethods;
// This is a function to prevent it throwing up in node environments.
function getIdbProxyableTypes() {
    return (idbProxyableTypes ||
        (idbProxyableTypes = [
            IDBDatabase,
            IDBObjectStore,
            IDBIndex,
            IDBCursor,
            IDBTransaction,
        ]));
}
// This is a function to prevent it throwing up in node environments.
function getCursorAdvanceMethods() {
    return (cursorAdvanceMethods ||
        (cursorAdvanceMethods = [
            IDBCursor.prototype.advance,
            IDBCursor.prototype.continue,
            IDBCursor.prototype.continuePrimaryKey,
        ]));
}
const cursorRequestMap = new WeakMap();
const transactionDoneMap = new WeakMap();
const transactionStoreNamesMap = new WeakMap();
const transformCache = new WeakMap();
const reverseTransformCache = new WeakMap();
function promisifyRequest(request) {
    const promise = new Promise((resolve, reject) => {
        const unlisten = () => {
            request.removeEventListener('success', success);
            request.removeEventListener('error', error);
        };
        const success = () => {
            resolve(wrap(request.result));
            unlisten();
        };
        const error = () => {
            reject(request.error);
            unlisten();
        };
        request.addEventListener('success', success);
        request.addEventListener('error', error);
    });
    promise
        .then((value) => {
        // Since cursoring reuses the IDBRequest (*sigh*), we cache it for later retrieval
        // (see wrapFunction).
        if (value instanceof IDBCursor) {
            cursorRequestMap.set(value, request);
        }
        // Catching to avoid "Uncaught Promise exceptions"
    })
        .catch(() => { });
    // This mapping exists in reverseTransformCache but doesn't doesn't exist in transformCache. This
    // is because we create many promises from a single IDBRequest.
    reverseTransformCache.set(promise, request);
    return promise;
}
function cacheDonePromiseForTransaction(tx) {
    // Early bail if we've already created a done promise for this transaction.
    if (transactionDoneMap.has(tx))
        return;
    const done = new Promise((resolve, reject) => {
        const unlisten = () => {
            tx.removeEventListener('complete', complete);
            tx.removeEventListener('error', error);
            tx.removeEventListener('abort', error);
        };
        const complete = () => {
            resolve();
            unlisten();
        };
        const error = () => {
            reject(tx.error || new DOMException('AbortError', 'AbortError'));
            unlisten();
        };
        tx.addEventListener('complete', complete);
        tx.addEventListener('error', error);
        tx.addEventListener('abort', error);
    });
    // Cache it for later retrieval.
    transactionDoneMap.set(tx, done);
}
let idbProxyTraps = {
    get(target, prop, receiver) {
        if (target instanceof IDBTransaction) {
            // Special handling for transaction.done.
            if (prop === 'done')
                return transactionDoneMap.get(target);
            // Polyfill for objectStoreNames because of Edge.
            if (prop === 'objectStoreNames') {
                return target.objectStoreNames || transactionStoreNamesMap.get(target);
            }
            // Make tx.store return the only store in the transaction, or undefined if there are many.
            if (prop === 'store') {
                return receiver.objectStoreNames[1]
                    ? undefined
                    : receiver.objectStore(receiver.objectStoreNames[0]);
            }
        }
        // Else transform whatever we get back.
        return wrap(target[prop]);
    },
    set(target, prop, value) {
        target[prop] = value;
        return true;
    },
    has(target, prop) {
        if (target instanceof IDBTransaction &&
            (prop === 'done' || prop === 'store')) {
            return true;
        }
        return prop in target;
    },
};
function replaceTraps(callback) {
    idbProxyTraps = callback(idbProxyTraps);
}
function wrapFunction(func) {
    // Due to expected object equality (which is enforced by the caching in `wrap`), we
    // only create one new func per func.
    // Edge doesn't support objectStoreNames (booo), so we polyfill it here.
    if (func === IDBDatabase.prototype.transaction &&
        !('objectStoreNames' in IDBTransaction.prototype)) {
        return function (storeNames, ...args) {
            const tx = func.call(unwrap(this), storeNames, ...args);
            transactionStoreNamesMap.set(tx, storeNames.sort ? storeNames.sort() : [storeNames]);
            return wrap(tx);
        };
    }
    // Cursor methods are special, as the behaviour is a little more different to standard IDB. In
    // IDB, you advance the cursor and wait for a new 'success' on the IDBRequest that gave you the
    // cursor. It's kinda like a promise that can resolve with many values. That doesn't make sense
    // with real promises, so each advance methods returns a new promise for the cursor object, or
    // undefined if the end of the cursor has been reached.
    if (getCursorAdvanceMethods().includes(func)) {
        return function (...args) {
            // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
            // the original object.
            func.apply(unwrap(this), args);
            return wrap(cursorRequestMap.get(this));
        };
    }
    return function (...args) {
        // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
        // the original object.
        return wrap(func.apply(unwrap(this), args));
    };
}
function transformCachableValue(value) {
    if (typeof value === 'function')
        return wrapFunction(value);
    // This doesn't return, it just creates a 'done' promise for the transaction,
    // which is later returned for transaction.done (see idbObjectHandler).
    if (value instanceof IDBTransaction)
        cacheDonePromiseForTransaction(value);
    if (instanceOfAny(value, getIdbProxyableTypes()))
        return new Proxy(value, idbProxyTraps);
    // Return the same value back if we're not going to transform it.
    return value;
}
function wrap(value) {
    // We sometimes generate multiple promises from a single IDBRequest (eg when cursoring), because
    // IDB is weird and a single IDBRequest can yield many responses, so these can't be cached.
    if (value instanceof IDBRequest)
        return promisifyRequest(value);
    // If we've already transformed this value before, reuse the transformed value.
    // This is faster, but it also provides object equality.
    if (transformCache.has(value))
        return transformCache.get(value);
    const newValue = transformCachableValue(value);
    // Not all types are transformed.
    // These may be primitive types, so they can't be WeakMap keys.
    if (newValue !== value) {
        transformCache.set(value, newValue);
        reverseTransformCache.set(newValue, value);
    }
    return newValue;
}
const unwrap = (value) => reverseTransformCache.get(value);

/**
 * Open a database.
 *
 * @param name Name of the database.
 * @param version Schema version.
 * @param callbacks Additional callbacks.
 */
function openDB(name, version, { blocked, upgrade, blocking, terminated } = {}) {
    const request = indexedDB.open(name, version);
    const openPromise = wrap(request);
    if (upgrade) {
        request.addEventListener('upgradeneeded', (event) => {
            upgrade(wrap(request.result), event.oldVersion, event.newVersion, wrap(request.transaction));
        });
    }
    if (blocked)
        request.addEventListener('blocked', () => blocked());
    openPromise
        .then((db) => {
        if (terminated)
            db.addEventListener('close', () => terminated());
        if (blocking)
            db.addEventListener('versionchange', () => blocking());
    })
        .catch(() => { });
    return openPromise;
}
/**
 * Delete a database.
 *
 * @param name Name of the database.
 */
function deleteDB(name, { blocked } = {}) {
    const request = indexedDB.deleteDatabase(name);
    if (blocked)
        request.addEventListener('blocked', () => blocked());
    return wrap(request).then(() => undefined);
}

const readMethods = ['get', 'getKey', 'getAll', 'getAllKeys', 'count'];
const writeMethods = ['put', 'add', 'delete', 'clear'];
const cachedMethods = new Map();
function getMethod(target, prop) {
    if (!(target instanceof IDBDatabase &&
        !(prop in target) &&
        typeof prop === 'string')) {
        return;
    }
    if (cachedMethods.get(prop))
        return cachedMethods.get(prop);
    const targetFuncName = prop.replace(/FromIndex$/, '');
    const useIndex = prop !== targetFuncName;
    const isWrite = writeMethods.includes(targetFuncName);
    if (
    // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
    !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) ||
        !(isWrite || readMethods.includes(targetFuncName))) {
        return;
    }
    const method = async function (storeName, ...args) {
        // isWrite ? 'readwrite' : undefined gzipps better, but fails in Edge :(
        const tx = this.transaction(storeName, isWrite ? 'readwrite' : 'readonly');
        let target = tx.store;
        if (useIndex)
            target = target.index(args.shift());
        // Must reject if op rejects.
        // If it's a write operation, must reject if tx.done rejects.
        // Must reject with op rejection first.
        // Must resolve with op value.
        // Must handle both promises (no unhandled rejections)
        return (await Promise.all([
            target[targetFuncName](...args),
            isWrite && tx.done,
        ]))[0];
    };
    cachedMethods.set(prop, method);
    return method;
}
replaceTraps((oldTraps) => ({
    ...oldTraps,
    get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
    has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop),
}));

const name$1 = "@firebase/installations";
const version$2 = "0.6.4";

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const PENDING_TIMEOUT_MS = 10000;
const PACKAGE_VERSION = `w:${version$2}`;
const INTERNAL_AUTH_VERSION = 'FIS_v2';
const INSTALLATIONS_API_URL = 'https://firebaseinstallations.googleapis.com/v1';
const TOKEN_EXPIRATION_BUFFER = 60 * 60 * 1000; // One hour
const SERVICE = 'installations';
const SERVICE_NAME = 'Installations';

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const ERROR_DESCRIPTION_MAP = {
    ["missing-app-config-values" /* ErrorCode.MISSING_APP_CONFIG_VALUES */]: 'Missing App configuration value: "{$valueName}"',
    ["not-registered" /* ErrorCode.NOT_REGISTERED */]: 'Firebase Installation is not registered.',
    ["installation-not-found" /* ErrorCode.INSTALLATION_NOT_FOUND */]: 'Firebase Installation not found.',
    ["request-failed" /* ErrorCode.REQUEST_FAILED */]: '{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',
    ["app-offline" /* ErrorCode.APP_OFFLINE */]: 'Could not process request. Application offline.',
    ["delete-pending-registration" /* ErrorCode.DELETE_PENDING_REGISTRATION */]: "Can't delete installation while there is a pending registration request."
};
const ERROR_FACTORY$1 = new ErrorFactory(SERVICE, SERVICE_NAME, ERROR_DESCRIPTION_MAP);
/** Returns true if error is a FirebaseError that is based on an error from the server. */
function isServerError(error) {
    return (error instanceof FirebaseError &&
        error.code.includes("request-failed" /* ErrorCode.REQUEST_FAILED */));
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function getInstallationsEndpoint({ projectId }) {
    return `${INSTALLATIONS_API_URL}/projects/${projectId}/installations`;
}
function extractAuthTokenInfoFromResponse(response) {
    return {
        token: response.token,
        requestStatus: 2 /* RequestStatus.COMPLETED */,
        expiresIn: getExpiresInFromResponseExpiresIn(response.expiresIn),
        creationTime: Date.now()
    };
}
async function getErrorFromResponse(requestName, response) {
    const responseJson = await response.json();
    const errorData = responseJson.error;
    return ERROR_FACTORY$1.create("request-failed" /* ErrorCode.REQUEST_FAILED */, {
        requestName,
        serverCode: errorData.code,
        serverMessage: errorData.message,
        serverStatus: errorData.status
    });
}
function getHeaders$1({ apiKey }) {
    return new Headers({
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-goog-api-key': apiKey
    });
}
function getHeadersWithAuth(appConfig, { refreshToken }) {
    const headers = getHeaders$1(appConfig);
    headers.append('Authorization', getAuthorizationHeader(refreshToken));
    return headers;
}
/**
 * Calls the passed in fetch wrapper and returns the response.
 * If the returned response has a status of 5xx, re-runs the function once and
 * returns the response.
 */
async function retryIfServerError(fn) {
    const result = await fn();
    if (result.status >= 500 && result.status < 600) {
        // Internal Server Error. Retry request.
        return fn();
    }
    return result;
}
function getExpiresInFromResponseExpiresIn(responseExpiresIn) {
    // This works because the server will never respond with fractions of a second.
    return Number(responseExpiresIn.replace('s', '000'));
}
function getAuthorizationHeader(refreshToken) {
    return `${INTERNAL_AUTH_VERSION} ${refreshToken}`;
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
async function createInstallationRequest({ appConfig, heartbeatServiceProvider }, { fid }) {
    const endpoint = getInstallationsEndpoint(appConfig);
    const headers = getHeaders$1(appConfig);
    // If heartbeat service exists, add the heartbeat string to the header.
    const heartbeatService = heartbeatServiceProvider.getImmediate({
        optional: true
    });
    if (heartbeatService) {
        const heartbeatsHeader = await heartbeatService.getHeartbeatsHeader();
        if (heartbeatsHeader) {
            headers.append('x-firebase-client', heartbeatsHeader);
        }
    }
    const body = {
        fid,
        authVersion: INTERNAL_AUTH_VERSION,
        appId: appConfig.appId,
        sdkVersion: PACKAGE_VERSION
    };
    const request = {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    };
    const response = await retryIfServerError(() => fetch(endpoint, request));
    if (response.ok) {
        const responseValue = await response.json();
        const registeredInstallationEntry = {
            fid: responseValue.fid || fid,
            registrationStatus: 2 /* RequestStatus.COMPLETED */,
            refreshToken: responseValue.refreshToken,
            authToken: extractAuthTokenInfoFromResponse(responseValue.authToken)
        };
        return registeredInstallationEntry;
    }
    else {
        throw await getErrorFromResponse('Create Installation', response);
    }
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/** Returns a promise that resolves after given time passes. */
function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function bufferToBase64UrlSafe(array) {
    const b64 = btoa(String.fromCharCode(...array));
    return b64.replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const VALID_FID_PATTERN = /^[cdef][\w-]{21}$/;
const INVALID_FID = '';
/**
 * Generates a new FID using random values from Web Crypto API.
 * Returns an empty string if FID generation fails for any reason.
 */
function generateFid() {
    try {
        // A valid FID has exactly 22 base64 characters, which is 132 bits, or 16.5
        // bytes. our implementation generates a 17 byte array instead.
        const fidByteArray = new Uint8Array(17);
        const crypto = self.crypto || self.msCrypto;
        crypto.getRandomValues(fidByteArray);
        // Replace the first 4 random bits with the constant FID header of 0b0111.
        fidByteArray[0] = 0b01110000 + (fidByteArray[0] % 0b00010000);
        const fid = encode(fidByteArray);
        return VALID_FID_PATTERN.test(fid) ? fid : INVALID_FID;
    }
    catch (_a) {
        // FID generation errored
        return INVALID_FID;
    }
}
/** Converts a FID Uint8Array to a base64 string representation. */
function encode(fidByteArray) {
    const b64String = bufferToBase64UrlSafe(fidByteArray);
    // Remove the 23rd character that was added because of the extra 4 bits at the
    // end of our 17 byte array, and the '=' padding.
    return b64String.substr(0, 22);
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/** Returns a string key that can be used to identify the app. */
function getKey(appConfig) {
    return `${appConfig.appName}!${appConfig.appId}`;
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const fidChangeCallbacks = new Map();
/**
 * Calls the onIdChange callbacks with the new FID value, and broadcasts the
 * change to other tabs.
 */
function fidChanged(appConfig, fid) {
    const key = getKey(appConfig);
    callFidChangeCallbacks(key, fid);
    broadcastFidChange(key, fid);
}
function addCallback(appConfig, callback) {
    // Open the broadcast channel if it's not already open,
    // to be able to listen to change events from other tabs.
    getBroadcastChannel();
    const key = getKey(appConfig);
    let callbackSet = fidChangeCallbacks.get(key);
    if (!callbackSet) {
        callbackSet = new Set();
        fidChangeCallbacks.set(key, callbackSet);
    }
    callbackSet.add(callback);
}
function removeCallback(appConfig, callback) {
    const key = getKey(appConfig);
    const callbackSet = fidChangeCallbacks.get(key);
    if (!callbackSet) {
        return;
    }
    callbackSet.delete(callback);
    if (callbackSet.size === 0) {
        fidChangeCallbacks.delete(key);
    }
    // Close broadcast channel if there are no more callbacks.
    closeBroadcastChannel();
}
function callFidChangeCallbacks(key, fid) {
    const callbacks = fidChangeCallbacks.get(key);
    if (!callbacks) {
        return;
    }
    for (const callback of callbacks) {
        callback(fid);
    }
}
function broadcastFidChange(key, fid) {
    const channel = getBroadcastChannel();
    if (channel) {
        channel.postMessage({ key, fid });
    }
    closeBroadcastChannel();
}
let broadcastChannel = null;
/** Opens and returns a BroadcastChannel if it is supported by the browser. */
function getBroadcastChannel() {
    if (!broadcastChannel && 'BroadcastChannel' in self) {
        broadcastChannel = new BroadcastChannel('[Firebase] FID Change');
        broadcastChannel.onmessage = e => {
            callFidChangeCallbacks(e.data.key, e.data.fid);
        };
    }
    return broadcastChannel;
}
function closeBroadcastChannel() {
    if (fidChangeCallbacks.size === 0 && broadcastChannel) {
        broadcastChannel.close();
        broadcastChannel = null;
    }
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const DATABASE_NAME = 'firebase-installations-database';
const DATABASE_VERSION = 1;
const OBJECT_STORE_NAME = 'firebase-installations-store';
let dbPromise = null;
function getDbPromise() {
    if (!dbPromise) {
        dbPromise = openDB(DATABASE_NAME, DATABASE_VERSION, {
            upgrade: (db, oldVersion) => {
                // We don't use 'break' in this switch statement, the fall-through
                // behavior is what we want, because if there are multiple versions between
                // the old version and the current version, we want ALL the migrations
                // that correspond to those versions to run, not only the last one.
                // eslint-disable-next-line default-case
                switch (oldVersion) {
                    case 0:
                        db.createObjectStore(OBJECT_STORE_NAME);
                }
            }
        });
    }
    return dbPromise;
}
/** Assigns or overwrites the record for the given key with the given value. */
async function set(appConfig, value) {
    const key = getKey(appConfig);
    const db = await getDbPromise();
    const tx = db.transaction(OBJECT_STORE_NAME, 'readwrite');
    const objectStore = tx.objectStore(OBJECT_STORE_NAME);
    const oldValue = (await objectStore.get(key));
    await objectStore.put(value, key);
    await tx.done;
    if (!oldValue || oldValue.fid !== value.fid) {
        fidChanged(appConfig, value.fid);
    }
    return value;
}
/** Removes record(s) from the objectStore that match the given key. */
async function remove(appConfig) {
    const key = getKey(appConfig);
    const db = await getDbPromise();
    const tx = db.transaction(OBJECT_STORE_NAME, 'readwrite');
    await tx.objectStore(OBJECT_STORE_NAME).delete(key);
    await tx.done;
}
/**
 * Atomically updates a record with the result of updateFn, which gets
 * called with the current value. If newValue is undefined, the record is
 * deleted instead.
 * @return Updated value
 */
async function update(appConfig, updateFn) {
    const key = getKey(appConfig);
    const db = await getDbPromise();
    const tx = db.transaction(OBJECT_STORE_NAME, 'readwrite');
    const store = tx.objectStore(OBJECT_STORE_NAME);
    const oldValue = (await store.get(key));
    const newValue = updateFn(oldValue);
    if (newValue === undefined) {
        await store.delete(key);
    }
    else {
        await store.put(newValue, key);
    }
    await tx.done;
    if (newValue && (!oldValue || oldValue.fid !== newValue.fid)) {
        fidChanged(appConfig, newValue.fid);
    }
    return newValue;
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Updates and returns the InstallationEntry from the database.
 * Also triggers a registration request if it is necessary and possible.
 */
async function getInstallationEntry(installations) {
    let registrationPromise;
    const installationEntry = await update(installations.appConfig, oldEntry => {
        const installationEntry = updateOrCreateInstallationEntry(oldEntry);
        const entryWithPromise = triggerRegistrationIfNecessary(installations, installationEntry);
        registrationPromise = entryWithPromise.registrationPromise;
        return entryWithPromise.installationEntry;
    });
    if (installationEntry.fid === INVALID_FID) {
        // FID generation failed. Waiting for the FID from the server.
        return { installationEntry: await registrationPromise };
    }
    return {
        installationEntry,
        registrationPromise
    };
}
/**
 * Creates a new Installation Entry if one does not exist.
 * Also clears timed out pending requests.
 */
function updateOrCreateInstallationEntry(oldEntry) {
    const entry = oldEntry || {
        fid: generateFid(),
        registrationStatus: 0 /* RequestStatus.NOT_STARTED */
    };
    return clearTimedOutRequest(entry);
}
/**
 * If the Firebase Installation is not registered yet, this will trigger the
 * registration and return an InProgressInstallationEntry.
 *
 * If registrationPromise does not exist, the installationEntry is guaranteed
 * to be registered.
 */
function triggerRegistrationIfNecessary(installations, installationEntry) {
    if (installationEntry.registrationStatus === 0 /* RequestStatus.NOT_STARTED */) {
        if (!navigator.onLine) {
            // Registration required but app is offline.
            const registrationPromiseWithError = Promise.reject(ERROR_FACTORY$1.create("app-offline" /* ErrorCode.APP_OFFLINE */));
            return {
                installationEntry,
                registrationPromise: registrationPromiseWithError
            };
        }
        // Try registering. Change status to IN_PROGRESS.
        const inProgressEntry = {
            fid: installationEntry.fid,
            registrationStatus: 1 /* RequestStatus.IN_PROGRESS */,
            registrationTime: Date.now()
        };
        const registrationPromise = registerInstallation(installations, inProgressEntry);
        return { installationEntry: inProgressEntry, registrationPromise };
    }
    else if (installationEntry.registrationStatus === 1 /* RequestStatus.IN_PROGRESS */) {
        return {
            installationEntry,
            registrationPromise: waitUntilFidRegistration(installations)
        };
    }
    else {
        return { installationEntry };
    }
}
/** This will be executed only once for each new Firebase Installation. */
async function registerInstallation(installations, installationEntry) {
    try {
        const registeredInstallationEntry = await createInstallationRequest(installations, installationEntry);
        return set(installations.appConfig, registeredInstallationEntry);
    }
    catch (e) {
        if (isServerError(e) && e.customData.serverCode === 409) {
            // Server returned a "FID can not be used" error.
            // Generate a new ID next time.
            await remove(installations.appConfig);
        }
        else {
            // Registration failed. Set FID as not registered.
            await set(installations.appConfig, {
                fid: installationEntry.fid,
                registrationStatus: 0 /* RequestStatus.NOT_STARTED */
            });
        }
        throw e;
    }
}
/** Call if FID registration is pending in another request. */
async function waitUntilFidRegistration(installations) {
    // Unfortunately, there is no way of reliably observing when a value in
    // IndexedDB changes (yet, see https://github.com/WICG/indexed-db-observers),
    // so we need to poll.
    let entry = await updateInstallationRequest(installations.appConfig);
    while (entry.registrationStatus === 1 /* RequestStatus.IN_PROGRESS */) {
        // createInstallation request still in progress.
        await sleep(100);
        entry = await updateInstallationRequest(installations.appConfig);
    }
    if (entry.registrationStatus === 0 /* RequestStatus.NOT_STARTED */) {
        // The request timed out or failed in a different call. Try again.
        const { installationEntry, registrationPromise } = await getInstallationEntry(installations);
        if (registrationPromise) {
            return registrationPromise;
        }
        else {
            // if there is no registrationPromise, entry is registered.
            return installationEntry;
        }
    }
    return entry;
}
/**
 * Called only if there is a CreateInstallation request in progress.
 *
 * Updates the InstallationEntry in the DB based on the status of the
 * CreateInstallation request.
 *
 * Returns the updated InstallationEntry.
 */
function updateInstallationRequest(appConfig) {
    return update(appConfig, oldEntry => {
        if (!oldEntry) {
            throw ERROR_FACTORY$1.create("installation-not-found" /* ErrorCode.INSTALLATION_NOT_FOUND */);
        }
        return clearTimedOutRequest(oldEntry);
    });
}
function clearTimedOutRequest(entry) {
    if (hasInstallationRequestTimedOut(entry)) {
        return {
            fid: entry.fid,
            registrationStatus: 0 /* RequestStatus.NOT_STARTED */
        };
    }
    return entry;
}
function hasInstallationRequestTimedOut(installationEntry) {
    return (installationEntry.registrationStatus === 1 /* RequestStatus.IN_PROGRESS */ &&
        installationEntry.registrationTime + PENDING_TIMEOUT_MS < Date.now());
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
async function generateAuthTokenRequest({ appConfig, heartbeatServiceProvider }, installationEntry) {
    const endpoint = getGenerateAuthTokenEndpoint(appConfig, installationEntry);
    const headers = getHeadersWithAuth(appConfig, installationEntry);
    // If heartbeat service exists, add the heartbeat string to the header.
    const heartbeatService = heartbeatServiceProvider.getImmediate({
        optional: true
    });
    if (heartbeatService) {
        const heartbeatsHeader = await heartbeatService.getHeartbeatsHeader();
        if (heartbeatsHeader) {
            headers.append('x-firebase-client', heartbeatsHeader);
        }
    }
    const body = {
        installation: {
            sdkVersion: PACKAGE_VERSION,
            appId: appConfig.appId
        }
    };
    const request = {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    };
    const response = await retryIfServerError(() => fetch(endpoint, request));
    if (response.ok) {
        const responseValue = await response.json();
        const completedAuthToken = extractAuthTokenInfoFromResponse(responseValue);
        return completedAuthToken;
    }
    else {
        throw await getErrorFromResponse('Generate Auth Token', response);
    }
}
function getGenerateAuthTokenEndpoint(appConfig, { fid }) {
    return `${getInstallationsEndpoint(appConfig)}/${fid}/authTokens:generate`;
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Returns a valid authentication token for the installation. Generates a new
 * token if one doesn't exist, is expired or about to expire.
 *
 * Should only be called if the Firebase Installation is registered.
 */
async function refreshAuthToken(installations, forceRefresh = false) {
    let tokenPromise;
    const entry = await update(installations.appConfig, oldEntry => {
        if (!isEntryRegistered(oldEntry)) {
            throw ERROR_FACTORY$1.create("not-registered" /* ErrorCode.NOT_REGISTERED */);
        }
        const oldAuthToken = oldEntry.authToken;
        if (!forceRefresh && isAuthTokenValid(oldAuthToken)) {
            // There is a valid token in the DB.
            return oldEntry;
        }
        else if (oldAuthToken.requestStatus === 1 /* RequestStatus.IN_PROGRESS */) {
            // There already is a token request in progress.
            tokenPromise = waitUntilAuthTokenRequest(installations, forceRefresh);
            return oldEntry;
        }
        else {
            // No token or token expired.
            if (!navigator.onLine) {
                throw ERROR_FACTORY$1.create("app-offline" /* ErrorCode.APP_OFFLINE */);
            }
            const inProgressEntry = makeAuthTokenRequestInProgressEntry(oldEntry);
            tokenPromise = fetchAuthTokenFromServer(installations, inProgressEntry);
            return inProgressEntry;
        }
    });
    const authToken = tokenPromise
        ? await tokenPromise
        : entry.authToken;
    return authToken;
}
/**
 * Call only if FID is registered and Auth Token request is in progress.
 *
 * Waits until the current pending request finishes. If the request times out,
 * tries once in this thread as well.
 */
async function waitUntilAuthTokenRequest(installations, forceRefresh) {
    // Unfortunately, there is no way of reliably observing when a value in
    // IndexedDB changes (yet, see https://github.com/WICG/indexed-db-observers),
    // so we need to poll.
    let entry = await updateAuthTokenRequest(installations.appConfig);
    while (entry.authToken.requestStatus === 1 /* RequestStatus.IN_PROGRESS */) {
        // generateAuthToken still in progress.
        await sleep(100);
        entry = await updateAuthTokenRequest(installations.appConfig);
    }
    const authToken = entry.authToken;
    if (authToken.requestStatus === 0 /* RequestStatus.NOT_STARTED */) {
        // The request timed out or failed in a different call. Try again.
        return refreshAuthToken(installations, forceRefresh);
    }
    else {
        return authToken;
    }
}
/**
 * Called only if there is a GenerateAuthToken request in progress.
 *
 * Updates the InstallationEntry in the DB based on the status of the
 * GenerateAuthToken request.
 *
 * Returns the updated InstallationEntry.
 */
function updateAuthTokenRequest(appConfig) {
    return update(appConfig, oldEntry => {
        if (!isEntryRegistered(oldEntry)) {
            throw ERROR_FACTORY$1.create("not-registered" /* ErrorCode.NOT_REGISTERED */);
        }
        const oldAuthToken = oldEntry.authToken;
        if (hasAuthTokenRequestTimedOut(oldAuthToken)) {
            return Object.assign(Object.assign({}, oldEntry), { authToken: { requestStatus: 0 /* RequestStatus.NOT_STARTED */ } });
        }
        return oldEntry;
    });
}
async function fetchAuthTokenFromServer(installations, installationEntry) {
    try {
        const authToken = await generateAuthTokenRequest(installations, installationEntry);
        const updatedInstallationEntry = Object.assign(Object.assign({}, installationEntry), { authToken });
        await set(installations.appConfig, updatedInstallationEntry);
        return authToken;
    }
    catch (e) {
        if (isServerError(e) &&
            (e.customData.serverCode === 401 || e.customData.serverCode === 404)) {
            // Server returned a "FID not found" or a "Invalid authentication" error.
            // Generate a new ID next time.
            await remove(installations.appConfig);
        }
        else {
            const updatedInstallationEntry = Object.assign(Object.assign({}, installationEntry), { authToken: { requestStatus: 0 /* RequestStatus.NOT_STARTED */ } });
            await set(installations.appConfig, updatedInstallationEntry);
        }
        throw e;
    }
}
function isEntryRegistered(installationEntry) {
    return (installationEntry !== undefined &&
        installationEntry.registrationStatus === 2 /* RequestStatus.COMPLETED */);
}
function isAuthTokenValid(authToken) {
    return (authToken.requestStatus === 2 /* RequestStatus.COMPLETED */ &&
        !isAuthTokenExpired(authToken));
}
function isAuthTokenExpired(authToken) {
    const now = Date.now();
    return (now < authToken.creationTime ||
        authToken.creationTime + authToken.expiresIn < now + TOKEN_EXPIRATION_BUFFER);
}
/** Returns an updated InstallationEntry with an InProgressAuthToken. */
function makeAuthTokenRequestInProgressEntry(oldEntry) {
    const inProgressAuthToken = {
        requestStatus: 1 /* RequestStatus.IN_PROGRESS */,
        requestTime: Date.now()
    };
    return Object.assign(Object.assign({}, oldEntry), { authToken: inProgressAuthToken });
}
function hasAuthTokenRequestTimedOut(authToken) {
    return (authToken.requestStatus === 1 /* RequestStatus.IN_PROGRESS */ &&
        authToken.requestTime + PENDING_TIMEOUT_MS < Date.now());
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Creates a Firebase Installation if there isn't one for the app and
 * returns the Installation ID.
 * @param installations - The `Installations` instance.
 *
 * @public
 */
async function getId(installations) {
    const installationsImpl = installations;
    const { installationEntry, registrationPromise } = await getInstallationEntry(installationsImpl);
    if (registrationPromise) {
        registrationPromise.catch(console.error);
    }
    else {
        // If the installation is already registered, update the authentication
        // token if needed.
        refreshAuthToken(installationsImpl).catch(console.error);
    }
    return installationEntry.fid;
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Returns a Firebase Installations auth token, identifying the current
 * Firebase Installation.
 * @param installations - The `Installations` instance.
 * @param forceRefresh - Force refresh regardless of token expiration.
 *
 * @public
 */
async function getToken(installations, forceRefresh = false) {
    const installationsImpl = installations;
    await completeInstallationRegistration(installationsImpl);
    // At this point we either have a Registered Installation in the DB, or we've
    // already thrown an error.
    const authToken = await refreshAuthToken(installationsImpl, forceRefresh);
    return authToken.token;
}
async function completeInstallationRegistration(installations) {
    const { registrationPromise } = await getInstallationEntry(installations);
    if (registrationPromise) {
        // A createInstallation request is in progress. Wait until it finishes.
        await registrationPromise;
    }
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
async function deleteInstallationRequest(appConfig, installationEntry) {
    const endpoint = getDeleteEndpoint(appConfig, installationEntry);
    const headers = getHeadersWithAuth(appConfig, installationEntry);
    const request = {
        method: 'DELETE',
        headers
    };
    const response = await retryIfServerError(() => fetch(endpoint, request));
    if (!response.ok) {
        throw await getErrorFromResponse('Delete Installation', response);
    }
}
function getDeleteEndpoint(appConfig, { fid }) {
    return `${getInstallationsEndpoint(appConfig)}/${fid}`;
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Deletes the Firebase Installation and all associated data.
 * @param installations - The `Installations` instance.
 *
 * @public
 */
async function deleteInstallations(installations) {
    const { appConfig } = installations;
    const entry = await update(appConfig, oldEntry => {
        if (oldEntry && oldEntry.registrationStatus === 0 /* RequestStatus.NOT_STARTED */) {
            // Delete the unregistered entry without sending a deleteInstallation request.
            return undefined;
        }
        return oldEntry;
    });
    if (entry) {
        if (entry.registrationStatus === 1 /* RequestStatus.IN_PROGRESS */) {
            // Can't delete while trying to register.
            throw ERROR_FACTORY$1.create("delete-pending-registration" /* ErrorCode.DELETE_PENDING_REGISTRATION */);
        }
        else if (entry.registrationStatus === 2 /* RequestStatus.COMPLETED */) {
            if (!navigator.onLine) {
                throw ERROR_FACTORY$1.create("app-offline" /* ErrorCode.APP_OFFLINE */);
            }
            else {
                await deleteInstallationRequest(appConfig, entry);
                await remove(appConfig);
            }
        }
    }
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Sets a new callback that will get called when Installation ID changes.
 * Returns an unsubscribe function that will remove the callback when called.
 * @param installations - The `Installations` instance.
 * @param callback - The callback function that is invoked when FID changes.
 * @returns A function that can be called to unsubscribe.
 *
 * @public
 */
function onIdChange(installations, callback) {
    const { appConfig } = installations;
    addCallback(appConfig, callback);
    return () => {
        removeCallback(appConfig, callback);
    };
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Returns an instance of {@link Installations} associated with the given
 * {@link @firebase/app#FirebaseApp} instance.
 * @param app - The {@link @firebase/app#FirebaseApp} instance.
 *
 * @public
 */
function getInstallations(app = getApp()) {
    const installationsImpl = _getProvider(app, 'installations').getImmediate();
    return installationsImpl;
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function extractAppConfig(app) {
    if (!app || !app.options) {
        throw getMissingValueError('App Configuration');
    }
    if (!app.name) {
        throw getMissingValueError('App Name');
    }
    // Required app config keys
    const configKeys = [
        'projectId',
        'apiKey',
        'appId'
    ];
    for (const keyName of configKeys) {
        if (!app.options[keyName]) {
            throw getMissingValueError(keyName);
        }
    }
    return {
        appName: app.name,
        projectId: app.options.projectId,
        apiKey: app.options.apiKey,
        appId: app.options.appId
    };
}
function getMissingValueError(valueName) {
    return ERROR_FACTORY$1.create("missing-app-config-values" /* ErrorCode.MISSING_APP_CONFIG_VALUES */, {
        valueName
    });
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const INSTALLATIONS_NAME = 'installations';
const INSTALLATIONS_NAME_INTERNAL = 'installations-internal';
const publicFactory = (container) => {
    const app = container.getProvider('app').getImmediate();
    // Throws if app isn't configured properly.
    const appConfig = extractAppConfig(app);
    const heartbeatServiceProvider = _getProvider(app, 'heartbeat');
    const installationsImpl = {
        app,
        appConfig,
        heartbeatServiceProvider,
        _delete: () => Promise.resolve()
    };
    return installationsImpl;
};
const internalFactory = (container) => {
    const app = container.getProvider('app').getImmediate();
    // Internal FIS instance relies on public FIS instance.
    const installations = _getProvider(app, INSTALLATIONS_NAME).getImmediate();
    const installationsInternal = {
        getId: () => getId(installations),
        getToken: (forceRefresh) => getToken(installations, forceRefresh)
    };
    return installationsInternal;
};
function registerInstallations() {
    _registerComponent(new Component(INSTALLATIONS_NAME, publicFactory, "PUBLIC" /* ComponentType.PUBLIC */));
    _registerComponent(new Component(INSTALLATIONS_NAME_INTERNAL, internalFactory, "PRIVATE" /* ComponentType.PRIVATE */));
}

/**
 * Firebase Installations
 *
 * @packageDocumentation
 */
registerInstallations();
registerVersion(name$1, version$2);
// BUILD_TARGET will be replaced by values like esm5, esm2017, cjs5, etc during the compilation
registerVersion(name$1, version$2, 'esm2017');

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Type constant for Firebase Analytics.
 */
const ANALYTICS_TYPE = 'analytics';
// Key to attach FID to in gtag params.
const GA_FID_KEY = 'firebase_id';
const ORIGIN_KEY = 'origin';
const FETCH_TIMEOUT_MILLIS = 60 * 1000;
const DYNAMIC_CONFIG_URL = 'https://firebase.googleapis.com/v1alpha/projects/-/apps/{app-id}/webConfig';
const GTAG_URL = 'https://www.googletagmanager.com/gtag/js';

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const logger = new Logger('@firebase/analytics');

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const ERRORS = {
    ["already-exists" /* AnalyticsError.ALREADY_EXISTS */]: 'A Firebase Analytics instance with the appId {$id} ' +
        ' already exists. ' +
        'Only one Firebase Analytics instance can be created for each appId.',
    ["already-initialized" /* AnalyticsError.ALREADY_INITIALIZED */]: 'initializeAnalytics() cannot be called again with different options than those ' +
        'it was initially called with. It can be called again with the same options to ' +
        'return the existing instance, or getAnalytics() can be used ' +
        'to get a reference to the already-intialized instance.',
    ["already-initialized-settings" /* AnalyticsError.ALREADY_INITIALIZED_SETTINGS */]: 'Firebase Analytics has already been initialized.' +
        'settings() must be called before initializing any Analytics instance' +
        'or it will have no effect.',
    ["interop-component-reg-failed" /* AnalyticsError.INTEROP_COMPONENT_REG_FAILED */]: 'Firebase Analytics Interop Component failed to instantiate: {$reason}',
    ["invalid-analytics-context" /* AnalyticsError.INVALID_ANALYTICS_CONTEXT */]: 'Firebase Analytics is not supported in this environment. ' +
        'Wrap initialization of analytics in analytics.isSupported() ' +
        'to prevent initialization in unsupported environments. Details: {$errorInfo}',
    ["indexeddb-unavailable" /* AnalyticsError.INDEXEDDB_UNAVAILABLE */]: 'IndexedDB unavailable or restricted in this environment. ' +
        'Wrap initialization of analytics in analytics.isSupported() ' +
        'to prevent initialization in unsupported environments. Details: {$errorInfo}',
    ["fetch-throttle" /* AnalyticsError.FETCH_THROTTLE */]: 'The config fetch request timed out while in an exponential backoff state.' +
        ' Unix timestamp in milliseconds when fetch request throttling ends: {$throttleEndTimeMillis}.',
    ["config-fetch-failed" /* AnalyticsError.CONFIG_FETCH_FAILED */]: 'Dynamic config fetch failed: [{$httpStatus}] {$responseMessage}',
    ["no-api-key" /* AnalyticsError.NO_API_KEY */]: 'The "apiKey" field is empty in the local Firebase config. Firebase Analytics requires this field to' +
        'contain a valid API key.',
    ["no-app-id" /* AnalyticsError.NO_APP_ID */]: 'The "appId" field is empty in the local Firebase config. Firebase Analytics requires this field to' +
        'contain a valid app ID.',
    ["no-client-id" /* AnalyticsError.NO_CLIENT_ID */]: 'The "client_id" field is empty.',
    ["invalid-gtag-resource" /* AnalyticsError.INVALID_GTAG_RESOURCE */]: 'Trusted Types detected an invalid gtag resource: {$gtagURL}.'
};
const ERROR_FACTORY = new ErrorFactory('analytics', 'Analytics', ERRORS);

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Verifies and creates a TrustedScriptURL.
 */
function createGtagTrustedTypesScriptURL(url) {
    if (!url.startsWith(GTAG_URL)) {
        const err = ERROR_FACTORY.create("invalid-gtag-resource" /* AnalyticsError.INVALID_GTAG_RESOURCE */, {
            gtagURL: url
        });
        logger.warn(err.message);
        return '';
    }
    return url;
}
/**
 * Makeshift polyfill for Promise.allSettled(). Resolves when all promises
 * have either resolved or rejected.
 *
 * @param promises Array of promises to wait for.
 */
function promiseAllSettled(promises) {
    return Promise.all(promises.map(promise => promise.catch(e => e)));
}
/**
 * Creates a TrustedTypePolicy object that implements the rules passed as policyOptions.
 *
 * @param policyName A string containing the name of the policy
 * @param policyOptions Object containing implementations of instance methods for TrustedTypesPolicy, see {@link https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicy#instance_methods
 * | the TrustedTypePolicy reference documentation}.
 */
function createTrustedTypesPolicy(policyName, policyOptions) {
    // Create a TrustedTypes policy that we can use for updating src
    // properties
    let trustedTypesPolicy;
    if (window.trustedTypes) {
        trustedTypesPolicy = window.trustedTypes.createPolicy(policyName, policyOptions);
    }
    return trustedTypesPolicy;
}
/**
 * Inserts gtag script tag into the page to asynchronously download gtag.
 * @param dataLayerName Name of datalayer (most often the default, "_dataLayer").
 */
function insertScriptTag(dataLayerName, measurementId) {
    const trustedTypesPolicy = createTrustedTypesPolicy('firebase-js-sdk-policy', {
        createScriptURL: createGtagTrustedTypesScriptURL
    });
    const script = document.createElement('script');
    // We are not providing an analyticsId in the URL because it would trigger a `page_view`
    // without fid. We will initialize ga-id using gtag (config) command together with fid.
    const gtagScriptURL = `${GTAG_URL}?l=${dataLayerName}&id=${measurementId}`;
    script.src = trustedTypesPolicy
        ? trustedTypesPolicy === null || trustedTypesPolicy === void 0 ? void 0 : trustedTypesPolicy.createScriptURL(gtagScriptURL)
        : gtagScriptURL;
    script.async = true;
    document.head.appendChild(script);
}
/**
 * Get reference to, or create, global datalayer.
 * @param dataLayerName Name of datalayer (most often the default, "_dataLayer").
 */
function getOrCreateDataLayer(dataLayerName) {
    // Check for existing dataLayer and create if needed.
    let dataLayer = [];
    if (Array.isArray(window[dataLayerName])) {
        dataLayer = window[dataLayerName];
    }
    else {
        window[dataLayerName] = dataLayer;
    }
    return dataLayer;
}
/**
 * Wrapped gtag logic when gtag is called with 'config' command.
 *
 * @param gtagCore Basic gtag function that just appends to dataLayer.
 * @param initializationPromisesMap Map of appIds to their initialization promises.
 * @param dynamicConfigPromisesList Array of dynamic config fetch promises.
 * @param measurementIdToAppId Map of GA measurementIDs to corresponding Firebase appId.
 * @param measurementId GA Measurement ID to set config for.
 * @param gtagParams Gtag config params to set.
 */
async function gtagOnConfig(gtagCore, initializationPromisesMap, dynamicConfigPromisesList, measurementIdToAppId, measurementId, gtagParams) {
    // If config is already fetched, we know the appId and can use it to look up what FID promise we
    /// are waiting for, and wait only on that one.
    const correspondingAppId = measurementIdToAppId[measurementId];
    try {
        if (correspondingAppId) {
            await initializationPromisesMap[correspondingAppId];
        }
        else {
            // If config is not fetched yet, wait for all configs (we don't know which one we need) and
            // find the appId (if any) corresponding to this measurementId. If there is one, wait on
            // that appId's initialization promise. If there is none, promise resolves and gtag
            // call goes through.
            const dynamicConfigResults = await promiseAllSettled(dynamicConfigPromisesList);
            const foundConfig = dynamicConfigResults.find(config => config.measurementId === measurementId);
            if (foundConfig) {
                await initializationPromisesMap[foundConfig.appId];
            }
        }
    }
    catch (e) {
        logger.error(e);
    }
    gtagCore("config" /* GtagCommand.CONFIG */, measurementId, gtagParams);
}
/**
 * Wrapped gtag logic when gtag is called with 'event' command.
 *
 * @param gtagCore Basic gtag function that just appends to dataLayer.
 * @param initializationPromisesMap Map of appIds to their initialization promises.
 * @param dynamicConfigPromisesList Array of dynamic config fetch promises.
 * @param measurementId GA Measurement ID to log event to.
 * @param gtagParams Params to log with this event.
 */
async function gtagOnEvent(gtagCore, initializationPromisesMap, dynamicConfigPromisesList, measurementId, gtagParams) {
    try {
        let initializationPromisesToWaitFor = [];
        // If there's a 'send_to' param, check if any ID specified matches
        // an initializeIds() promise we are waiting for.
        if (gtagParams && gtagParams['send_to']) {
            let gaSendToList = gtagParams['send_to'];
            // Make it an array if is isn't, so it can be dealt with the same way.
            if (!Array.isArray(gaSendToList)) {
                gaSendToList = [gaSendToList];
            }
            // Checking 'send_to' fields requires having all measurement ID results back from
            // the dynamic config fetch.
            const dynamicConfigResults = await promiseAllSettled(dynamicConfigPromisesList);
            for (const sendToId of gaSendToList) {
                // Any fetched dynamic measurement ID that matches this 'send_to' ID
                const foundConfig = dynamicConfigResults.find(config => config.measurementId === sendToId);
                const initializationPromise = foundConfig && initializationPromisesMap[foundConfig.appId];
                if (initializationPromise) {
                    initializationPromisesToWaitFor.push(initializationPromise);
                }
                else {
                    // Found an item in 'send_to' that is not associated
                    // directly with an FID, possibly a group.  Empty this array,
                    // exit the loop early, and let it get populated below.
                    initializationPromisesToWaitFor = [];
                    break;
                }
            }
        }
        // This will be unpopulated if there was no 'send_to' field , or
        // if not all entries in the 'send_to' field could be mapped to
        // a FID. In these cases, wait on all pending initialization promises.
        if (initializationPromisesToWaitFor.length === 0) {
            initializationPromisesToWaitFor = Object.values(initializationPromisesMap);
        }
        // Run core gtag function with args after all relevant initialization
        // promises have been resolved.
        await Promise.all(initializationPromisesToWaitFor);
        // Workaround for http://b/141370449 - third argument cannot be undefined.
        gtagCore("event" /* GtagCommand.EVENT */, measurementId, gtagParams || {});
    }
    catch (e) {
        logger.error(e);
    }
}
/**
 * Wraps a standard gtag function with extra code to wait for completion of
 * relevant initialization promises before sending requests.
 *
 * @param gtagCore Basic gtag function that just appends to dataLayer.
 * @param initializationPromisesMap Map of appIds to their initialization promises.
 * @param dynamicConfigPromisesList Array of dynamic config fetch promises.
 * @param measurementIdToAppId Map of GA measurementIDs to corresponding Firebase appId.
 */
function wrapGtag(gtagCore, 
/**
 * Allows wrapped gtag calls to wait on whichever intialization promises are required,
 * depending on the contents of the gtag params' `send_to` field, if any.
 */
initializationPromisesMap, 
/**
 * Wrapped gtag calls sometimes require all dynamic config fetches to have returned
 * before determining what initialization promises (which include FIDs) to wait for.
 */
dynamicConfigPromisesList, 
/**
 * Wrapped gtag config calls can narrow down which initialization promise (with FID)
 * to wait for if the measurementId is already fetched, by getting the corresponding appId,
 * which is the key for the initialization promises map.
 */
measurementIdToAppId) {
    /**
     * Wrapper around gtag that ensures FID is sent with gtag calls.
     * @param command Gtag command type.
     * @param idOrNameOrParams Measurement ID if command is EVENT/CONFIG, params if command is SET.
     * @param gtagParams Params if event is EVENT/CONFIG.
     */
    async function gtagWrapper(command, ...args) {
        try {
            // If event, check that relevant initialization promises have completed.
            if (command === "event" /* GtagCommand.EVENT */) {
                const [measurementId, gtagParams] = args;
                // If EVENT, second arg must be measurementId.
                await gtagOnEvent(gtagCore, initializationPromisesMap, dynamicConfigPromisesList, measurementId, gtagParams);
            }
            else if (command === "config" /* GtagCommand.CONFIG */) {
                const [measurementId, gtagParams] = args;
                // If CONFIG, second arg must be measurementId.
                await gtagOnConfig(gtagCore, initializationPromisesMap, dynamicConfigPromisesList, measurementIdToAppId, measurementId, gtagParams);
            }
            else if (command === "consent" /* GtagCommand.CONSENT */) {
                const [gtagParams] = args;
                gtagCore("consent" /* GtagCommand.CONSENT */, 'update', gtagParams);
            }
            else if (command === "get" /* GtagCommand.GET */) {
                const [measurementId, fieldName, callback] = args;
                gtagCore("get" /* GtagCommand.GET */, measurementId, fieldName, callback);
            }
            else if (command === "set" /* GtagCommand.SET */) {
                const [customParams] = args;
                // If SET, second arg must be params.
                gtagCore("set" /* GtagCommand.SET */, customParams);
            }
            else {
                gtagCore(command, ...args);
            }
        }
        catch (e) {
            logger.error(e);
        }
    }
    return gtagWrapper;
}
/**
 * Creates global gtag function or wraps existing one if found.
 * This wrapped function attaches Firebase instance ID (FID) to gtag 'config' and
 * 'event' calls that belong to the GAID associated with this Firebase instance.
 *
 * @param initializationPromisesMap Map of appIds to their initialization promises.
 * @param dynamicConfigPromisesList Array of dynamic config fetch promises.
 * @param measurementIdToAppId Map of GA measurementIDs to corresponding Firebase appId.
 * @param dataLayerName Name of global GA datalayer array.
 * @param gtagFunctionName Name of global gtag function ("gtag" if not user-specified).
 */
function wrapOrCreateGtag(initializationPromisesMap, dynamicConfigPromisesList, measurementIdToAppId, dataLayerName, gtagFunctionName) {
    // Create a basic core gtag function
    let gtagCore = function (..._args) {
        // Must push IArguments object, not an array.
        window[dataLayerName].push(arguments);
    };
    // Replace it with existing one if found
    if (window[gtagFunctionName] &&
        typeof window[gtagFunctionName] === 'function') {
        // @ts-ignore
        gtagCore = window[gtagFunctionName];
    }
    window[gtagFunctionName] = wrapGtag(gtagCore, initializationPromisesMap, dynamicConfigPromisesList, measurementIdToAppId);
    return {
        gtagCore,
        wrappedGtag: window[gtagFunctionName]
    };
}
/**
 * Returns the script tag in the DOM matching both the gtag url pattern
 * and the provided data layer name.
 */
function findGtagScriptOnPage(dataLayerName) {
    const scriptTags = window.document.getElementsByTagName('script');
    for (const tag of Object.values(scriptTags)) {
        if (tag.src &&
            tag.src.includes(GTAG_URL) &&
            tag.src.includes(dataLayerName)) {
            return tag;
        }
    }
    return null;
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Backoff factor for 503 errors, which we want to be conservative about
 * to avoid overloading servers. Each retry interval will be
 * BASE_INTERVAL_MILLIS * LONG_RETRY_FACTOR ^ retryCount, so the second one
 * will be ~30 seconds (with fuzzing).
 */
const LONG_RETRY_FACTOR = 30;
/**
 * Base wait interval to multiplied by backoffFactor^backoffCount.
 */
const BASE_INTERVAL_MILLIS = 1000;
/**
 * Stubbable retry data storage class.
 */
class RetryData {
    constructor(throttleMetadata = {}, intervalMillis = BASE_INTERVAL_MILLIS) {
        this.throttleMetadata = throttleMetadata;
        this.intervalMillis = intervalMillis;
    }
    getThrottleMetadata(appId) {
        return this.throttleMetadata[appId];
    }
    setThrottleMetadata(appId, metadata) {
        this.throttleMetadata[appId] = metadata;
    }
    deleteThrottleMetadata(appId) {
        delete this.throttleMetadata[appId];
    }
}
const defaultRetryData = new RetryData();
/**
 * Set GET request headers.
 * @param apiKey App API key.
 */
function getHeaders(apiKey) {
    return new Headers({
        Accept: 'application/json',
        'x-goog-api-key': apiKey
    });
}
/**
 * Fetches dynamic config from backend.
 * @param app Firebase app to fetch config for.
 */
async function fetchDynamicConfig(appFields) {
    var _a;
    const { appId, apiKey } = appFields;
    const request = {
        method: 'GET',
        headers: getHeaders(apiKey)
    };
    const appUrl = DYNAMIC_CONFIG_URL.replace('{app-id}', appId);
    const response = await fetch(appUrl, request);
    if (response.status !== 200 && response.status !== 304) {
        let errorMessage = '';
        try {
            // Try to get any error message text from server response.
            const jsonResponse = (await response.json());
            if ((_a = jsonResponse.error) === null || _a === void 0 ? void 0 : _a.message) {
                errorMessage = jsonResponse.error.message;
            }
        }
        catch (_ignored) { }
        throw ERROR_FACTORY.create("config-fetch-failed" /* AnalyticsError.CONFIG_FETCH_FAILED */, {
            httpStatus: response.status,
            responseMessage: errorMessage
        });
    }
    return response.json();
}
/**
 * Fetches dynamic config from backend, retrying if failed.
 * @param app Firebase app to fetch config for.
 */
async function fetchDynamicConfigWithRetry(app, 
// retryData and timeoutMillis are parameterized to allow passing a different value for testing.
retryData = defaultRetryData, timeoutMillis) {
    const { appId, apiKey, measurementId } = app.options;
    if (!appId) {
        throw ERROR_FACTORY.create("no-app-id" /* AnalyticsError.NO_APP_ID */);
    }
    if (!apiKey) {
        if (measurementId) {
            return {
                measurementId,
                appId
            };
        }
        throw ERROR_FACTORY.create("no-api-key" /* AnalyticsError.NO_API_KEY */);
    }
    const throttleMetadata = retryData.getThrottleMetadata(appId) || {
        backoffCount: 0,
        throttleEndTimeMillis: Date.now()
    };
    const signal = new AnalyticsAbortSignal();
    setTimeout(async () => {
        // Note a very low delay, eg < 10ms, can elapse before listeners are initialized.
        signal.abort();
    }, timeoutMillis !== undefined ? timeoutMillis : FETCH_TIMEOUT_MILLIS);
    return attemptFetchDynamicConfigWithRetry({ appId, apiKey, measurementId }, throttleMetadata, signal, retryData);
}
/**
 * Runs one retry attempt.
 * @param appFields Necessary app config fields.
 * @param throttleMetadata Ongoing metadata to determine throttling times.
 * @param signal Abort signal.
 */
async function attemptFetchDynamicConfigWithRetry(appFields, { throttleEndTimeMillis, backoffCount }, signal, retryData = defaultRetryData // for testing
) {
    var _a;
    const { appId, measurementId } = appFields;
    // Starts with a (potentially zero) timeout to support resumption from stored state.
    // Ensures the throttle end time is honored if the last attempt timed out.
    // Note the SDK will never make a request if the fetch timeout expires at this point.
    try {
        await setAbortableTimeout(signal, throttleEndTimeMillis);
    }
    catch (e) {
        if (measurementId) {
            logger.warn(`Timed out fetching this Firebase app's measurement ID from the server.` +
                ` Falling back to the measurement ID ${measurementId}` +
                ` provided in the "measurementId" field in the local Firebase config. [${e === null || e === void 0 ? void 0 : e.message}]`);
            return { appId, measurementId };
        }
        throw e;
    }
    try {
        const response = await fetchDynamicConfig(appFields);
        // Note the SDK only clears throttle state if response is success or non-retriable.
        retryData.deleteThrottleMetadata(appId);
        return response;
    }
    catch (e) {
        const error = e;
        if (!isRetriableError(error)) {
            retryData.deleteThrottleMetadata(appId);
            if (measurementId) {
                logger.warn(`Failed to fetch this Firebase app's measurement ID from the server.` +
                    ` Falling back to the measurement ID ${measurementId}` +
                    ` provided in the "measurementId" field in the local Firebase config. [${error === null || error === void 0 ? void 0 : error.message}]`);
                return { appId, measurementId };
            }
            else {
                throw e;
            }
        }
        const backoffMillis = Number((_a = error === null || error === void 0 ? void 0 : error.customData) === null || _a === void 0 ? void 0 : _a.httpStatus) === 503
            ? calculateBackoffMillis(backoffCount, retryData.intervalMillis, LONG_RETRY_FACTOR)
            : calculateBackoffMillis(backoffCount, retryData.intervalMillis);
        // Increments backoff state.
        const throttleMetadata = {
            throttleEndTimeMillis: Date.now() + backoffMillis,
            backoffCount: backoffCount + 1
        };
        // Persists state.
        retryData.setThrottleMetadata(appId, throttleMetadata);
        logger.debug(`Calling attemptFetch again in ${backoffMillis} millis`);
        return attemptFetchDynamicConfigWithRetry(appFields, throttleMetadata, signal, retryData);
    }
}
/**
 * Supports waiting on a backoff by:
 *
 * <ul>
 *   <li>Promisifying setTimeout, so we can set a timeout in our Promise chain</li>
 *   <li>Listening on a signal bus for abort events, just like the Fetch API</li>
 *   <li>Failing in the same way the Fetch API fails, so timing out a live request and a throttled
 *       request appear the same.</li>
 * </ul>
 *
 * <p>Visible for testing.
 */
function setAbortableTimeout(signal, throttleEndTimeMillis) {
    return new Promise((resolve, reject) => {
        // Derives backoff from given end time, normalizing negative numbers to zero.
        const backoffMillis = Math.max(throttleEndTimeMillis - Date.now(), 0);
        const timeout = setTimeout(resolve, backoffMillis);
        // Adds listener, rather than sets onabort, because signal is a shared object.
        signal.addEventListener(() => {
            clearTimeout(timeout);
            // If the request completes before this timeout, the rejection has no effect.
            reject(ERROR_FACTORY.create("fetch-throttle" /* AnalyticsError.FETCH_THROTTLE */, {
                throttleEndTimeMillis
            }));
        });
    });
}
/**
 * Returns true if the {@link Error} indicates a fetch request may succeed later.
 */
function isRetriableError(e) {
    if (!(e instanceof FirebaseError) || !e.customData) {
        return false;
    }
    // Uses string index defined by ErrorData, which FirebaseError implements.
    const httpStatus = Number(e.customData['httpStatus']);
    return (httpStatus === 429 ||
        httpStatus === 500 ||
        httpStatus === 503 ||
        httpStatus === 504);
}
/**
 * Shims a minimal AbortSignal (copied from Remote Config).
 *
 * <p>AbortController's AbortSignal conveniently decouples fetch timeout logic from other aspects
 * of networking, such as retries. Firebase doesn't use AbortController enough to justify a
 * polyfill recommendation, like we do with the Fetch API, but this minimal shim can easily be
 * swapped out if/when we do.
 */
class AnalyticsAbortSignal {
    constructor() {
        this.listeners = [];
    }
    addEventListener(listener) {
        this.listeners.push(listener);
    }
    abort() {
        this.listeners.forEach(listener => listener());
    }
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Event parameters to set on 'gtag' during initialization.
 */
let defaultEventParametersForInit;
/**
 * Logs an analytics event through the Firebase SDK.
 *
 * @param gtagFunction Wrapped gtag function that waits for fid to be set before sending an event
 * @param eventName Google Analytics event name, choose from standard list or use a custom string.
 * @param eventParams Analytics event parameters.
 */
async function logEvent$1(gtagFunction, initializationPromise, eventName, eventParams, options) {
    if (options && options.global) {
        gtagFunction("event" /* GtagCommand.EVENT */, eventName, eventParams);
        return;
    }
    else {
        const measurementId = await initializationPromise;
        const params = Object.assign(Object.assign({}, eventParams), { 'send_to': measurementId });
        gtagFunction("event" /* GtagCommand.EVENT */, eventName, params);
    }
}
/**
 * Set screen_name parameter for this Google Analytics ID.
 *
 * @deprecated Use {@link logEvent} with `eventName` as 'screen_view' and add relevant `eventParams`.
 * See {@link https://firebase.google.com/docs/analytics/screenviews | Track Screenviews}.
 *
 * @param gtagFunction Wrapped gtag function that waits for fid to be set before sending an event
 * @param screenName Screen name string to set.
 */
async function setCurrentScreen$1(gtagFunction, initializationPromise, screenName, options) {
    if (options && options.global) {
        gtagFunction("set" /* GtagCommand.SET */, { 'screen_name': screenName });
        return Promise.resolve();
    }
    else {
        const measurementId = await initializationPromise;
        gtagFunction("config" /* GtagCommand.CONFIG */, measurementId, {
            update: true,
            'screen_name': screenName
        });
    }
}
/**
 * Set user_id parameter for this Google Analytics ID.
 *
 * @param gtagFunction Wrapped gtag function that waits for fid to be set before sending an event
 * @param id User ID string to set
 */
async function setUserId$1(gtagFunction, initializationPromise, id, options) {
    if (options && options.global) {
        gtagFunction("set" /* GtagCommand.SET */, { 'user_id': id });
        return Promise.resolve();
    }
    else {
        const measurementId = await initializationPromise;
        gtagFunction("config" /* GtagCommand.CONFIG */, measurementId, {
            update: true,
            'user_id': id
        });
    }
}
/**
 * Set all other user properties other than user_id and screen_name.
 *
 * @param gtagFunction Wrapped gtag function that waits for fid to be set before sending an event
 * @param properties Map of user properties to set
 */
async function setUserProperties$1(gtagFunction, initializationPromise, properties, options) {
    if (options && options.global) {
        const flatProperties = {};
        for (const key of Object.keys(properties)) {
            // use dot notation for merge behavior in gtag.js
            flatProperties[`user_properties.${key}`] = properties[key];
        }
        gtagFunction("set" /* GtagCommand.SET */, flatProperties);
        return Promise.resolve();
    }
    else {
        const measurementId = await initializationPromise;
        gtagFunction("config" /* GtagCommand.CONFIG */, measurementId, {
            update: true,
            'user_properties': properties
        });
    }
}
/**
 * Retrieves a unique Google Analytics identifier for the web client.
 * See {@link https://developers.google.com/analytics/devguides/collection/ga4/reference/config#client_id | client_id}.
 *
 * @param gtagFunction Wrapped gtag function that waits for fid to be set before sending an event
 */
async function internalGetGoogleAnalyticsClientId(gtagFunction, initializationPromise) {
    const measurementId = await initializationPromise;
    return new Promise((resolve, reject) => {
        gtagFunction("get" /* GtagCommand.GET */, measurementId, 'client_id', (clientId) => {
            if (!clientId) {
                reject(ERROR_FACTORY.create("no-client-id" /* AnalyticsError.NO_CLIENT_ID */));
            }
            resolve(clientId);
        });
    });
}
/**
 * Set whether collection is enabled for this ID.
 *
 * @param enabled If true, collection is enabled for this ID.
 */
async function setAnalyticsCollectionEnabled$1(initializationPromise, enabled) {
    const measurementId = await initializationPromise;
    window[`ga-disable-${measurementId}`] = !enabled;
}
/**
 * Consent parameters to default to during 'gtag' initialization.
 */
let defaultConsentSettingsForInit;
/**
 * Sets the variable {@link defaultConsentSettingsForInit} for use in the initialization of
 * analytics.
 *
 * @param consentSettings Maps the applicable end user consent state for gtag.js.
 */
function _setConsentDefaultForInit(consentSettings) {
    defaultConsentSettingsForInit = consentSettings;
}
/**
 * Sets the variable `defaultEventParametersForInit` for use in the initialization of
 * analytics.
 *
 * @param customParams Any custom params the user may pass to gtag.js.
 */
function _setDefaultEventParametersForInit(customParams) {
    defaultEventParametersForInit = customParams;
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
async function validateIndexedDB() {
    if (!isIndexedDBAvailable()) {
        logger.warn(ERROR_FACTORY.create("indexeddb-unavailable" /* AnalyticsError.INDEXEDDB_UNAVAILABLE */, {
            errorInfo: 'IndexedDB is not available in this environment.'
        }).message);
        return false;
    }
    else {
        try {
            await validateIndexedDBOpenable();
        }
        catch (e) {
            logger.warn(ERROR_FACTORY.create("indexeddb-unavailable" /* AnalyticsError.INDEXEDDB_UNAVAILABLE */, {
                errorInfo: e === null || e === void 0 ? void 0 : e.toString()
            }).message);
            return false;
        }
    }
    return true;
}
/**
 * Initialize the analytics instance in gtag.js by calling config command with fid.
 *
 * NOTE: We combine analytics initialization and setting fid together because we want fid to be
 * part of the `page_view` event that's sent during the initialization
 * @param app Firebase app
 * @param gtagCore The gtag function that's not wrapped.
 * @param dynamicConfigPromisesList Array of all dynamic config promises.
 * @param measurementIdToAppId Maps measurementID to appID.
 * @param installations _FirebaseInstallationsInternal instance.
 *
 * @returns Measurement ID.
 */
async function _initializeAnalytics(app, dynamicConfigPromisesList, measurementIdToAppId, installations, gtagCore, dataLayerName, options) {
    var _a;
    const dynamicConfigPromise = fetchDynamicConfigWithRetry(app);
    // Once fetched, map measurementIds to appId, for ease of lookup in wrapped gtag function.
    dynamicConfigPromise
        .then(config => {
        measurementIdToAppId[config.measurementId] = config.appId;
        if (app.options.measurementId &&
            config.measurementId !== app.options.measurementId) {
            logger.warn(`The measurement ID in the local Firebase config (${app.options.measurementId})` +
                ` does not match the measurement ID fetched from the server (${config.measurementId}).` +
                ` To ensure analytics events are always sent to the correct Analytics property,` +
                ` update the` +
                ` measurement ID field in the local config or remove it from the local config.`);
        }
    })
        .catch(e => logger.error(e));
    // Add to list to track state of all dynamic config promises.
    dynamicConfigPromisesList.push(dynamicConfigPromise);
    const fidPromise = validateIndexedDB().then(envIsValid => {
        if (envIsValid) {
            return installations.getId();
        }
        else {
            return undefined;
        }
    });
    const [dynamicConfig, fid] = await Promise.all([
        dynamicConfigPromise,
        fidPromise
    ]);
    // Detect if user has already put the gtag <script> tag on this page with the passed in
    // data layer name.
    if (!findGtagScriptOnPage(dataLayerName)) {
        insertScriptTag(dataLayerName, dynamicConfig.measurementId);
    }
    // Detects if there are consent settings that need to be configured.
    if (defaultConsentSettingsForInit) {
        gtagCore("consent" /* GtagCommand.CONSENT */, 'default', defaultConsentSettingsForInit);
        _setConsentDefaultForInit(undefined);
    }
    // This command initializes gtag.js and only needs to be called once for the entire web app,
    // but since it is idempotent, we can call it multiple times.
    // We keep it together with other initialization logic for better code structure.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtagCore('js', new Date());
    // User config added first. We don't want users to accidentally overwrite
    // base Firebase config properties.
    const configProperties = (_a = options === null || options === void 0 ? void 0 : options.config) !== null && _a !== void 0 ? _a : {};
    // guard against developers accidentally setting properties with prefix `firebase_`
    configProperties[ORIGIN_KEY] = 'firebase';
    configProperties.update = true;
    if (fid != null) {
        configProperties[GA_FID_KEY] = fid;
    }
    // It should be the first config command called on this GA-ID
    // Initialize this GA-ID and set FID on it using the gtag config API.
    // Note: This will trigger a page_view event unless 'send_page_view' is set to false in
    // `configProperties`.
    gtagCore("config" /* GtagCommand.CONFIG */, dynamicConfig.measurementId, configProperties);
    // Detects if there is data that will be set on every event logged from the SDK.
    if (defaultEventParametersForInit) {
        gtagCore("set" /* GtagCommand.SET */, defaultEventParametersForInit);
        _setDefaultEventParametersForInit(undefined);
    }
    return dynamicConfig.measurementId;
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Analytics Service class.
 */
class AnalyticsService {
    constructor(app) {
        this.app = app;
    }
    _delete() {
        delete initializationPromisesMap[this.app.options.appId];
        return Promise.resolve();
    }
}
/**
 * Maps appId to full initialization promise. Wrapped gtag calls must wait on
 * all or some of these, depending on the call's `send_to` param and the status
 * of the dynamic config fetches (see below).
 */
let initializationPromisesMap = {};
/**
 * List of dynamic config fetch promises. In certain cases, wrapped gtag calls
 * wait on all these to be complete in order to determine if it can selectively
 * wait for only certain initialization (FID) promises or if it must wait for all.
 */
let dynamicConfigPromisesList = [];
/**
 * Maps fetched measurementIds to appId. Populated when the app's dynamic config
 * fetch completes. If already populated, gtag config calls can use this to
 * selectively wait for only this app's initialization promise (FID) instead of all
 * initialization promises.
 */
const measurementIdToAppId = {};
/**
 * Name for window global data layer array used by GA: defaults to 'dataLayer'.
 */
let dataLayerName = 'dataLayer';
/**
 * Name for window global gtag function used by GA: defaults to 'gtag'.
 */
let gtagName = 'gtag';
/**
 * Reproduction of standard gtag function or reference to existing
 * gtag function on window object.
 */
let gtagCoreFunction;
/**
 * Wrapper around gtag function that ensures FID is sent with all
 * relevant event and config calls.
 */
let wrappedGtagFunction;
/**
 * Flag to ensure page initialization steps (creation or wrapping of
 * dataLayer and gtag script) are only run once per page load.
 */
let globalInitDone = false;
/**
 * Configures Firebase Analytics to use custom `gtag` or `dataLayer` names.
 * Intended to be used if `gtag.js` script has been installed on
 * this page independently of Firebase Analytics, and is using non-default
 * names for either the `gtag` function or for `dataLayer`.
 * Must be called before calling `getAnalytics()` or it won't
 * have any effect.
 *
 * @public
 *
 * @param options - Custom gtag and dataLayer names.
 */
function settings(options) {
    if (globalInitDone) {
        throw ERROR_FACTORY.create("already-initialized" /* AnalyticsError.ALREADY_INITIALIZED */);
    }
    if (options.dataLayerName) {
        dataLayerName = options.dataLayerName;
    }
    if (options.gtagName) {
        gtagName = options.gtagName;
    }
}
/**
 * Returns true if no environment mismatch is found.
 * If environment mismatches are found, throws an INVALID_ANALYTICS_CONTEXT
 * error that also lists details for each mismatch found.
 */
function warnOnBrowserContextMismatch() {
    const mismatchedEnvMessages = [];
    if (isBrowserExtension()) {
        mismatchedEnvMessages.push('This is a browser extension environment.');
    }
    if (!areCookiesEnabled()) {
        mismatchedEnvMessages.push('Cookies are not available.');
    }
    if (mismatchedEnvMessages.length > 0) {
        const details = mismatchedEnvMessages
            .map((message, index) => `(${index + 1}) ${message}`)
            .join(' ');
        const err = ERROR_FACTORY.create("invalid-analytics-context" /* AnalyticsError.INVALID_ANALYTICS_CONTEXT */, {
            errorInfo: details
        });
        logger.warn(err.message);
    }
}
/**
 * Analytics instance factory.
 * @internal
 */
function factory(app, installations, options) {
    warnOnBrowserContextMismatch();
    const appId = app.options.appId;
    if (!appId) {
        throw ERROR_FACTORY.create("no-app-id" /* AnalyticsError.NO_APP_ID */);
    }
    if (!app.options.apiKey) {
        if (app.options.measurementId) {
            logger.warn(`The "apiKey" field is empty in the local Firebase config. This is needed to fetch the latest` +
                ` measurement ID for this Firebase app. Falling back to the measurement ID ${app.options.measurementId}` +
                ` provided in the "measurementId" field in the local Firebase config.`);
        }
        else {
            throw ERROR_FACTORY.create("no-api-key" /* AnalyticsError.NO_API_KEY */);
        }
    }
    if (initializationPromisesMap[appId] != null) {
        throw ERROR_FACTORY.create("already-exists" /* AnalyticsError.ALREADY_EXISTS */, {
            id: appId
        });
    }
    if (!globalInitDone) {
        // Steps here should only be done once per page: creation or wrapping
        // of dataLayer and global gtag function.
        getOrCreateDataLayer(dataLayerName);
        const { wrappedGtag, gtagCore } = wrapOrCreateGtag(initializationPromisesMap, dynamicConfigPromisesList, measurementIdToAppId, dataLayerName, gtagName);
        wrappedGtagFunction = wrappedGtag;
        gtagCoreFunction = gtagCore;
        globalInitDone = true;
    }
    // Async but non-blocking.
    // This map reflects the completion state of all promises for each appId.
    initializationPromisesMap[appId] = _initializeAnalytics(app, dynamicConfigPromisesList, measurementIdToAppId, installations, gtagCoreFunction, dataLayerName, options);
    const analyticsInstance = new AnalyticsService(app);
    return analyticsInstance;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Returns an {@link Analytics} instance for the given app.
 *
 * @public
 *
 * @param app - The {@link @firebase/app#FirebaseApp} to use.
 */
function getAnalytics(app = getApp()) {
    app = getModularInstance(app);
    // Dependencies
    const analyticsProvider = _getProvider(app, ANALYTICS_TYPE);
    if (analyticsProvider.isInitialized()) {
        return analyticsProvider.getImmediate();
    }
    return initializeAnalytics(app);
}
/**
 * Returns an {@link Analytics} instance for the given app.
 *
 * @public
 *
 * @param app - The {@link @firebase/app#FirebaseApp} to use.
 */
function initializeAnalytics(app, options = {}) {
    // Dependencies
    const analyticsProvider = _getProvider(app, ANALYTICS_TYPE);
    if (analyticsProvider.isInitialized()) {
        const existingInstance = analyticsProvider.getImmediate();
        if (deepEqual(options, analyticsProvider.getOptions())) {
            return existingInstance;
        }
        else {
            throw ERROR_FACTORY.create("already-initialized" /* AnalyticsError.ALREADY_INITIALIZED */);
        }
    }
    const analyticsInstance = analyticsProvider.initialize({ options });
    return analyticsInstance;
}
/**
 * This is a public static method provided to users that wraps four different checks:
 *
 * 1. Check if it's not a browser extension environment.
 * 2. Check if cookies are enabled in current browser.
 * 3. Check if IndexedDB is supported by the browser environment.
 * 4. Check if the current browser context is valid for using `IndexedDB.open()`.
 *
 * @public
 *
 */
async function isSupported() {
    if (isBrowserExtension()) {
        return false;
    }
    if (!areCookiesEnabled()) {
        return false;
    }
    if (!isIndexedDBAvailable()) {
        return false;
    }
    try {
        const isDBOpenable = await validateIndexedDBOpenable();
        return isDBOpenable;
    }
    catch (error) {
        return false;
    }
}
/**
 * Use gtag `config` command to set `screen_name`.
 *
 * @public
 *
 * @deprecated Use {@link logEvent} with `eventName` as 'screen_view' and add relevant `eventParams`.
 * See {@link https://firebase.google.com/docs/analytics/screenviews | Track Screenviews}.
 *
 * @param analyticsInstance - The {@link Analytics} instance.
 * @param screenName - Screen name to set.
 */
function setCurrentScreen(analyticsInstance, screenName, options) {
    analyticsInstance = getModularInstance(analyticsInstance);
    setCurrentScreen$1(wrappedGtagFunction, initializationPromisesMap[analyticsInstance.app.options.appId], screenName, options).catch(e => logger.error(e));
}
/**
 * Retrieves a unique Google Analytics identifier for the web client.
 * See {@link https://developers.google.com/analytics/devguides/collection/ga4/reference/config#client_id | client_id}.
 *
 * @public
 *
 * @param app - The {@link @firebase/app#FirebaseApp} to use.
 */
async function getGoogleAnalyticsClientId(analyticsInstance) {
    analyticsInstance = getModularInstance(analyticsInstance);
    return internalGetGoogleAnalyticsClientId(wrappedGtagFunction, initializationPromisesMap[analyticsInstance.app.options.appId]);
}
/**
 * Use gtag `config` command to set `user_id`.
 *
 * @public
 *
 * @param analyticsInstance - The {@link Analytics} instance.
 * @param id - User ID to set.
 */
function setUserId(analyticsInstance, id, options) {
    analyticsInstance = getModularInstance(analyticsInstance);
    setUserId$1(wrappedGtagFunction, initializationPromisesMap[analyticsInstance.app.options.appId], id, options).catch(e => logger.error(e));
}
/**
 * Use gtag `config` command to set all params specified.
 *
 * @public
 */
function setUserProperties(analyticsInstance, properties, options) {
    analyticsInstance = getModularInstance(analyticsInstance);
    setUserProperties$1(wrappedGtagFunction, initializationPromisesMap[analyticsInstance.app.options.appId], properties, options).catch(e => logger.error(e));
}
/**
 * Sets whether Google Analytics collection is enabled for this app on this device.
 * Sets global `window['ga-disable-analyticsId'] = true;`
 *
 * @public
 *
 * @param analyticsInstance - The {@link Analytics} instance.
 * @param enabled - If true, enables collection, if false, disables it.
 */
function setAnalyticsCollectionEnabled(analyticsInstance, enabled) {
    analyticsInstance = getModularInstance(analyticsInstance);
    setAnalyticsCollectionEnabled$1(initializationPromisesMap[analyticsInstance.app.options.appId], enabled).catch(e => logger.error(e));
}
/**
 * Adds data that will be set on every event logged from the SDK, including automatic ones.
 * With gtag's "set" command, the values passed persist on the current page and are passed with
 * all subsequent events.
 * @public
 * @param customParams - Any custom params the user may pass to gtag.js.
 */
function setDefaultEventParameters(customParams) {
    // Check if reference to existing gtag function on window object exists
    if (wrappedGtagFunction) {
        wrappedGtagFunction("set" /* GtagCommand.SET */, customParams);
    }
    else {
        _setDefaultEventParametersForInit(customParams);
    }
}
/**
 * Sends a Google Analytics event with given `eventParams`. This method
 * automatically associates this logged event with this Firebase web
 * app instance on this device.
 * List of official event parameters can be found in the gtag.js
 * reference documentation:
 * {@link https://developers.google.com/gtagjs/reference/ga4-events
 * | the GA4 reference documentation}.
 *
 * @public
 */
function logEvent(analyticsInstance, eventName, eventParams, options) {
    analyticsInstance = getModularInstance(analyticsInstance);
    logEvent$1(wrappedGtagFunction, initializationPromisesMap[analyticsInstance.app.options.appId], eventName, eventParams, options).catch(e => logger.error(e));
}
/**
 * Sets the applicable end user consent state for this web app across all gtag references once
 * Firebase Analytics is initialized.
 *
 * Use the {@link ConsentSettings} to specify individual consent type values. By default consent
 * types are set to "granted".
 * @public
 * @param consentSettings - Maps the applicable end user consent state for gtag.js.
 */
function setConsent(consentSettings) {
    // Check if reference to existing gtag function on window object exists
    if (wrappedGtagFunction) {
        wrappedGtagFunction("consent" /* GtagCommand.CONSENT */, 'update', consentSettings);
    }
    else {
        _setConsentDefaultForInit(consentSettings);
    }
}

const name = "@firebase/analytics";
const version$1 = "0.10.0";

/**
 * Firebase Analytics
 *
 * @packageDocumentation
 */
function registerAnalytics() {
    _registerComponent(new Component(ANALYTICS_TYPE, (container, { options: analyticsOptions }) => {
        // getImmediate for FirebaseApp will always succeed
        const app = container.getProvider('app').getImmediate();
        const installations = container
            .getProvider('installations-internal')
            .getImmediate();
        return factory(app, installations, analyticsOptions);
    }, "PUBLIC" /* ComponentType.PUBLIC */));
    _registerComponent(new Component('analytics-internal', internalFactory, "PRIVATE" /* ComponentType.PRIVATE */));
    registerVersion(name, version$1);
    // BUILD_TARGET will be replaced by values like esm5, esm2017, cjs5, etc during the compilation
    registerVersion(name, version$1, 'esm2017');
    function internalFactory(container) {
        try {
            const analytics = container.getProvider(ANALYTICS_TYPE).getImmediate();
            return {
                logEvent: (eventName, eventParams, options) => logEvent(analytics, eventName, eventParams, options)
            };
        }
        catch (e) {
            throw ERROR_FACTORY.create("interop-component-reg-failed" /* AnalyticsError.INTEROP_COMPONENT_REG_FAILED */, {
                reason: e
            });
        }
    }
}
registerAnalytics();

/**
 *   @fileoverview Based on the implementation in OGDLog.Firebase in opengamedata-unity by Autumn Beauchesne
 *   Handles Communication with the Firebase specific logging features of the OpenGameData servers
 *   Imported as a module by the OGD Logger
 *
 *   @author Alex Grabowski <ajgrabowski@wisc.edu>
 *   @version 1.0.0
 */


/** @type {FirebaseApp} */ let app = null;
/** @type {Analytics} */ let analytics = null;

/**
 * 
 * @param {FirebaseOptions} initializationParams 
 * @returns {boolean}
 */
function InitializeFirebase(initializationParams) {
    try {
        app = initializeApp(initializationParams);
        analytics = getAnalytics(app);
        gtag('config', initializationParams.measurementId, {
            cookie_flags: "max-age=7200;secure;samesite=none"
        });
        return true;
    } catch(e) {
        console.error("[OGDLog.Firebase] Failed to initialize firebase", e);
        return false;
    }
}

/**
 * 
 * @param {string} eventName 
 * @param {object} eventParams 
 * @param {number} sequenceIndex 
 * @param {OGDLogConsts} appConsts 
 */
function LogFirebaseEvent(eventName, eventParams, sequenceIndex) {
    const evtData = {
        event_sequence_index: sequenceIndex,
        user_id: SessionConsts.UserId,
        user_data: SessionConsts.UserData,
        app_id: OGDLogConsts.AppId,
        app_flavor: OGDLogConsts.AppBranch,
        app_version: OGDLogConsts.AppVersion,
    };
    if (!!eventParams) {
        Object.assign(evtData, eventParams);
    }
    logEvent(analytics, eventName, evtData);
}

//// @ts-check
/**
 *   @fileoverview Based on the implementation in OGDLog.cs in opengamedata-unity by Autumn Beauchesne
 *   Handles Communication with the logging features of the OpenGameData servers
 *   Additional Functionality for Firebase
 *
 *   @author Alex Grabowski <ajgrabowski@wisc.edu>
 *   @version 1.0.0
 */

const xhttp = new XMLHttpRequest();

/**
 * @param {number} number
 * @param {number} digits
 */
function NumberToStringPadLeft(number, digits) {
    return Math.round(number).toString().padStart(digits, "0");
}

/**
 * Dictates debug output and base64 encoding
 * @typedef {number} SettingsFlags
 * */
const SettingsFlags = {
    Debug: 0x01,
    Base64Encode: 0x02,
};

class OGDLogger {
    /**
     * @param {string} myAppID - an id for the app in the database
     * @param {string} myAppVersion - the current version of the app's logging events
     * @param {FirebaseOptions} firebaseConfig (optional) - your app's Firebase project configuration object; If no object is provided, Firebase module will not be initialized
     */
    constructor(myAppID, myAppVersion, firebaseConfig = null) {
        /** @private @type {string} */ this._endpoint = null;

        /** @private @type {number} */ this._eventSequence = 0;
        /** @private @type {boolean} */ this._firebaseReady = false;
        /** @private @type {boolean} */ this._flushing = false;
        /** @private @type {object[]} */ this._logQueue = [];
        this._submittedEventCount = 0;

        this._gameState = undefined;
        this._flushCallback = undefined;
        this._settings = SettingsFlags.Base64Encode;

        OGDLogConsts.AppId = myAppID;
        OGDLogConsts.AppVersion = myAppVersion;
        this._endpoint = BuildOGDUrl();

        this.useFirebase(firebaseConfig);
    }

    /**
     * Set up the application constants and activiate the ready modules
     * @param {*} firebaseConfig (optional) - your app's Firebase project configuration object; If no object is provided, Firebase module will not be initialized
     */
    useFirebase(firebaseConfig) {
        if (!!firebaseConfig) {
            this._firebaseReady = InitializeFirebase(firebaseConfig);
        }
    }

    /**
     * Allows caller to modify the UserId and UserData of the SessionConsts.
     * Additionallty triggers a rebuild of the OGD endpoint
     *
     * @param {string} userId
     * @param {object} userData
     */
    setUserId(userId, userData = null) {
        if (SessionConsts.UserId != userId || SessionConsts.UserData != userData) {
            SessionConsts.UserId = userId;
            SessionConsts.UserData = userData;
            this._endpoint = BuildOGDUrl();
        }
    }

    /**
     * Configures settings for the logger modules
     * @param {SettingsFlags} settings
     */
    setSettings(settings) {
        // @ts-ignore
        this._settings = settings;
    }

    /**
     * Sets the debug settings flags.
     * @param {boolean} debug - shall we?
     */
    setDebug(debug) {
        if (debug) {
            // @ts-ignore
            this.setSettings(this._settings | SettingsFlags.Debug);
        } else {
            // @ts-ignore
            this.setSettings(this._settings | ~SettingsFlags.Debug);
        }
    }

    /**
     * Resets the session id to a new session.
     */
    resetSessionId() {
        SessionConsts.SessionId = UUIDint();
        this._eventSequence = 0;
        this._endpoint = BuildOGDUrl();
    }

    /**
     * Sets the current game state.
     * @param {object} gameState 
     */
    setGameState(gameState) {
        this._gameState = gameState;
    }

    //* Events */

    /**
     * Writes an event to the buffer.
     * @param {string} eventName
     * @param {object?} eventParams
     */
    log(eventName, eventParams = undefined) {
        const now = new Date();
        const nowString = [now.getFullYear(), NumberToStringPadLeft(now.getMonth() + 1, 2), NumberToStringPadLeft(now.getDate(), 2)].join("-")
            + " " + [NumberToStringPadLeft(now.getHours(), 2), ":", NumberToStringPadLeft(now.getMinutes(), 2), ":", NumberToStringPadLeft(now.getSeconds(), 2), ".", NumberToStringPadLeft(now.getMilliseconds(), 3)].join("") + "Z";

        const offset = -now.getTimezoneOffset(); // negative, to represent offset from UTC to here (rather than the reverse)

        const h = (offset / 60) >> 0;
        const m = (offset % 60) >> 0;
        const s = (60 * (offset % 1)) >> 0;
        const offsetString = [h, m.toString().padStart(2, "0"), s.toString().padStart(2, "0")].join(":");

        const sequenceIndex = this._eventSequence++;

        let eventData = {
            event_name: eventName,
            event_sequence_index: sequenceIndex,
            client_time: nowString,
            client_offset: offsetString
        };

        if (!!SessionConsts.UserData) {
            eventData["user_data"] = JSON.stringify(SessionConsts.UserData);
        }

        if (!!this._gameState) {
            eventData["game_state"] = JSON.stringify(this._gameState);
        }

        if (!!eventParams) {
            eventData["event_data"] = JSON.stringify(eventParams);
        }

        this._logQueue.push(eventData);
        if (typeof this._flushCallback == "undefined") {
            this._flushCallback = setTimeout(() => this.flush(), 0);
        }

        if (this._firebaseReady) {
            LogFirebaseEvent(eventName, eventParams, sequenceIndex);
        }
    }

    /**
     * Flush the current logging queue to the database and handle the response
     */
    flush() {
        this._flushCallback = undefined;

        if (this._flushing || this._logQueue.length <= 0) {
            return;
        }

        this._flushing = true;

        this._submittedEventCount = this._logQueue.length;
        let data = EscapeJSONString(JSON.stringify(this._logQueue));
        if (this._settings & SettingsFlags.Base64Encode) {
            data = btoa(data);
        }
        const toPost = "data=" + encodeURIComponent(data);

        // Debugging
        if ((this._settings & SettingsFlags.Debug) != 0) {
            console.log(
                "[DEBUG OGDLogger] current batch: ",
                JSON.stringify(this._logQueue),
                "\nab to post to:",
                this._endpoint
            );
        }

        // @ts-ignore
        xhttp.open("POST", this._endpoint);
        xhttp.setRequestHeader(
            "Content-Type",
            "application/x-www-form-urlencoded"
        );
        xhttp.send(toPost);
        // Handle response
        xhttp.onreadystatechange = () => {
            if (xhttp.readyState === XMLHttpRequest.DONE) {
                this._flushing = false;

                const status = xhttp.status;
                
                if (status === 0 || (status >= 200 && status < 400)) {
                    if ((this._settings & SettingsFlags.Debug) != 0) {
                        console.log(
                            "[DEBUG OGDLogger:xhttp] Great success\n",
                            "response:",
                            xhttp.responseText
                        );
                    }
                    this._logQueue.splice(0, this._submittedEventCount);
                } else {
                    console.error(
                        "[OGDLogger] XMLHttpRequest returned error status: ",
                        status
                    );
                }

                //if we have built up some events while flushing, keep flushing
                if (this._logQueue.length >= 0) {
                    this.flush();
                }
            }
        };
    }
}

let appName = 'CONECTADO';
let version = '1.0.3'; // js-tracker version
var ogdTracker = new OGDLogger(appName, version);
ogdTracker.initialized = false; // evitar volver a sobreescribir el send

function encodeNonAsciiAsUnicode(object) {
    // Libreria OGD usa btoa - lo envia en Latin 1, base64.
    // Servidor OGD lo recibe como UTF-8, base64.
    // Por ello, caracteres como tildes, o ñ (fuera del ASCII) se transforman en unicode para evitar problemas.
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
};

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
            } else if (typeof event_data.extensions[key] === "object") {
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
    event_name = encodeNonAsciiAsUnicode(event_name);
    event_data = encodeNonAsciiAsUnicode(event_data);
    GAME_STATE = encodeNonAsciiAsUnicode(GAME_STATE);
    ogdTracker.setGameState(GAME_STATE);
    ogdTracker.log(event_name, event_data);

    // checkme maybe add "if debug = true"
    console.log("Sending " + event_name + " to OPEN GAME DATA");
    // console.log(event_data);
};

class BootScene extends Phaser.Scene {
    /**
    * Escena inicial en la que se cargan todos los recursos
    * @extends Phaser.Scene
    */
    constructor() {
        super({
            key: 'BootScene',
            // Se caraga el plugin i18next
            pack: {
                files: [{
                    type: 'plugin',
                    key: 'rextexttranslationplugin',
                    url: './src/lib/rextexttranslationplugin.min.js',
                    // url: 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rextexttranslationplugin.min.js',
                    start: true,
                    mapping: 'translation'  // Add text-translation plugin to `scene.translation`
                }]
            }
        });
    }

    createLoadingBar() {
        let width = this.cameras.main.width;
        let height = this.cameras.main.height;

        // Fondo escalado en cuanto al canvas
        let bg = this.add.image(width / 2, height / 2, 'basePC');
        let scale = width / bg.width;
        bg.setScale(scale);

        // Fondo de la pantalla
        let screenBg = this.add.rectangle(width / 2, 0, width, height / 1.2, 0x2B9E9E).setOrigin(0.5, 0);

        // Pantalla del ordenador con el tam del canvas
        let screen = this.add.image(width / 2, height / 2, 'PCscreen');
        screen.setDisplaySize(width, height);

        let progressBox = this.add.graphics();
        let progressBar = this.add.graphics();

        let BAR_W = width * 0.6;
        let BAR_H = 70;
        let BAR_OFFSET = 40;
        let FILL_OFFSET = 20;
        let TEXT_OFFSET = 70;
        let bgCol = 0xFF408E86;
        let fillCol = 0xFF004E46;
        let borderCol = 0xFF004E46;
        let borderThickness = 2;
        let radius = Math.min(BAR_W, BAR_H) * 0.25;

        progressBox.fillStyle(bgCol, 1).fillRoundedRect(width / 2 - BAR_W / 2, height / 2 - BAR_H / 2 - BAR_OFFSET, BAR_W, BAR_H, radius)
            .lineStyle(borderThickness, borderCol, 1).strokeRoundedRect(width / 2 - BAR_W / 2, height / 2 - BAR_H / 2 - BAR_OFFSET, BAR_W, BAR_H, radius);


        // Texto de la palabra cargando
        let loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - TEXT_OFFSET - BAR_OFFSET,
            text: 'Loading...',
            style: {
                fontFamily: 'gidole-regular',
                fontSize: '30px',
                fill: '#ffffff'
            }
        });
        loadingText.setOrigin(0.5, 0.5);

        // Texto con el porcentaje de los assets cargados
        let percentText = this.make.text({
            x: width / 2,
            y: height / 2 - BAR_OFFSET,
            text: '0%',
            style: {
                fontFamily: 'gidole-regular',
                fontSize: '20px',
                fill: '#ffffff'
            }
        });
        percentText.setOrigin(0.5, 0.5);

        // Texto para el nombre de los archivos
        let assetText = this.make.text({
            x: width / 2,
            y: height / 2 + TEXT_OFFSET - BAR_OFFSET,
            text: '',
            style: {
                fontFamily: 'gidole-regular',
                fontSize: '20px',
                fill: '#ffffff'
            }
        });
        assetText.setOrigin(0.5, 0.5);

        // Se va actualizando la barra de progreso y el texto con el porcentaje
        this.load.on('progress', function (value) {
            percentText.setText(parseInt(value * 100) + '%');

            progressBar.clear();
            progressBar.fillStyle(fillCol, 1);
            progressBar.fillRoundedRect(width / 2 - (BAR_W - FILL_OFFSET) / 2, height / 2 - (BAR_H - FILL_OFFSET) / 2 - BAR_OFFSET, (BAR_W - FILL_OFFSET) * value, BAR_H - FILL_OFFSET, radius);
        });
        // Cuando carga un archivo, muestra el nombre del archivo debajo de la barra
        this.load.on('fileprogress', function (file) {
            // console.log(file.key);
            assetText.setText('Loading asset: ' + file.key);
        });

        // Cuando se termina de cargar todo, se borran los elementos de la barra
        this.load.once('complete', function () {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
            assetText.destroy();
            bg.destroy();
            screenBg.destroy();
            screen.destroy();
        });
    }

    loadLoadingBarAssets() {
        this.load.setPath('assets/UI/computer');

        this.load.image('basePC', 'backgrounds/basePCsq.png');
        this.load.image('PCscreen', 'backgrounds/screenWithoutBlack.png');
    }

    loadComputersAssets() {
        this.load.setPath('assets/UI/computer');

        // Fondos del ordenador
        this.load.image('loginBg', 'backgrounds/loginBackground.png');
        this.load.image('computerMainView', 'backgrounds/mainViewBackground.png');

        // Elementos del menu principal
        this.load.image('powerOff', 'titleMenu/power_off.png');
        this.load.image('logoWT', 'titleMenu/logoWT.png');

        // Elementos del menu de login
        this.load.image('backButton', 'loginMenu/backChatButton.png');
        this.load.image('boyIcon', 'loginMenu/chicoSelect.png');
        this.load.image('girlIcon', 'loginMenu/chicaSelect.png');

        // Elementos del menu del ordenador
        this.load.image('commentBubble', '9sliceComments.png');
        this.load.atlas('computerElements', 'computerElements.png', 'computerElements.json');

        // Posts
        this.load.atlas('photos', 'photos.png', 'photos.json');
    }

    loadPhoneAssets() {
        this.load.setPath('assets/UI/phone');

        // Telefono
        this.load.image('phone', 'phone.png');

        // Botones del telefono
        this.load.atlas('phoneElements', 'phoneElements.png', 'phoneElements.json');

        this.load.image('myBubble', '9slicePlayer.png');
        this.load.image('othersBubble', '9sliceOthers.png');
    }

    loadFlags() {
        this.load.setPath('assets/UI/flags');

        // Banderas idiomas
        this.load.atlas('flags', 'flags.png', 'flags.json');
    }

    loadAvatars() {
        this.load.setPath('assets/UI/avatars');

        // Avatares de los personajes
        this.load.atlas('avatars', 'avatars.png', 'avatars.json');
    }

    loadi18next(dialogsAndNamespaces, onlyNamespaces) {
        let namespaces = dialogsAndNamespaces.concat(onlyNamespaces);

        for (let i = 0; i < namespaces.length; ++i) {
            // IMPORTANTE: EN EL PLUGIN I18NEXT PARA LAS RUTAS HAY QUE USAR '\\' EN VEZ DE '/'
            namespaces[i] = namespaces[i].replace('/', '\\');
        }

        // i18next es un framework de internalizacion ampiamente usado en javascript
        // PAGINA DONDE DESCARGARLO -> https://rexrainbow.github.io/phaser3-rex-notes/docs/site/i18next/
        // DOCUMENTACION OFICIAL -> https://www.i18next.com/

        // Se inicializa el plugin
        // Inicialmente solo se carga el idioma inicial y los de respaldo
        // Luego, conforme se usan tambien se cargan el resto
        this.plugins.get('rextexttranslationplugin').initI18Next(this, {
            // Idioma inicial
            lng: 'en',
            // en caso de que no se encuentra una key en otro idioma se comprueba en los siguientes en orden
            fallbackLng: 'en',
            // Idiomas permitidos
            // Sin esta propiedad a la hora de buscar las traducciones se podria buscar
            // en cualquier idioma (aunque no existiese)
            supportedLngs: ['en', 'es', 'fr', 'pt-BR', 'cn-CN', 'cn-HK'],
            // IMPORTANTE: hay que precargar los namespaces de todos los idiomas porque sino a la hora
            // de usar un namespace por primera vez no le da tiempo a encontrar la traduccion
            // y termina usando la del idioma de respaldo
            preload: ['en', 'es', 'fr', 'pt-BR', 'cn-CN', 'cn-HK'],
            // Namespaces que se cargan para cada uno de los idiomas
            ns: namespaces,
            // Mostrar informacion de ayuda por consola
            debug: false,
            // Cargar las traducciones de un servidor especificado en vez de ponerlas directamente
            backend: {
                // La ruta desde donde cargamos las traducciones
                // {{lng}} --> nombre carpeta de cada uno de los idiomas
                // {{ns}} --> nombre carpeta de cada uno de los namespaces
                loadPath: 'localization/{{lng}}/{{ns}}.json'
            }
        });
    }

    loadDialogs(dialogsAndNamespaces) {
        this.load.setPath('assets/UI/dialog');

        // Assets de la caja de texto y de opcion multiple
        this.load.image('textboxMask', 'textboxMask.png');
        this.load.atlas('dialogs', 'dialogs.png', 'dialogs.json');

        // comprimir texturas (toma mucha menos memoria, aunque los archivos pueden ocupa mas tam)
        // Se comprueba de arriba a abajo hasta encontrar el primero que funcione en el dispositivo, si no, se usa png
        // formatos de compresion: ETC, ETC1, ATC, ASTC, BPTC, RGTC, PVRTC, S3TC, and S3TCSRB
        // ASTC - MAC
        // PVRTC - iOS y algunos Android
        // S3TCSRB/S3TCSRGB - SOs sobremesa y algunos Android
        // ETC1 - mayoria Android
        /*
        this.load.texture('dialog', {
            'ASTC': { type: 'PVR', textureURL: 'dialog-astc4x4/dialog-astc4x4.pvr', atlasURL: 'dialog-astc4x4/dialog-astc4x4.json' },
            'PVRTC': { type: 'PVR', textureURL: 'dialog-pvrtc/dialog-pvrtc.pvr', atlasURL: 'dialog-pvrtc/dialog-pvrtc.json' },
            'S3TCSRGB': { type: 'PVR', textureURL: 'dialog-dxt5/dialog-dxt5.pvr', atlasURL: 'dialog-dxt5/dialog-dxt5.json' },
            'IMG': { textureURL: 'dialog-img/dialog-img.png', atlasURL: 'dialog-img/dialog-img.json' },
        });
        */

        // Archivos de dialogos (estructura)
        this.load.setPath('localization/structure');

        dialogsAndNamespaces.forEach((dialog) => {
            // Quedarse con la ultima parte del path, que corresponde con el id del archivo
            let subPaths = dialog.split('/');
            let name = subPaths[subPaths.length - 1];
            // Ruta completa (dentro de la carpeta structure y con el extension .json)
            let wholePath = dialog + ".json";
            this.load.json(name, wholePath);
        });

    }

    loadCharacters() {
        // Personajes planos sin animaciones
        this.load.setPath('assets/characters/plains');

        this.load.atlas('someCharacters', 'someCharacters.png', 'someCharacters.json');
        this.load.image('teacherChar', 'teacher.png');
        this.load.image('AlexChar', 'Alex.png');

        // Personajes y sus respectivas animaciones esqueletales de Spine
        this.load.setPath('assets/characters/Spine');

        // [Idle01, IdleBase, Walk]
        this.load.spine('mom', 'mom/Front.json', 'mom/Front.atlas');

        // [Idle01, IdleBase]
        this.load.spine('dad', 'dad/Front 34.json', 'dad/Front 34.atlas');

        // [Idle01, IdleBase]
        this.load.spine('Alex_front', 'Alex/Front 34.json', 'Alex/Front 34.atlas');

        // [IdleBase, Walk]
        this.load.spine('Alex_side', 'Alex/Side.json', 'Alex/Side.atlas');

        // [Idle01, IdleBase]
        this.load.spine('Alison', 'Alison/Front 34.json', 'Alison/Front 34.atlas');

        // [Idle01, IdleBase]
        this.load.spine('Ana', 'Ana/Front 34.json', 'Ana/Front 34.atlas');

        // [Idle01, IdleBase]
        this.load.spine('Guille', 'Guille/Front 34.json', 'Guille/Front 34.atlas');

        // [Idle01, IdleBase]
        this.load.spine('Jose', 'Jose/Front 34.json', 'Jose/Front 34.atlas');

        // [Idle01, IdleBase, IdlePhone]
        this.load.spine('Maria', 'Maria/Front 34.json', 'Maria/Front 34.atlas');
    }

    loadBackgrounds() {
        this.load.setPath('assets/backgrounds');

        // Habitacion
        this.load.image('bedroomCeiling', 'bedroom/bedroomCeiling.png');
        this.load.image('bedroomBg', 'bedroom/bedroomBase.png');
        this.load.atlas('bedroom', 'bedroom/bedroom.png', 'bedroom/bedroom.json');

        // Salon
        this.load.image('livingroomBg', 'livingroom/livingroomBg.png');
        this.load.atlas('livingroom', 'livingroom/livingroom.png', 'livingroom/livingroom.json');

        // Autobus
        this.load.spritesheet('bus', 'bus.png', { frameWidth: 632, frameHeight: 341 });

        // Patio
        this.load.image('playgroundClosed', 'playground/playgroundClosed.png');
        this.load.image('playgroundOpened', 'playground/playgroundOpened.png');
        this.load.image('earring', 'playground/earring.png');

        // Escaleras
        this.load.image('stairsBg', 'stairs/stairsBg.png');
        this.load.image('stairsDoorClosed', 'stairs/stairsDoorClosed.png');
        this.load.image('stairsDoorOpened', 'stairs/stairsDoorOpened.png');

        // Pasillo
        this.load.image('corridorBg', 'corridor/corridorBg.png');
        this.load.atlas('corridor', 'corridor/corridor.png', 'corridor/corridor.json');

        // Banos
        this.load.image('restroomBg', 'restroom/restroomBg.png');
        this.load.atlas('restroom', 'restroom/restroom.png', 'restroom/restroom.json');

        // Clase desde el frente
        this.load.image('classFrontBg', 'classFront/classFrontBg.png');
        this.load.atlas('classFront', 'classFront/classFront.png', 'classFront/classFront.json');
        this.load.image('frontRow1Chairs', 'classFront/desks/frontRow1Chairs.png');
        this.load.image('frontRow1Tables', 'classFront/desks/frontRow1Tables.png');
        this.load.image('frontRow2Chairs', 'classFront/desks/frontRow2Chairs.png');
        this.load.image('frontRow2Tables', 'classFront/desks/frontRow2Tables.png');
        this.load.image('frontRow3Chairs', 'classFront/desks/frontRow3Chairs.png');
        this.load.image('frontRow3Tables', 'classFront/desks/frontRow3Tables.png');
        this.load.image('frontRow4Chairs', 'classFront/desks/frontRow4Chairs.png');
        this.load.image('frontRow4Tables', 'classFront/desks/frontRow4Tables.png');
        this.load.image('frontRow5Chairs', 'classFront/desks/frontRow5Chairs.png');
        this.load.image('frontRow5Tables', 'classFront/desks/frontRow5Tables.png');

        // Clase desde el fondo
        this.load.image('classBackBg', 'classBack/classBackBg.png');
        this.load.image('backRow1Chairs', 'classBack/desks/backRow1Chairs.png');
        this.load.image('backRow1Tables', 'classBack/desks/backRow1Tables.png');
        this.load.image('backRow2Chairs', 'classBack/desks/backRow2Chairs.png');
        this.load.image('backRow2Tables', 'classBack/desks/backRow2Tables.png');
        this.load.image('backRow3Chairs', 'classBack/desks/backRow3Chairs.png');
        this.load.image('backRow3Tables', 'classBack/desks/backRow3Tables.png');
        this.load.image('backRow4Chairs', 'classBack/desks/backRow4Chairs.png');
        this.load.image('backRow4Tables', 'classBack/desks/backRow4Tables.png');
        this.load.image('backRow5Chairs', 'classBack/desks/backRow5Chairs.png');
        this.load.image('backRow5Tables', 'classBack/desks/backRow5Tables.png');
        this.load.atlas('classBack', 'classBack/classBack.png', 'classBack/classBack.json');

        // Pesadillas
        this.load.atlas('nightmaresElements', 'nightmares/nightmaresElements.png', 'nightmares/nightmaresElements.json');
        this.load.image('nightmaresBg', 'nightmares/nightmareClass.png');
    }

    loadCreditsSceneAssets() {
        this.load.setPath('assets/UI/creditsScene');
        this.load.atlas('someBrands', 'brands/someBrands.png', 'brands/someBrands.json');
        this.load.image('logo_rage', 'brands/logo_rage.png');
        this.load.image('logo_ucm', 'brands/logo_ucm.png');
        this.load.image('beaconing', 'brands/beaconing.png');
        this.load.atlas('medals', 'medals.png', 'medals.json');
        this.load.image('rewind', 'rewind.png');
    }

    loadRestAssets() {
        this.createLoadingBar();

        // Son tanto archivos de dialogos como namespaces del plugin i18next
        // Ruta archivo dialogo --> structure/test/dialog.json
        // Id archivo dialogo --> dialog
        // Namespace --> test\\dialog.json
        let dialogsAndNamespaces = [
            // Ordenador
            'computer/posts',
            'computer/requests',

            // Dialogos de todos los dias
            'everydayDialog',

            // Dia 1
            'day1/bedroomMorningDay1',
            'day1/livingroomMorningDay1',
            'day1/playgroundMorningDay1',
            'day1/corridorMorningDay1',
            'day1/classFrontMorningDay1',
            'day1/classBackMorningDay1',
            'day1/classBackBreakDay1',
            'day1/corridorBreakDay1',
            'day1/playgroundBreakDay1',
            'day1/livingroomAfternoonDay1',
            'day1/bedroomAfternoonDay1',
            'day1/nightmareDay1',

            // Dia 2
            'day2/bedroomMorningDay2',
            'day2/livingroomMorningDay2',
            'day2/playgroundMorningDay2',
            'day2/corridorMorningDay2',
            'day2/classBackBreakDay2',
            'day2/corridorBreakDay2',
            'day2/restroomBreakDay2',
            'day2/playgroundBreakDay2',
            'day2/playgroundAfternoonDay2',
            'day2/livingroomAfternoonDay2',
            'day2/bedroomAfternoonDay2',
            'day2/nightmareDay2',

            // Dia 3
            'day3/bedroomMorningDay3',
            'day3/livingroomMorningDay3',
            'day3/playgroundMorningDay3',
            'day3/corridorMorningDay3',
            'day3/classCorridorAfternoonDay3',
            'day3/restroomAfternoonDay3',
            'day3/livingroomAfternoonDay3',
            'day3/bedroomAfternoonDay3',
            'day3/nightmareDay3',

            // Dia 4
            'day4/bedroomMorningDay4',
            'day4/livingroomMorningDay4',
            'day4/playgroundMorningDay4',
            'day4/stairsMorningDay4',
            'day4/corridorMorningDay4',
            'day4/classBackBreakDay4',
            'day4/corridorBreakDay4',
            'day4/restroomBreakDay4',
            'day4/stairsBreakDay4',
            'day4/playgroundBreakDay4',
            'day4/playgroundAfternoonDay4',
            'day4/livingroomAfternoonDay4',
            'day4/bedroomAfternoonDay4',
            'day4/nightmareDay4',

            // Dia 5
            'day5/bedroomMorningDay5',
            'day5/playgroundMorningDay5',
            'day5/stairsMorningDay5',
            'day5/corridorMorningDay5',
            'day5/classCorridorAfternoonDay5',
            'day5/restroomAfternoonDay5',
            'day5/nightmareDay5'
        ];
        // Solo son namespaces del plugin i18next
        // Namespace --> test\\dialog.json
        let onlyNamespaces = [
            // Menus
            'menus/titleMenu',
            'menus/loginMenu',
            'menus/creditsScene',

            // Nombres
            'names',

            // Movil
            'phoneInfo',

            // Ordenador
            'computer/computerInfo',

            // Escenas de transicion
            'transitionScenes',
        ];

        this.loadComputersAssets();
        this.loadPhoneAssets();
        this.loadFlags();
        this.loadAvatars();
        this.loadDialogs(dialogsAndNamespaces);
        this.loadCharacters();
        this.loadBackgrounds();
        this.loadCreditsSceneAssets();

        this.load.setPath('assets');
        this.load.image('defaultParticle', 'defaultParticle.png');

        this.loadi18next(dialogsAndNamespaces, onlyNamespaces);

        // Indicar a LoaderPlugin que hay que cargar los assets que se encuentran en la cola
        // Nota: despues del preload este metodo se llama automaticamente, pero si se quieren cargar assets en otra parte hay que llamarlo manualmente
        this.load.start();

        this.load.once('complete', () => {
            this.events.emit('start');
        });
    }

    preload() {
        this.loadLoadingBarAssets();

        // Nota: aunque este metodo se encuentra en el preload, verdaderamente se ejecuta en la etapa de create
        this.load.once('complete', () => {
            this.loadRestAssets();
        });
    }

    create() {
        this.events.once('start', () => {
            // Este es el primer evento enviado (acceso a la web)
            const statementBuilder = xapiTracker.accessible("WEB").accessed();

            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('wisconsin') == 'true' && !ogdTracker.initialized) {
                ogdTracker.initialized = true;
                this.setupOGDTracker(statementBuilder);
            }

            statementBuilder.send(); // moving trace to queue


            // Se crea la animacion del autobus en la primera escena para no tener que crearla de nuevo
            this.anims.create({
                key: 'moving',
                frames: this.anims.generateFrameNumbers('bus', { start: 0, end: 1 }),
                frameRate: 3,
                repeat: -1
            });

            let gameManager = GameManager.create(this);
            gameManager.startLangMenu();
            // gameManager.startTest();
        });
    }

    setupOGDTracker(statementBuilder) {
        // Open Game Data OVERRIDE

        // userId por defecto, puede cambiar dentro de sendFromXAPI
        ogdTracker.setUserId(Date.now().toString());

        const proto = Object.getPrototypeOf(statementBuilder);
        const originalSend = proto.send;

        proto.send = function (...args) {
            ogdTracker.sendFromXAPI(this.statement);
            return originalSend.apply(this, args);
        };
    }
}

class Button extends Phaser.GameObjects.Container {
    /**
    * Clase que permite crear un boton personalizable con animaciones para las diferentes interacciones
    * @param {Phaser.Scene} scene - escena a la que pertenece
    * @param {Number} x - posicion x
    * @param {Number} y - posicion y
    * @param {Number} scale - escala del objeto
    * @param {Function} fn - funcion que se ejecuta cuando se clica en el boton
    * @param {String} fill - sprite que se usa para el relleno
    * @param {Color} normalCol - color RGB del boton cuando no se esta interactuando con el
    * @param {Color} highlightedCol - color RGB cuando se pasa el puntero por encima
    * @param {Color} pressedCol - color RGB del boton cuando se clica en el
    * @param {Text} text - texto que se escribe en el boton (opcional)
    * @param {Object} fontParams - distintos parametros (tipografia, tam, estilo, color) para personalizar el texto anterior (opcional)
    * @param {String} edge - sprite que se usa para el borde (opcional)
    * @param {String} hitArea - cambiar el area de colision (opcional)
    */
    constructor(scene, x, y, scale, fn, fill, normalCol, highlightedCol, pressedCol, text, fontParams, edge, hitArea) {
        super(scene, x, y);
        this.scene.add.existing(this);

        let gameManager = GameManager.getInstance();

        // La imagen pertenece a una atlas
        if (fill.hasOwnProperty('atlas')) {
            this.fillImg = this.scene.add.image(0, 0, fill.atlas, fill.frame);
        }
        // La imagen es independiente
        else {
            this.fillImg = this.scene.add.image(0, 0, fill);
        }

        this.nCol = Phaser.Display.Color.GetColor(normalCol.R, normalCol.G, normalCol.B);
        this.nCol = Phaser.Display.Color.IntegerToRGB(this.nCol);
        let hCol = Phaser.Display.Color.GetColor(highlightedCol.R, highlightedCol.G, highlightedCol.B);
        hCol = Phaser.Display.Color.IntegerToRGB(hCol);
        let pCol = Phaser.Display.Color.GetColor(pressedCol.R, pressedCol.G, pressedCol.B);
        pCol = Phaser.Display.Color.IntegerToRGB(pCol);

        this.fillImg.setTint(Phaser.Display.Color.GetColor(this.nCol.r, this.nCol.g, this.nCol.b));

        this.hitArea = null;
        if (hitArea) {
            this.hitArea = hitArea;
            this.fillImg.setInteractive(hitArea.area, hitArea.callback, { useHandCursor: true });
        }
        else {
            this.fillImg.setInteractive({ useHandCursor: true });
        }
        // dibujar el area de colision
        if (this.scene.sys.game.debug) {
            this.scene.input.enableDebug(this.fillImg, '0xffff00');
        }

        let tintFadeTime = 25;

        this.fillImg.on('pointerover', () => {
            scene.tweens.addCounter({
                targets: [this.fillImg],
                from: 0,
                to: 100,
                onUpdate: (tween) => {
                    const value = tween.getValue();
                    let col = Phaser.Display.Color.Interpolate.ColorWithColor(this.nCol, hCol, 100, value);
                    let colInt = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
                    this.fillImg.setTint(colInt);
                },
                duration: tintFadeTime,
                repeat: 0,
            });
        });

        this.fillImg.on('pointerout', () => {
            scene.tweens.addCounter({
                targets: [this.fillImg],
                from: 0,
                to: 100,
                onUpdate: (tween) => {
                    const value = tween.getValue();
                    let col = Phaser.Display.Color.Interpolate.ColorWithColor(hCol, this.nCol, 100, value);
                    let colInt = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
                    this.fillImg.setTint(colInt);
                },
                duration: tintFadeTime,
                repeat: 0,
            });
        });

        this.fillImg.on('pointerdown', () => {
            this.fillImg.disableInteractive();
            let down = scene.tweens.addCounter({
                targets: [this.fillImg],
                from: 0,
                to: 100,
                onUpdate: (tween) => {
                    const value = tween.getValue();
                    let col = Phaser.Display.Color.Interpolate.ColorWithColor(hCol, pCol, 100, value);
                    let colInt = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
                    this.fillImg.setTint(colInt);
                },
                duration: tintFadeTime,
                repeat: 0,
                yoyo: true,
            });
            down.on('complete', () => {
                this.fillImg.setInteractive({ useHandCursor: true });
                fn();
            });
        });

        this.add(this.fillImg);

        if (edge) {
            let edgeImg = this.scene.add.image(0, 0, edge);
            this.add(edgeImg);
        }

        if (text) {
            let style = { ...gameManager.textConfig };
            style.fontFamily = fontParams.font;
            style.fontSize = fontParams.size + 'px';
            style.fontStyle = fontParams.style;
            style.color = fontParams.color;

            let buttonText = this.scene.add.text(0, 0, text, style);
            buttonText.setOrigin(0.5);
            this.add(buttonText);
        }

        this.setScale(scale);
    }

    setHitArea(hitArea) {
        this.fillImg.removeInteractive();
        this.hitArea = hitArea;
        this.fillImg.setInteractive(hitArea.area, hitArea.callback, { useHandCursor: true });
        if (this.scene.sys.game.debug) {
            this.scene.input.enableDebug(this.fillImg, '0xffff00');
        }
    }

    reset() {
        this.fillImg.setTint(Phaser.Display.Color.GetColor(this.nCol.r, this.nCol.g, this.nCol.b));
    }
}

class LanguageMenu extends Phaser.Scene {
    /**
    * Menu para elegir el idioma del juego
    * @extends Phaser.Scene
    */
    constructor() {
        super({ key: 'LanguageMenu' });
    }

    create() {
        const CANVAS_WIDTH = this.sys.game.canvas.width;
        const CANVAS_HEIGHT = this.sys.game.canvas.height;

        this.gameManager = GameManager.getInstance();
        this.i18next = this.gameManager.i18next;
        let namespace = 'menus\\languageMenu';

        // Fondo escalado en cuanto al canvas
        let bg = this.add.image(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'basePC');
        let scale = CANVAS_WIDTH / bg.width;
        bg.setScale(scale);

        // Fondo
        this.add.rectangle(CANVAS_WIDTH / 2, 0, CANVAS_WIDTH, CANVAS_HEIGHT / 1.2, 0x2B9E9E).setOrigin(0.5, 0);

        // Pantalla del ordenador con el tam del canvas
        let screen = this.add.image(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'PCscreen');
        screen.setDisplaySize(CANVAS_WIDTH, CANVAS_HEIGHT);

        // Botones con las banderas
        let height = CANVAS_HEIGHT / 7.5;
        let tweenTime = 7;
        let increase = 1.3;
        this.createFlagButton(1.3 * CANVAS_WIDTH / 6, 1.1 * CANVAS_HEIGHT / 4, height, 'es', 'es', tweenTime, increase);
        this.createFlagButton(3.2 * CANVAS_WIDTH / 6, 1.1 * CANVAS_HEIGHT / 4, height, 'fr', 'fr', tweenTime, increase);
        this.createFlagButton(4.9 * CANVAS_WIDTH / 6, 1.1 * CANVAS_HEIGHT / 4, height, 'en', 'en', tweenTime, increase);

        this.createFlagButton(1.3 * CANVAS_WIDTH / 6, 2.4 * CANVAS_HEIGHT / 4, height, 'pt-br', 'pt-BR', tweenTime, increase);
        this.createFlagButton(3.2 * CANVAS_WIDTH / 6, 2.4 * CANVAS_HEIGHT / 4, height, 'cn-cn', 'cn-CN', tweenTime, increase);
        this.createFlagButton(4.9 * CANVAS_WIDTH / 6, 2.4 * CANVAS_HEIGHT / 4, height, 'cn-hk', 'cn-HK', tweenTime, increase);
        
        // Boton de salir
        let exitButton = new Button(this, 100, 3 * CANVAS_HEIGHT / 4 + 10, 0.5,
            async () => {
                if(!this.gameManager.Initialized) {
                    await this.gameManager.initializedGame();
                }
                this.gameManager.completedGame(true);
            },
            'powerOff', { R: 64, G: 142, B: 134 }, { R: 0, G: 104, B: 93 }, { R: 200, G: 200, B: 200 }
        );
    }

    /**
     * Metodo para crear un boton que cambie al idioma seleccionado
     * @param {Number} x - posicion x
     * @param {Number} y - posicion y
     * @param {Number} height - altura del boton
     * @param {String} sprite - imagen que se va a usar para mostrar al boton
     * @param {Number} tweenTime - tiempo que dura el tween de escalado tanto cuando se coloca el cursor encima como cuando se quita
     * @param {Number} scaleIncrease - cuanto se escala cuando se realiza el tween de escalado al colocar el cursor encima 
     */
    createFlagButton(x, y, height, sprite, language, tweenTime, scaleIncrease) {
        let button = this.add.image(x, y, 'flags', sprite);

        let scale = height / button.height;
        button.setScale(scale);

        button.setInteractive({ useHandCursor: true });
        button.on('pointerover', () => {
            this.tweens.add({
                targets: button,
                scale: scale * scaleIncrease,
                duration: tweenTime,
                ease: 'Expo.easeOut',
                repeat: 0,
            });
        });
        button.on('pointerout', () => {
            this.tweens.add({
                targets: button,
                scale: scale,
                duration: tweenTime,
                ease: 'Expo.easeOut',
                repeat: 0,
            });
        });
        button.on('pointerdown', () => {
            let statementBuilder = xapiTracker.alternative("language", xapiTracker.ALTERNATIVETYPE.MENU).selected(language);
            statementBuilder.send();

            // Se cambia el idioma y se pasa a la pantalla de titulo
            this.i18next.changeLanguage(language);
            this.gameManager.startTitleMenu();
        });
    }
}

class Counter extends Phaser.GameObjects.Container {
    /**
    * Clase que activa un contador y al llegar a un numero creando explota creando particulas
    * Luego de un rato, reaparece y vuelve a funcionar de la misma manera
    * @param {Phaser.Scene} scene - escena a la que pertenece
    * @param {Number} x - posicion x del contador (numero, imagen, donde salen las particulas)
    * @param {Number} y - posicion y del contador (numero, imagen, desde donde salen las particulas)
    * @param {Number} scale - escala del objeto
    * @param {String} fill - sprite que se usa para el relleno del contador
    * @param {String} edge - sprite que se usa para el borde del contador
    * @param {String} particle - sprite que se usa para las particulas
    * @param {String} font - tipografica que se usa para los numeros del contador
    * @param {Number} limit - cuando se llega a este numero (no incluido) el contador desaparece y se produce una explosion
    * @param {Number} increase - el contador escala segun una funcion exponencial (ej. 2^x). Este valor es la x
    * @param {Number} waitTimer - despues de que el contador haya desaparecido, este es el tiempo que tarda en volver a aparecer
    * @param {Color} fillColor - color del relleno en formato RGB (opcional)
    */
    constructor(scene, x, y, scale, fill, edge, particle, font, limit, waitTimer, increase, fillColor) {
        super(scene, x, y);

        this.scene.add.existing(this);

        let gameManager = GameManager.getInstance();

        // Inicializacion
        this.elapsedTime = 0;
        this.waitTimer = waitTimer;
        this.limit = limit;
        this.increase = increase;

        this.fillImg = this.scene.add.image(0, 0, fill);
        if (fillColor) {
            this.fillImg.setTint(fillColor);
        }
        this.add(this.fillImg);

        this.edgeImg = this.scene.add.image(0, 0, edge);
        this.add(this.edgeImg);

        let style = { ...gameManager.textConfig };
        style.fontFamily = font;
        style.fontSize = '90px';

        this.cont = 0;
        this.text = this.scene.add.text(0, 0, this.cont, style);
        this.text.setOrigin(0.5);
        this.add(this.text);

        // Se crea el emisor de particula que funciona en modo explosion
        // Es decir, emite particulas de golpe al realizar una llamada a una funcion
        this.emitter = this.scene.add.particles(0, 0, particle, {
            lifespan: 3000,                     // duracion de cada particula
            speed: { min: 750, max: 1000 },     // velocidad de cada particula en x, y. Valor aleatorio entre los dos especificados
            scale: { start: 0.4, end: 0 },      // las particulas vas reduciendo su tam hasta desaparecer
            frequency: -1,                      // modo explosion
            quantity: 22                        // particulas generadas cada vez
        });

        this.add(this.emitter);

        // Se agrega el contenedor a la lista de actualizados para poder usar el preUpdate
        this.addToUpdateList();
        this.setScale(scale);
    }

    preUpdate(t, dt) {
        this.elapsedTime += dt;

        // Mientras el numero de particulas es menor que el permitido, sigue aumentado el contador
        if (this.cont < this.limit) {
            // El contador responde a una funcion exponencial del modo dt^x, siendo x = increase
            this.cont = Math.pow(this.elapsedTime / 1000, this.increase);
            // Se aproxima al mayor
            this.cont = Math.ceil(this.cont);

            // Si no ha llegado al limite, se actualiza
            if (this.cont < this.limit) {
                this.text.setText(this.cont);
            }
            // En caso contrario, desaparece el contador y se produce la explosion
            else {
                this.elapsedTime = 0;
                this.makeVisible(false);
                this.emitter.explode();
            }
        }
        // Timer para hacer que vuelve a aparecer el contador
        else if (this.elapsedTime > this.waitTimer) {
            this.elapsedTime = 0;
            this.cont = 0;
            this.text.setText(this.cont);
            this.makeVisible(true);
        }
    }

    makeVisible(enable) {
        this.fillImg.setVisible(enable);
        this.edgeImg.setVisible(enable);
        this.text.setVisible(enable);
    }
}

class TitleMenu extends Phaser.Scene {
    /**
     * Pantalla principal
     * @extends Phaser.Scene
     */
    constructor() {
        super({ key: 'TitleMenu' });
    }

    create() {
        const CANVAS_WIDTH = this.sys.game.canvas.width;
        const CANVAS_HEIGHT = this.sys.game.canvas.height;

        let gameManager = GameManager.getInstance();
        let i18next = gameManager.i18next;
        let namespace = 'menus\\titleMenu';

        // Fondo escalado en cuanto al canvas
        let bg = this.add.image(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'basePC');
        let scale = CANVAS_WIDTH / bg.width;
        bg.setScale(scale);

        this.add.rectangle(CANVAS_WIDTH / 2, 0, CANVAS_WIDTH, CANVAS_HEIGHT / 1.2, 0xFFFFFF).setOrigin(0.5, 0);

        // Pantalla del ordenador con el tam del canvas
        let screen = this.add.image(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'PCscreen');
        screen.setDisplaySize(CANVAS_WIDTH, CANVAS_HEIGHT);

        // Boton de jugar
        let offset = 50;
        let playTranslation = i18next.t("playButton", { ns: namespace });
        new Button(this, CANVAS_WIDTH / 2, 2 * CANVAS_HEIGHT / 3 - offset - 10, 0.9,
            () => {
                gameManager.startLoginMenu();
            },
            gameManager.textBox.fillName, { R: 255, G: 255, B: 255 }, { R: 64, G: 142, B: 134 }, { R: 200, G: 200, B: 200 },
            playTranslation, { font: 'kimberley', size: 57, style: 'normal', color: '#004E46' }, gameManager.textBox.edgeName,
            {
                // La textura generada con el objeto grafico es un pelin mas grande que el dibujo en si. Por lo tanto,
                // si la caja de colision por defecto es un pelin mas grande. Es por eso que se pasa una que se ajuste
                // a las medidas reales
                area: new Phaser.Geom.Rectangle(gameManager.textBox.offset, gameManager.textBox.offset, gameManager.textBox.width, gameManager.textBox.height),
                callback: Phaser.Geom.Rectangle.Contains
            }
        );

        // Boton de creditos
        let creditsTranslation = i18next.t("creditsButton", { ns: namespace });
        new Button(this, CANVAS_WIDTH / 2, 2 * CANVAS_HEIGHT / 3 + offset, 0.9,
            () => {
                gameManager.changeScene("CreditsScene");
            },
            gameManager.textBox.fillName, { R: 255, G: 255, B: 255 }, { R: 64, G: 142, B: 134 }, { R: 200, G: 200, B: 200 },
            creditsTranslation, { font: 'kimberley', size: 57, style: 'normal', color: '#004E46' }, gameManager.textBox.edgeName,
            {
                area: new Phaser.Geom.Rectangle(gameManager.textBox.offset, gameManager.textBox.offset, gameManager.textBox.width, gameManager.textBox.height),
                callback: Phaser.Geom.Rectangle.Contains
            }
        );

        // Boton de salir
        let exitTranslation = i18next.t("exitText", { ns: namespace });
        let exitButton = new Button(this, 100, 3 * CANVAS_HEIGHT / 4 + 10, 0.5,
            () => {
                gameManager.startLangMenu();
            },
            'powerOff', { R: 64, G: 142, B: 134 }, { R: 0, G: 104, B: 93 }, { R: 200, G: 200, B: 200 }
        );

        // Texto que esta al lado del boton de salir
        let exitTextStyle = { ...gameManager.textConfig };
        exitTextStyle.fontFamily = 'kimberley';
        exitTextStyle.fontSize = '40px';
        exitTextStyle.color = '#004E46';

        this.add.text(exitButton.x + 60, exitButton.y, exitTranslation, exitTextStyle).setOrigin(0, 0.5);

        // Se obtiene la version del juego (especificada en los parametros de configuracion de game)
        let gameVersion = this.sys.game.config.gameVersion;
        let gameVersionTextStyle = { ...gameManager.textConfig };
        gameVersionTextStyle.fontFamily = 'AUdimat-regular';
        gameVersionTextStyle.fontSize = '22px';
        gameVersionTextStyle.color = '#323232';
        this.add.text(CANVAS_WIDTH - 55, 3 * CANVAS_HEIGHT / 4 + 40, "V " + gameVersion, gameVersionTextStyle).setOrigin(1, 0.5);

        // Logo
        offset = -20;
        let logo = this.add.image(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 3 + offset, 'logoWT');
        logo.setScale(1.1);

        // Contador con la explosion
        // (Crear el ultimo para que las particulas aparezcan por delante)
        new Counter(this, 2 * CANVAS_WIDTH / 3 + 20, CANVAS_HEIGHT / 4 + 30 + offset, 0.4,
            gameManager.roundedSquare.fillName, gameManager.roundedSquare.edgeName,
            gameManager.circleParticle.name, 'gidolinya-regular', 100, 3000, 1.8, 0xFF0808);
    }
}

class CheckBox extends Phaser.GameObjects.Container {
    /**
    * Clase que permite crear una checkbox o radiobutons si se unen varias checkboxes en un grupo
    * @param {Phaser.Scene} scene - escena a la que pertenece
    * @param {Number} x - posicion x
    * @param {Number} y - posicion y
    * @param {Number} scale - escala del objeto
    * @param {Color} tickColor - color hexadecimal del tick
    * @param {Color} pressedCol - color RGB de la checkbox que se utiliza en la animacion cuando se clica en ella
    * @param {String} fill - sprite que se usa para el relleno
    * @param {String} edge - sprite que se usa para el borde (opcional)
    * @param {String} hitArea - cambiar el area de colision (opcional)
    */
    constructor(scene, x, y, scale, tickColor, pressedColor, fill, edge, hitArea) {
        super(scene, x, y);

        this.scene.add.existing(this);

        let gameManager = GameManager.getInstance();

        // Indicar si la checkbox esta activada o no
        this.checked = false;

        // Si es distinto de null pertenece a algun grupo y funciona como un radio button
        this.group = null;

        let fillImg = this.scene.add.image(0, 0, fill);
        this.add(fillImg);

        if (hitArea) {
            fillImg.setInteractive(hitArea.area, hitArea.callback, { useHandCursor: true });
        }
        else {
            fillImg.setInteractive({ useHandCursor: true },);
        }
        if (this.scene.sys.game.debug) {
            this.scene.input.enableDebug(fillImg, '0x000000');
        }

        let nCol = Phaser.Display.Color.HexStringToColor('#ffffff');
        let pCol = Phaser.Display.Color.GetColor(pressedColor.R, pressedColor.G, pressedColor.B);
        pCol = Phaser.Display.Color.IntegerToRGB(pCol);

        fillImg.on('pointerdown', () => {
            let down = scene.tweens.addCounter({
                targets: fillImg,
                from: 0,
                to: 100,
                onUpdate: (tween) => {
                    const value = tween.getValue();
                    let col = Phaser.Display.Color.Interpolate.ColorWithColor(nCol, pCol, 100, value);
                    let colInt = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
                    fillImg.setTint(colInt);
                },
                duration: 80,
                repeat: 0,
                yoyo: true
            });
            down.on('complete', () => {
                if (this.group) {
                    // Si funciona como un radio button, se desactiva el resto del gruop
                    this.group.checkButton(this);
                    this.setChecked(true);
                }
                // Si funciona simplemente como una checkbox, se hace toggle
                else {
                    this.toggleChecked();
                }
            });
        });

        if (edge) {
            let edgeImg = this.scene.add.image(0, 0, edge);
            this.add(edgeImg);
        }

        let style = { ...gameManager.textConfig };
        style.fontSize = '75px';
        style.fontStyle = 'bold';
        style.color = tickColor;
        this.tickText = this.scene.add.text(0, 0, '✓', style).setOrigin(0.5).setVisible(false);
        this.add(this.tickText);

        this.setScale(scale);
    }

    setChecked(checked) {
        this.checked = checked;
        this.tickText.setVisible(this.checked);
    }

    toggleChecked() {
        this.checked = !this.checked;
        this.tickText.setVisible(this.checked);
    }

    setGroup(group) {
        if (!this.group) {
            this.group = group;
        }
    }
}

class RadioButtonGroup {
    /**
     * Clase que permite crear un conjunto de radio buttons a partir de checkboxes
     * @param {Array} - array con las checkboxes que constituyen este grupo
     */
    constructor(radioButtons) {
        this.radioButtons = radioButtons;
        this.selectedButton = null;
        // Se utiliza un map para asignar a cada boton un indice
        // Se hace de esta manera para que sea mas indicar indicar cual es el que ha sido seleccionado
        this.buttonsMap = new Map();

        let cont = 0;
        this.radioButtons.forEach(button => {
            // Se establece el grupo al que pertence cada checkbox
            button.setGroup(this);
            // Se quita el check por si acaso
            button.setChecked(false);
            // Se guarda cada checkbox con un indice relacionado
            this.buttonsMap.set(button, cont);
            ++cont;
        });
    }

    /**
     * Activar el boton del grupo indicado y desactivar el resto
     * @param {CheckBox} - boton que se va a activar
     */
    checkButton(button) {
        this.selectedButton = button;
        this.radioButtons.forEach(button => {
            if (button != this.selectedButton) {
                button.setChecked(false);
            }
        });
    }

    /**
     * Obtener el boton seleccionado. Aunque se devuelve un indice, se puede acceder facilmente
     * al boton original usando este indice en el array de checkboxes
     * @returns indice del boton que se ha pulsado
     */
    getIndexSelButton() {
        if (this.selectedButton) {
            if (this.buttonsMap.has(this.selectedButton)) {
                return this.buttonsMap.get(this.selectedButton);
            }
        }
        return -1;
    }
}

class TextInput extends Phaser.GameObjects.Container {
    /**
    * Clase que permite crear una caja de texto donde poder escribir
    * @param {Phaser.Scene} scene - escena a la que pertenece
    * @param {Number} x - posicion x
    * @param {Number} y - posicion y
    * @param {Number} scale - escala del objeto
    * @param {String} defaultText - texto por defecto que aparece en la caja si no se ha escrito nada aun
    * @param {Number} offset - punto a partir del cual se comienza a escribir el texto para que todo este bien ajustado
    * @param {Color} pressedCol - color RGB al que se cambia cuando se produce la animacion de comenzar a escribir en la caja
    * @param {String} fill - sprite que se usa para el relleno
    * @param {String} edge - sprite que se usa para el borde (opcional)
    * @param {String} font - tipografia (opcional). En caso de que no se especifique ninguna, se usa 'Arial'
    * @param {String} hitArea - cambiar el area de colision para que corresponda con el del relleno del boton (opcional)
    */
    constructor(scene, x, y, scale, defaultText, offset, pressedColor, fill, edge, font, hitArea) {
        super(scene, x, y);

        this.scene.add.existing(this);

        let gameManager = GameManager.getInstance();

        // Relleno del cuadro de texto
        // Es la parte interactuable
        this.fillImg = this.scene.add.image(0, 0, fill);
        this.fillImg.setOrigin(0, 0.5);
        if (hitArea) {
            this.fillImg.setInteractive(hitArea.area, hitArea.callback, { useHandCursor: true });
        }
        else {
            this.fillImg.setInteractive({ useHandCursor: true });
        }
        if (this.scene.sys.game.debug) {
            this.scene.input.enableDebug(this.fillImg, '0xffff00');
        }
        this.add(this.fillImg);

        if (edge) {
            let edgeImg = this.scene.add.image(0, 0, edge);
            edgeImg.setOrigin(0, 0.5);
            this.add(edgeImg);
        }

        // Configuracion del estilo del texto que se escribe
        if (!font) {
            font = 'Arial';
        }

        let style = { ...gameManager.textConfig };
        style.fontFamily = font;
        style.fontSize = '42px';
        style.color = '#000000';

        this.offset = offset;

        this.typeWithOnScreenKeyboard();

        // El texto por defecto aparece en cursiva y con cierto grado de transparencia
        this.defaultTextAlpha = 0.3;
        this.defaultText = defaultText;

        // Inicialmente no hay texto escrito
        this.currentText = "";

        // Texto donde se escribe (inicialmetne esta vacio)
        this.text = this.scene.add.text(this.offset, 0, this.defaultText, style);
        this.text.setAlpha(this.defaultTextAlpha).setOrigin(0, 0.5).setFontStyle('italic');
        this.add(this.text);

        // Indicar si el usuario esta escribiendo o no
        this.isEnteringName = false;

        // Texto para simular el cursor
        // (se trata como un elemento aparte para poder acercarle mas al texto escrito)
        this.cursor = this.scene.add.text(0, 0, '|', style);
        this.cursor.setAlpha(0).setOrigin(0, 0.5);
        this.add(this.cursor);

        // Tween para simular que el cursor aparece y desaparece
        this.cursorTween = this.scene.tweens.add({
            targets: this.cursor,
            alpha: 1,
            duration: 300,
            hold: 600,          // tiempo en milisegundos para que el tween haga yoyo
            yoyo: true,
            repeat: -1,
            paused: true
        });

        let nCol = Phaser.Display.Color.HexStringToColor('#ffffff');
        let pCol = Phaser.Display.Color.GetColor(pressedColor.R, pressedColor.G, pressedColor.B);
        pCol = Phaser.Display.Color.IntegerToRGB(pCol);

        // Se cambia el color de la caja al pasar y sacar el raton por encima
        this.fillImg.on('pointerover', () => {
            scene.tweens.addCounter({
                targets: this.fillImg,
                from: 0,
                to: 100,
                onUpdate: (tween) => {
                    const value = tween.getValue();
                    let col = Phaser.Display.Color.Interpolate.ColorWithColor(nCol, pCol, 100, value);
                    let colInt = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
                    this.fillImg.setTint(colInt);
                },
                duration: 50,
                repeat: 0,
            });
        });
        this.fillImg.on('pointerout', () => {
            scene.tweens.addCounter({
                targets: this.fillImg,
                from: 0,
                to: 100,
                onUpdate: (tween) => {
                    const value = tween.getValue();
                    let col = Phaser.Display.Color.Interpolate.ColorWithColor(pCol, nCol, 100, value);
                    let colInt = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
                    this.fillImg.setTint(colInt);
                },
                duration: 50,
                repeat: 0,
            });
        });

        this.fillImg.on('pointerup', () => {
            // Si se clica en la caja de texto, es que el usuario quiere escribir en la caja
            if (!this.isEnteringName) {
                // Si no hay texto escrito, se quita el texto por defecto
                if (this.currentText === "") {
                    this.setText(this.currentText);
                    this.text.setAlpha(1).setFontStyle('normal');
                }

                // Se activa el cursor
                this.cursor.setAlpha(0);
                this.cursorTween.resume();

                // Se realiza la animacion de la caja cuando se ha clicado
                scene.tweens.addCounter({
                    targets: this.fillImg,
                    from: 0,
                    to: 100,
                    onUpdate: (tween) => {
                        const value = tween.getValue();
                        let col = Phaser.Display.Color.Interpolate.ColorWithColor(nCol, pCol, 100, value);
                        let colInt = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
                        this.fillImg.setTint(colInt);
                    },
                    duration: 50,
                    repeat: 0,
                    yoyo: true
                });

                if (IS_TOUCH) {
                    // Aparece el teclado en pantalla
                    this.hiddenInput.focus();
                }

                this.isEnteringName = true;

                // Habilitar el salir de la caja y dejar de escribir
                // Se tiene que hacer con un pequeño temporizador porque sino saltarian los dos eventos
                // de pointerup a la vez y entonces, no se podria llegar a escribir
                setTimeout(() => {
                    this.deactiveInput();
                }, 10);

            }
        });

        this.setScale(scale);

        this.typeWithKeyboard();

        // Pantalla tactil (se usa el teclado virtual)
        window.addEventListener('touchstart', () => {
            this.hiddenInput.value = this.currentText;
        });

        // Se usa el teclado fisico
        window.addEventListener('mousedown', () => {
            this.hiddenInput.blur();
        });
    }

    /**
     * Escribir texto en la caja si la pantalla no es tactil (se usa el teclado fisico)
     */
    typeWithKeyboard() {
        this.scene.input.keyboard.on('keydown', (event) => {
            if (!IS_TOUCH) {
                // Si se esta escribiendo en la caja, se van procesando las letras que se pulsan en el teclado
                if (this.isEnteringName) {
                    let hasChanged = false;
                    // Borrar caracter
                    if (event.keyCode === 8 && this.currentText.length > 0) {
                        hasChanged = true;
                        this.currentText = this.currentText.slice(0, -1);
                    }
                    // Escribir un nuevo caracter
                    // Nota: \s --> espacio
                    else if (event.key.length === 1 && event.key.match(/[a-zA-Z0-9\s]/)) {
                        hasChanged = true;
                        this.currentText += event.key;
                    }

                    // Se puede escribir en la caja mas caracteres de los que visualmente caben.
                    // Sin embargo, solo se van a mostrar los ultimos
                    if (hasChanged) {
                        this.adjustTextToBox();
                    }
                }
            }
        });
    }

    /**
     * Escribir texto en la caja si la pantalla es tactil (se usa el teclado virtual)
     * Se utiliza una caja de input del DOM para poder tener acceso al teclado virtual, pero
     * se hace invisible la propia caja de input porque no interesa que se muestre
     */
    typeWithOnScreenKeyboard() {
        // Se crea la caja del input del DOM
        this.hiddenInput = document.createElement('input');
        // Se coloca en un lugar en pantalla que no genere mas espacio
        this.hiddenInput.style.position = 'absolute';
        this.hiddenInput.style.top = '50px';
        this.hiddenInput.style.left = '50px';
        // Se hace invisible: opacity a 0 para que no se vea, pero se siga pudiendo interactuar con ella
        // y zIndex a -1 para que se coloque debajo de cualquier objeto (por si acaso)
        this.hiddenInput.style.opacity = '0';
        this.hiddenInput.style.zIndex = '-1';
        // Se coloca en el documento
        document.body.appendChild(this.hiddenInput);

        this.hiddenInput.addEventListener('input', (event) => {
            if (IS_TOUCH) {
                // El valor escrito en la caja de input del DOM escribe en la de la clase
                this.currentText = event.target.value;
                this.adjustTextToBox();
            }
        });

        // Hacer que la aparicion del teclado virtual sea suave
        this.hiddenInput.addEventListener('focus', () => {
            this.hiddenInput.scrollIntoView({ behavior: 'smooth' });
        });
    }

    /**
     * Ajustar el texto al ancho de la caja, de modo que solo se muestran los caracteres que visualmente caben
     * Se pueden escribir mas caracteres de los que visualmente caben, pero solo se van a mostrar los ultimos
     */
    adjustTextToBox() {
        // Se comprueba si el texto actual se puede mostrar visualmente entero en la caja
        this.setText(this.currentText);
        let cont = 1;
        // Si no caben todos los caracteres, se van quitando uno a uno del principio
        // hasta encontrar cual es el maximo que se puede mostrar visualmente
        while (this.text.width >= this.fillImg.displayWidth - this.offset * 2) {
            let aux = this.currentText.slice(-(this.currentText.length - cont));
            this.setText(aux);
            ++cont;
        }
    }

    deactiveInput() {
        // Se desactiva cualquier evento de pointerup que pudiera haber en la escena
        // (No es necesario, pero se hace por si acaso)
        this.scene.input.off('pointerup');
        // Se activa un evento de pointerup que se produce una sola vez al clicar en cualquier
        // lugar de la escena
        // Nota: los eventos de la escena tienen preferencia a los eventos de los objetos
        // Por lo tanto, pulsar en la escena no va a colisionar con pulsar en otra caja. Si este evento
        // estuviera activado, y se pulsara en una caja, seria este el que se lanzara y no el de la caja
        this.scene.input.once('pointerup', () => {
            // Se desactiva el poder escribir
            if (this.isEnteringName) {
                this.deactiveBox();

                if (IS_TOUCH) {
                    // Desaparece el teclado en pantalla
                    this.hiddenInput.blur();
                }
            }
        });
    }

    deactiveBox() {
        this.isEnteringName = false;

        // Se deja el texto ya escrito o si no se ha escrito ningun
        // texto, se vuelve al texto por defecto
        if (!this.currentText) {
            this.setDefaultText();
        }

        // Se desactiva el cursor
        this.cursor.setAlpha(0);
        this.cursorTween.pause();
    }

    setText(text) {
        this.text.setText(text);
        this.cursor.x = this.text.x + this.text.width - 4;
    }

    getText() {
        return this.currentText;
    }

    isValid() {
        let aux = this.currentText !== "";
        return aux;
    }

    reset() {
        this.isEnteringName = false;
        this.currentText = "";
        this.setDefaultText();
        this.cursor.setAlpha(0);
        this.cursorTween.pause();
    }

    setDefaultText() {
        this.setText(this.defaultText);
        this.text.setAlpha(this.defaultTextAlpha).setFontStyle('italic');
    }

    /**
     * Eliminar la caja de input del DOM de la escena
     * Nota: conviene usar este metodo al destruir la escena donde se ha creado este objeto
     * porque la caja de input del DOM no se va a utilizar mas
     */
    removeHiddenInput() {
        this.hiddenInput.remove();
    }
}

class LoginMenu extends Phaser.Scene {
    /**
     * Menu donde el jugador introduce su informacion
     * @extends Phaser.Scene
     */
    constructor() {
        super({ key: 'LoginMenu' });
    }

    create() {
        const CANVAS_WIDTH = this.sys.game.canvas.width;
        const CANVAS_HEIGHT = this.sys.game.canvas.height;

        this.gameManager = GameManager.getInstance();
        this.i18next = this.gameManager.i18next;
        this.namespace = 'menus\\loginMenu';
        this.maxNameCharacters = 10;
        this.maxUserCharacters = 16;

        // Mesa
        let bg = this.add.image(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'basePC');
        let scale = CANVAS_WIDTH / bg.width;
        bg.setScale(scale);

        // Color base del fondo de pantalla del ordenador
        this.add.rectangle(CANVAS_WIDTH / 2, 0, CANVAS_WIDTH, CANVAS_HEIGHT / 1.2, 0x2B9E9E).setOrigin(0.5, 0);

        // Fondo de login del ordenador
        let loginBg = this.add.image(0.23 * CANVAS_WIDTH / 5, 4.1 * CANVAS_HEIGHT / 5, 'loginBg');
        loginBg.setOrigin(0, 1).setScale(0.61);
        loginBg.displayWidth += 20;

        // Pantalla del ordenador con el tam del canvas
        let screen = this.add.image(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'PCscreen');
        screen.setDisplaySize(CANVAS_WIDTH, CANVAS_HEIGHT);

        // Boton atras
        let backButton = this.createBackButton(102, 3 * CANVAS_HEIGHT / 4 + 15, 4, 1.18);
        let backTranslation = this.i18next.t("backButton", { ns: this.namespace });
        let backTextStyle = { ...this.gameManager.textConfig };
        backTextStyle.fontFamily = 'AUdimat-regular';
        backTextStyle.fontSize = '35px';
        let backText = this.add.text(backButton.x + 45, backButton.y + 20, backTranslation, backTextStyle);
        backText.setOrigin(0, 0.5);

        // Titulo princiapl
        let mainTranslation = this.i18next.t("mainText", { ns: this.namespace });
        let mainTextStyle = { ...this.gameManager.textConfig };
        mainTextStyle.fontFamily = 'AUdimat-regular';
        mainTextStyle.fontSize = '56px';
        let mainText = this.add.text(CANVAS_WIDTH - 75, CANVAS_HEIGHT / 5.5, mainTranslation, mainTextStyle);
        mainText.setOrigin(1, 0.5);

        // Cajas de seleccion de genero
        let checkBoxes = [];
        // chico
        checkBoxes.push(this.createGenderCheckbox(CANVAS_WIDTH - 122, 1.68 * CANVAS_HEIGHT / 3, 0.74, 'boyIcon'));
        // chica
        checkBoxes.push(this.createGenderCheckbox(CANVAS_WIDTH - 232, 1.68 * CANVAS_HEIGHT / 3, 0.74, 'girlIcon'));
        let genderGroup = new RadioButtonGroup(checkBoxes);

        // CAJAS DONDE INTRODUCIR LOS DATOS DEL PERSONAJE (NOMBRE, USUARIO Y CONTRASENA)
        let offset = 75;
        let nameTranslation = this.i18next.t("nameInput", { ns: this.namespace, returnObjects: true });
        let nameText = this.createTextInputSet(2.1 * CANVAS_WIDTH / 3, 1.80 * CANVAS_HEIGHT / 5 - offset, 0.60,
            nameTranslation.sideText, nameTranslation.defaultText);

        let userTranslation = this.i18next.t("userInput", { ns: this.namespace, returnObjects: true });
        let userText = this.createTextInputSet(2.1 * CANVAS_WIDTH / 3, 1.80 * CANVAS_HEIGHT / 5, 0.60,
            userTranslation.sideText, userTranslation.defaultText);

        let passwordTranslation = this.i18next.t("passwordInput", { ns: this.namespace, returnObjects: true });
        let passwordText = this.createTextInputSet(2.1 * CANVAS_WIDTH / 3, 1.80 * CANVAS_HEIGHT / 5 + offset, 0.60,
            passwordTranslation.sideText, passwordTranslation.defaultText);

        this.events.on('shutdown', () => {
            nameText.removeHiddenInput();
            userText.removeHiddenInput();
            passwordText.removeHiddenInput();
        });

        // Texto de error si alguno de los parametros es incorrecto
        let errorTextStyle = { ...this.gameManager.textConfig };
        errorTextStyle.fontFamily = 'adventpro-regular';
        errorTextStyle.fontSize = '27px';
        errorTextStyle.color = '#ff0000';
        let errorText = this.add.text(CANVAS_WIDTH - 83, 3.86 * CANVAS_HEIGHT / 6, " ", errorTextStyle);
        errorText.setVisible(false).setOrigin(1, 0.5);

        // Boton de jugar
        let startTranslation = this.i18next.t("startButton", { ns: this.namespace });
        new Button(this, CANVAS_WIDTH - 208, 2.85 * CANVAS_HEIGHT / 4, 0.75,
            () => {
                // Se comprueba segun el texto introducido si alguno de los datos es incorrecto
                let aux = this.handleErrors(genderGroup, nameText, userText, passwordText);
                // Si es incorrecto, se muestra un mensaje de error
                if (aux) {
                    errorText.setVisible(true);
                    errorText.setText(aux);
                }
                // Si es correcto, se pasa a la siguiente escena con la informacion recabada
                else {
                    let userInfo = {
                        name: nameText.getText(),
                        username: userText.getText(),
                        password: passwordText.getText(),
                        gender: genderGroup.getIndexSelButton(),
                    };
                    if (userInfo.gender === 0) {
                        userInfo.gender = "male";
                    }
                    else if (userInfo.gender === 1) {
                        userInfo.gender = "female";
                    }
                    xapiTracker.accessible("StartGame")
                                .accessed()
                                .withResultExtension("gender", userInfo.gender)
                                .withResultExtension("password", userInfo.password)
                                .send();
                    this.gameManager.startGame(userInfo);
                }
            },
            this.gameManager.textBox.fillName, { R: 145, G: 209, B: 226 }, { R: 134, G: 193, B: 208 }, { R: 200, G: 200, B: 200 },
            startTranslation, { font: 'AUdimat-regular', size: 50, style: 'bold', color: '#FFFFFF' }, this.gameManager.textBox.edgeName,
            {
                area: new Phaser.Geom.Rectangle(this.gameManager.textBox.offset, this.gameManager.textBox.offset, this.gameManager.textBox.width, this.gameManager.textBox.height),
                callback: Phaser.Geom.Rectangle.Contains
            }
        );

        // Titulo que aparece a la izquierda
        let warningTextStyle = { ...this.gameManager.textConfig };
        warningTextStyle.fontFamily = 'adventpro-regular';
        warningTextStyle.fontSize = '31px';
        warningTextStyle.backgroundColor = 'rgba(255, 0, 0, 0.7)';
        warningTextStyle.align = 'center';
        warningTextStyle.wordWrap = {
            width: 270,
            useAdvancedWrap: true
        };
        warningTextStyle.padding = {
            left: 63,
            top: 8
        };
        let warningTranslation = this.i18next.t("warningText", { ns: this.namespace });
        let warningText = this.add.text(CANVAS_WIDTH / 4.85, CANVAS_HEIGHT / 4, warningTranslation, warningTextStyle).setOrigin(0.5);

        // Texto explicativo que acompana al titulo de la izquierda
        let inscriptionTranslation = this.i18next.t("inscriptionText", { ns: this.namespace });

        let inscriptionStyle = { ...this.gameManager.textConfig };
        inscriptionStyle.fontFamily = 'adventpro-regular';
        inscriptionStyle.fontSize = '28px';
        inscriptionStyle.backgroundColor = 'rgba(0, 0, 0, 0.7';
        inscriptionStyle.align = 'center';
        inscriptionStyle.wordWrap = {
            width: 270,
            useAdvancedWrap: true
        };
        inscriptionStyle.padding = {
            left: 20,
            top: 20
        };
        this.add.text(CANVAS_WIDTH / 4.85, warningText.y + 34, inscriptionTranslation, inscriptionStyle).setOrigin(0.5, 0);
    }

    /**
     * Metodo para crear un boton que sirve para volver a la pantalla anterior
     * y que tiene animaciones de escalado a la hora de interactuar con el
     */
    createBackButton(x, y, tweenTime, scaleIncrease) {
        let button = this.add.image(x, y, 'backButton');
        let origScale = button.scale;
        button.setInteractive({ useHandCursor: true },);

        button.on('pointerover', () => {
            this.tweens.add({
                targets: button,
                scale: origScale * scaleIncrease,
                duration: tweenTime,
                ease: 'Expo.easeOut',
                repeat: 0,
            });
        });
        button.on('pointerout', () => {
            this.tweens.add({
                targets: button,
                scale: origScale,
                duration: tweenTime,
                ease: 'Expo.easeOut',
                repeat: 0,
            });
        });
        button.on('pointerdown', () => {
            this.gameManager.startTitleMenu();
        });
        return button;
    }

    handleErrors(genderGroup, nameText, userText, passwordText) {
        let aux = "errorTexts";
        if (!nameText.isValid()) {
            return this.i18next.t(aux + ".invalidName", { ns: this.namespace });
        }
        if (!userText.isValid()) {
            return this.i18next.t(aux + ".invalidUser", { ns: this.namespace });
        }
        if (!passwordText.isValid()) {
            return this.i18next.t(aux + ".invalidPassword", { ns: this.namespace });
        }
        if (nameText.getText().length > this.maxNameCharacters) {
            return this.i18next.t(aux + ".shorterName", { ns: this.namespace, number: this.maxNameCharacters });
        }
        if (userText.getText().length > this.maxUserCharacters || passwordText.getText().length > this.maxUserCharacters) {
            return this.i18next.t(aux + ".shorterUserOrPassword", { ns: this.namespace, number: this.maxUserCharacters });
        }
        if (genderGroup.getIndexSelButton() === -1) {
            return this.i18next.t(aux + ".invalidGender", { ns: this.namespace });
        }
        return null;
    }

    /**
     * Crear una caja de seleccion de genero. Cada una esta formada por una checkbox y una imagen
     * Clicando en la imagen se activa la checkbox
     */
    createGenderCheckbox(x, y, scale, iconSprite) {
        // Container para poder moverlo todo junto facilmente
        let container = this.add.container(x, y);
        let icon = this.add.image(0, 0, iconSprite);
        container.add(icon);

        let checkBoxParams = {
            offsetX: -50,
            offsetY: -50,
            scale: 0.3
        };
        // Hay que modificar el area de colision de la checkbox para que sea los iconos de chico/chica y no la propia imagen
        let rectangle = new Phaser.Geom.Rectangle(0, 0, icon.displayWidth / checkBoxParams.scale, icon.displayHeight / checkBoxParams.scale);
        // Inicialmente el centro del checkbox y del icono coinciden
        // Entonces, sabiendo eso, se coloca el centro del area de colision en esa posicion y luego, se mueve respecto a como
        // este la checkbox desplazada de su centro
        rectangle.centerX = this.gameManager.roundedSquare.width / 2 + this.gameManager.roundedSquare.offset - checkBoxParams.offsetX / checkBoxParams.scale;
        rectangle.centerY = this.gameManager.roundedSquare.height / 2 + this.gameManager.roundedSquare.offset - checkBoxParams.offsetY / checkBoxParams.scale;

        let checkBox = new CheckBox(this, checkBoxParams.offsetX, checkBoxParams.offsetY, checkBoxParams.scale, '#000000',
            { R: 200, G: 200, B: 200 }, this.gameManager.roundedSquare.fillName, this.gameManager.roundedSquare.edgeName,
            {
                area: rectangle,
                callback: Phaser.Geom.Rectangle.Contains
            }).setVisible(true);

        container.add(checkBox);

        container.setScale(scale);

        return checkBox;
    }

    /**
     * Crear una caja de input con un texto informativo a la izquierda
     */
    createTextInputSet(x, y, scale, sideText, defaultText) {
        let container = this.add.container(x, y);

        let style = { ...this.gameManager.textConfig };
        style.fontFamily = 'adventpro-regular';
        style.fontSize = '55px';

        let text = this.add.text(-10, 0, sideText, style);
        text.setOrigin(1, 0.5);
        container.add(text);

        let textInput = new TextInput(this, 0, 0, 1, defaultText + " ", 23, { R: 200, G: 200, B: 200 },
            this.gameManager.inputBox.fillName, this.gameManager.inputBox.edgeName, 'adventpro-regular',
            {
                area: new Phaser.Geom.Rectangle(this.gameManager.inputBox.offset, this.gameManager.inputBox.offset, this.gameManager.inputBox.width, this.gameManager.inputBox.height),
                callback: Phaser.Geom.Rectangle.Contains
            });
        container.add(textInput);

        container.setScale(scale);

        return textInput;
    }
}

class CreditsScene extends Phaser.Scene {
    /**
     * Escena con los creditos del juego
     * Se puede acceder a ella desde el menu con el titulo y desde el final del juego
     */
    constructor() {
        super({ key: 'CreditsScene' });
    }

    create(params) {
        this.CANVAS_WIDTH = this.sys.game.canvas.width;
        this.CANVAS_HEIGHT = this.sys.game.canvas.height;

        this.gameManager = GameManager.getInstance();
        this.i18next = this.gameManager.i18next;
        this.ns = 'menus\\creditsScene';

        // Fondo blanco
        let bgColor = 0xFFFFFF;
        let bg = this.add.rectangle(this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2, this.CANVAS_WIDTH, this.CANVAS_HEIGHT, bgColor);
        bg.setOrigin(0.5);
        bg.setStrokeStyle(1, bgColor);

        // Padings laterales e inferiores de los botones y el logo del juego
        let sidePadding = 100;
        let bottomPadding = 40;

        if (params.endgame) {
            // Boton de salir (se regresa a la pantalla de seleccion del idioma)
            let exitButtonTranslation = this.i18next.t("exitButton", { ns: this.ns });
            let exitButton = new Button(this, sidePadding, this.CANVAS_HEIGHT - bottomPadding, 0.47,
                () => {
                    this.gameManager.completedGame(true);
                    this.gameManager.startLangMenu();
                },
                this.gameManager.textBox.fillName, { R: 240, G: 240, B: 240 }, { R: 64, G: 142, B: 134 }, { R: 200, G: 200, B: 200 },
                exitButtonTranslation, { font: 'kimberley', size: 75, style: 'normal', color: '#004E46' }, this.gameManager.textBox.edgeName,
                {
                    area: new Phaser.Geom.Rectangle(this.gameManager.textBox.offset, this.gameManager.textBox.offset, this.gameManager.textBox.width, this.gameManager.textBox.height),
                    callback: Phaser.Geom.Rectangle.Contains
                }
            );
        } else {
            // Boton de volver (solo aparece si se accede desde el menu principal)
            let returnButtonTranslation = this.i18next.t("returnButton", { ns: this.ns });
            new Button(this, sidePadding, this.CANVAS_HEIGHT - bottomPadding, 0.47,
                () => {
                    this.gameManager.startTitleMenu();
                },
                this.gameManager.textBox.fillName, { R: 240, G: 240, B: 240 }, { R: 64, G: 142, B: 134 }, { R: 200, G: 200, B: 200 },
                returnButtonTranslation, { font: 'kimberley', size: 75, style: 'normal', color: '#004E46' }, this.gameManager.textBox.edgeName,
                {
                    area: new Phaser.Geom.Rectangle(this.gameManager.textBox.offset, this.gameManager.textBox.offset, this.gameManager.textBox.width, this.gameManager.textBox.height),
                    callback: Phaser.Geom.Rectangle.Contains
                }
            );
        }

        // Logo del juego
        let gameLogo = this.add.image(this.CANVAS_WIDTH - sidePadding, this.CANVAS_HEIGHT - bottomPadding, 'logoWT');
        gameLogo.setScale(0.32);

        // Flechas para indicar que se esta moviendo hacia adelante o hacia detras los creditos
        let rewindSideOffset = 90;
        let rewindY = this.CANVAS_HEIGHT / 4;
        this.rightRewind = this.createRewind(rewindSideOffset, rewindY, false);
        this.leftRewind = this.createRewind(this.CANVAS_WIDTH - rewindSideOffset, rewindY, true);

        // Enum para indicar que boton del raton se esta pulsando
        // Nota: se usa para desplazar los creditos hacia abajo o hacia arriba
        this.MouseButton = {
            RIGHT: 'RIGHT',
            LEFT: 'LEFT',
            NONE: 'NONE'
        };
        this.buttonPressed = this.MouseButton.NONE;

        this.creditsCont = null;
        // Padding de los creditos tanto al principio como al final
        this.creditsContPadding = 80;
        // Ultimo item que hay en los creditos
        // Nota: se usa para colocar mas items debajo facilmente y para poder calcular la altura total del contenedor de los creditos
        this.lastItem = null;

        // Si los creditos se estas desplazando automaticamente o manualmente
        // Nota: al principio los creditos se desplazan hacia arriba desde fuera de la pantalla y una vez que han llegado al final,
        // ya se pueden desplazar manualmente
        this.automaticMov = true;
        // Diferentes velocidades en funcion del tipo de desplazamiento
        this.movSpeed = {
            automatic: 0.2,
            manual: 1
        };

        // Se crean los creditos
        this.createCreditsContainer();
    }

    /**
     * Se crean los diferentes textos e imagenes que hay en el contendor
     */
    createCreditsContainer() {
        // Diferentes tamanos de los textos
        let sizes = {
            title: 95,              // titulos
            subtitle: 59,           // subtitulos
            smallerSubtitle: 52,    // subtitulos de tam mas pequeno
            name: 47,               // nombres personas
            team: 45,               // departamentos
            key: 31,                // leyendas
            schoolKey: 28,          // texto introductorio de los colegios
            school: 34,             // colegios
            schoolPlace: 28         // lugares de los colegios
        };

        // Posibles fuentes
        let fonts = {
            kimberley: "kimberley",
            adventpro: "adventpro-regular"
        };

        let paddings = {
            title: 65,      // separacion titulo-resto
            name: 10,       // separacion entre nombres personas
            team: 37,       // separacion departamento-nombre y entre imagenes
            key: 10         // separacion nombres personas-texto que acompana
        };
        // Se guarda como una propiedad porque se utiliza en varias ocasiones
        paddings.doubleTeam = paddings.team * 2;

        // Diferentes configuraciones (combinacion de tamano y fuente)
        let fontParams = {
            title: {
                size: sizes.title,
                font: fonts.kimberley
            },
            subtitle: {
                size: sizes.subtitle,
                font: fonts.kimberley
            },
            smallerSubtitle: {
                size: sizes.smallerSubtitle,
                font: fonts.kimberley
            },
            name: {
                size: sizes.name,
                font: fonts.adventpro
            },
            team: {
                size: sizes.team,
                font: fonts.kimberley
            },
            key: {
                size: sizes.key,
                font: fonts.adventpro
            },
            school: {
                size: sizes.school,
                font: fonts.adventpro
            },
            schoolPlace: {
                size: sizes.schoolPlace,
                font: fonts.adventpro
            },
            schoolKey: {
                size: sizes.schoolKey,
                font: fonts.kimberley
            }

        };

        // Empieza desde el final de la pantalla
        let creditsContY = this.creditsContPadding + this.CANVAS_HEIGHT;
        this.creditsCont = this.add.container(this.CANVAS_WIDTH / 2, creditsContY);

        this.style = { ...this.gameManager.textConfig };
        this.style.color = '#00685D';

        //----------------------------------------------------//
        // Titulo principal
        this.createTranslatedTextBelow(0, "titleText", fontParams.title);
        // Direccion de proyecto
        this.createTranslatedTextBelow(paddings.title, "projectManagerText", fontParams.team);
        this.createTextBelow(paddings.team, "Baltasar Fernández Majón", fontParams.name);
        // Diseño y desarrollo
        this.createTranslatedTextBelow(paddings.team, "design-devText", fontParams.team);
        this.createTextBelow(paddings.team, "Antonio Calvo Morata", fontParams.name);
        // Direccion y arte
        this.createTranslatedTextBelow(paddings.team, "artManagerText", fontParams.team);
        this.createTextBelow(paddings.team, "Ana Vallecillos Ruiz", fontParams.name);
        // Arte y animacion
        this.createTranslatedTextBelow(paddings.team, "art-animationText", fontParams.team);
        this.createTextBelow(paddings.team, "Lola González Gutiérrez", fontParams.name);
        this.createTextBelow(paddings.name, "Ana Vallecillos Ruiz", fontParams.name);
        // Versión web
        this.createTranslatedTextBelow(paddings.team, "webVersionText", fontParams.team);
        this.createTextBelow(paddings.team, "Matt Castellanos Silva", fontParams.name);
        this.createTextBelow(paddings.name, "Pedro León Miranda", fontParams.name);
        // Idea original
        this.createTranslatedTextBelow(paddings.team, "originalConceptText", fontParams.subtitle);
        this.createTextBelow(paddings.team, "Antonio Calvo Morata", fontParams.name);
        this.createTextBelow(paddings.name, "Dan Cristian Rotaru", fontParams.name);
        this.createTextBelow(paddings.name, "Iván José Pérez Colado", fontParams.name);
        this.createTextBelow(paddings.name, "Lola Fernández Gutiérrez", fontParams.name);
        // Agradecimientos
        this.createTranslatedTextBelow(paddings.team, "acknowledgmentsText", fontParams.team);
        this.createTextBelow(paddings.team, "Víctor Manuel Pérez Colado", fontParams.name);
        this.createTranslatedTextBelow(paddings.key, "libraryText", fontParams.key);
        this.createTextBelow(paddings.doubleTeam, "Dan Cristian Rotaru", fontParams.name);
        this.createTextBelow(paddings.name, "Ivan José Pérez Colado", fontParams.name);
        this.createTextBelow(paddings.name, "Lola Fernández Gutiérrez", fontParams.name);
        this.createTranslatedTextBelow(paddings.key, "hackatonText", fontParams.key);
        // Beta testers
        let medalOffsetX = 300;
        this.createTranslatedTextBelow(paddings.team, "betaTestersText", fontParams.subtitle);
        this.createTextBelow(paddings.doubleTeam, "Ana Ruiz Lanau", fontParams.name);
        this.createMedalOnTheRight(this.lastItem, medalOffsetX, 'first');
        this.createTextBelow(paddings.doubleTeam, "Cristina Alonso Fernández", fontParams.name);
        this.createMedalOnTheRight(this.lastItem, medalOffsetX, 'second');
        this.createTextBelow(paddings.doubleTeam, "Dan Cristian Rotaru", fontParams.name);
        this.createMedalOnTheRight(this.lastItem, medalOffsetX, 'third');
        this.createTextBelow(paddings.doubleTeam, "Ana Rus Cano Moreno", fontParams.name);
        // Equipo de localizacion
        this.createTranslatedTextBelow(paddings.team, "localizationText", fontParams.team);
        this.createTextBelow(paddings.team, "Pablo Gómez Calvo", fontParams.name);
        this.createTextBelow(paddings.name, "Sergio Juan Higuera Velasco", fontParams.name);
        this.createTextBelow(paddings.name, "Javier Landaburu Sánchez", fontParams.name);
        this.createTextBelow(paddings.name, "Jose María Monreal González", fontParams.name);
        // Textos en frances
        this.createTranslatedTextBelow(paddings.team, "frenchText", fontParams.team);
        this.createTextBelow(paddings.team, "Julio Santilario Berthilier", fontParams.name);
        // Colaboradores
        this.createTranslatedTextBelow(paddings.team, "collaboratorsText", fontParams.subtitle);
        this.createImgBelow(paddings.team, 0.45, 'orientacion_Madrid', 'someBrands');
        // Centros educativos
        this.createTranslatedTextBelow(paddings.team, "schoolsText", fontParams.smallerSubtitle);
        this.createTranslatedTextBelow(paddings.team, "schoolCollabText", fontParams.schoolKey);
        let schoolsInfo = [
            { school: "Centro La Inmaculada", place: "Madrid, Escolapias Puerta de Hierro" },
            { school: "Colegio San Jorge", place: "La Alcanya, Murcía" },
            { school: "IES Salvador Victoria", place: "Teruel" },
            { school: "IES Manuel de Falla", place: "Puerto Real, Cádiz" },
            { school: "IES Valdespartera", place: "Zaragoza" },
            { school: "IES Federico Balart", place: "Pliego, Murcía" },
            { school: "IES Europa", place: "Móstoles, Madrid" },
            { school: "IES Giner de los Ríos", place: "Alcobendas, Madrid" },
            { school: "IES Marqués de Santillana", place: "Colmenar Viejo, Madrid" },
            { school: "IES Antonio Machado", place: "Soria" }
        ];
        let colsPadding = 350;
        this.createSchoolsTexts(schoolsInfo, colsPadding, 2, fontParams, paddings);
        // Mas agradecimientos
        this.createTranslatedTextBelow(paddings.team, "specialThanksText", fontParams.subtitle);
        this.createTextBelow(paddings.team, "Concha García Diego", fontParams.name);
        this.createTextBelow(paddings.key, "(Escuni)", fontParams.name);
        this.createTextBelow(paddings.team, "Santiago Ortigosa López", fontParams.name);
        this.createTextBelow(paddings.key, "(Facultad de Educación, UCM)", fontParams.name);
        // Patrocinadores
        this.createTranslatedTextBelow(paddings.doubleTeam, "sponsorsText", fontParams.subtitle);
        let brandsInfo = [
            ['logo_rage',
                { atlas: 'someBrands', frame: 'logo_telefonica' }
            ],
            [
                'beaconing',
                { atlas: 'someBrands', frame: 'logo_impress' }
            ],
        ];
        colsPadding = 358;
        let brandsHeight = 90;
        brandsInfo.forEach((info) => {
            this.createColsImgsBelow(paddings.team, info, brandsHeight, colsPadding);
        });
        // Nota: las dos ultimas se crean de forma independiente para poder centrarlas y hacer el primer logo mas grande que el resto
        let logo_ucm = this.createImgBelow(paddings.team, 0.08, 'logo_ucm');
        logo_ucm.x -= colsPadding / 2;
        this.createImgOnTheRight(this.lastItem, colsPadding, 0.55, 'logo_e-ucm', 'someBrands');

        // Despedida
        this.createTranslatedTextBelow(paddings.title * 2, "endThanksText", fontParams.title);

        // Altura del contenedor de creditos (para poder moverlo correctamente)
        this.creditsCont.h = this.lastItem.y + this.lastItem.displayHeight;
    }

    /**
     * Mover los creditos hacia arriba respetando el padding
     * @param {Number} speed - velocidad la que se mueven 
     * @param {Number} dt - delta time (en segundos)
     * @returns {Boolean} - true en caso de que haya llegado al final, false en caso contrario
     */
    moveCreditsUp(speed, dt) {
        // Se calcula el punto maximo hasta el que pueden bajar
        let bottomBoundary = this.CANVAS_HEIGHT - this.creditsContPadding;
        // Se calcula la posicion final del texto (teniendo en cuenta altura)
        this.creditsEnd = this.creditsCont.y + this.creditsCont.h;
        // Si aun no ha llegado al final...
        if (this.creditsEnd > bottomBoundary) {
            // Se mueve
            this.creditsCont.y = this.creditsCont.y - speed * dt;
            return false;
        }
        // Si ha llegado...
        else {
            // Se coloca en la posicion esperada (por si habia algun pequeno error)
            this.creditsCont.y = bottomBoundary - this.creditsCont.h;
            return true;
        }
    }

    /**
     * Mover los creditos hacia abajo respetando el padding
     * @param {Number} speed - velocidad la que se mueven 
     * @param {Number} dt - delta time (en segundos)
     * @returns {Boolean} - true en caso de que haya llegado al final, false en caso contrario
     */
    moveCreditsDown(speed, dt) {
        // Se calcula el punto maximo hasta el que puede subir
        let topBoundary = this.creditsContPadding;
        // si aun no ha llegado al final...
        if (this.creditsCont.y < topBoundary) {
            // Se mueve
            this.creditsCont.y = this.creditsCont.y + speed * dt;
            return false;
        }
        // Si ha llegado...
        else {
            // Se coloca en la posicion esperada (por si habia algun pequeño error)
            this.creditsCont.y = topBoundary;
            return true;
        }
    }

    update(t, dt) {
        // Si se esta moviendo automaticamente...
        if (this.automaticMov) {
            // Los creditos van hacia arriba
            let end = this.moveCreditsUp(this.movSpeed.automatic, dt);
            if (end) {
                // Cuando han llegado al final, se activa el modo manual
                this.enableManualMov();
            }
        }
        else {
            // Movimiento manual
            // Clic secundario (hacia arriba)
            if (this.buttonPressed === this.MouseButton.RIGHT) {
                this.moveCreditsUp(this.movSpeed.manual, dt);
            }
            // Clic principal (hacia abajo)
            else if (this.buttonPressed === this.MouseButton.LEFT) {
                this.moveCreditsDown(this.movSpeed.manual, dt);
            }
        }
    }

    /**
     * Activar el movimiento manual
     */
    enableManualMov() {
        this.automaticMov = false;

        // Se usan los botones del raton para desplazar el texto
        this.input.on('pointerdown', (pointer) => {
            if (this.buttonPressed === this.MouseButton.NONE) {
                // Boton principal
                if (pointer.rightButtonDown()) {
                    this.buttonPressed = this.MouseButton.RIGHT;
                    this.leftRewind.setVisible(true);
                }
                // Boton secundario
                else {
                    this.buttonPressed = this.MouseButton.LEFT;
                    this.rightRewind.setVisible(true);
                }
            }
        });

        this.input.on('pointerup', (pointer) => {
            // Si se ha dejado de pulsar, desaparecen las flechas
            // Nota: se hace que desaparezcan ambas por sencillez
            this.buttonPressed = this.MouseButton.NONE;
            this.leftRewind.setVisible(false);
            this.rightRewind.setVisible(false);
        });
    }

    /**
     * Crear texto de los colegios (nombre y ubicacion dividos en varias columnas)
     * @param {Array} schoolsInfo - array en la que cada componente es un objeto que indica el colegio y su ubicacion
     * @param {Number} colsPadding - distancia entre ambas columnas 
     * @param {Number} nCols - numero de columnas
     * @param {Object} fontParams - objeto con todas las posibles configuraciones de fuente 
     * @param {Object} paddings - objeto con todas las posibles configuraciones de paddings
     */
    createSchoolsTexts(schoolsInfo, colsPadding, nCols, fontParams, paddings) {
        // Colegios
        let schools = [];
        // Ubicaciones de los colegios
        let places = [];

        // El numero de columnas determian como esta colocado la informacion de los colegios
        // Por ejemplo, si se indican 2 columnas y 8 colegios, va a haber 4 filas
        let cont = 0;
        schoolsInfo.forEach((info) => {
            schools.push(info.school);
            places.push("(" + info.place + ")");
            ++cont;
            // Cada vez que se cogen tantos elementos como columnas...
            if (cont >= nCols) {
                // Se crea fila 
                this.createColsTextsBelow(paddings.team, schools, fontParams.school, colsPadding);
                this.createColsTextsBelow(paddings.key, places, fontParams.schoolPlace, colsPadding);
                cont = 0;
                schools = [];
                places = [];
            }
        });

        // Si no habia suficientes elementos para hacer una fila con el numero de columnas indicado,
        // se crea una fila con un numero de columnas menor
        if (schools.length > 0) {
            this.createColsTextsBelow(paddings.team, schools, fontParams.school, colsPadding);
        }
        if (places.length > 0) {
            this.createColsTextsBelow(paddings.key, places, fontParams.schoolPlace, colsPadding);
        }
    }

    /**
     * Crear una imagen a la derecha de un objeto
     * Nota: no hace falta setear lastItem
     * @param {Object} item - objeto que se utiliza de referencia
     * @param {Number} offsetX - offset 
     * @param {Number} scale - escala de la imagen
     * @param {String} sprite - frame que se utiliza para la imagne
     * @param {String} atlas - atlas que en el que se encuentra el frame (opcional)
     *                          En caso de no especificar el atlas, es que el sprite esta solo
     * @returns {Image} - imagen creada
     */
    createImgOnTheRight(item, offsetX, scale, sprite, atlas) {
        // Posiciones
        let x = item.x + offsetX;
        let y = item.y + item.displayHeight / 2;
        let img = null;
        if (atlas) {
            img = this.add.image(x, y, atlas, sprite);
        }
        else {
            img = this.add.image(x, y, sprite);
        }
        img.setScale(scale);

        this.creditsCont.add(img);

        return img;
    }

    /**
     * Crear una medalla a la derecha de un objeto
     */
    createMedalOnTheRight(item, offsetX, frame) {
        let medal = this.createImgOnTheRight(item, offsetX, 0.9, frame, 'medals');
        medal.setTint(Phaser.Display.Color.GetColor(0, 104, 93));
        return medal;
    }

    /**
     * Crear una UNICA fila de objetos distribuidos segun un numero determinado de columnas
     * (cada objeto en una columna) debajo del ultimo objeto de los creditos
     * @param {Number} offsetY - distancia que se deja respecto al ultimo item de los creditos 
     * @param {Array} objects - numero de objetos (determina tb el numero de columnas)
     * @param {Number} colsPadding - separacion entre las columnas
     */
    placeColsObjsBelow(offsetY, objects, colsPadding) {
        // Se calcula el numero de columnas
        let nColumns = objects.length;
        // Nota: Math.floor -> se redondea un numero al menor
        let halfColumns = Math.floor(nColumns / 2);

        // Se calcula en que posicion se va a encontrar el objeto que se encuentra mas a la izquierda
        let x = 0;
        // Si es par, hay un elemento en el medio
        if (nColumns % 2 == 0) {
            x = -(colsPadding / 2 + colsPadding * (halfColumns - 1));
        }
        // Si no es par, no hay un elemento en el medio
        else {
            x = -colsPadding * halfColumns;
        }

        // Poscion y
        let y = offsetY;
        if (this.lastItem) {
            y = y + this.lastItem.y + this.lastItem.displayHeight;
        }

        // Se coloca cada objeto
        objects.forEach((object) => {
            object.x = x;
            object.y = y;
            // se pasa a la siguiente columna
            x = x + colsPadding;
            object.setOrigin(0.5, 0);
            this.creditsCont.add(object);
        });

        this.lastItem = objects[objects.length - 1];
    }

    /**
     * Crear imagenes divididas en columnas
     */
    createColsImgsBelow(offsetY, imgs, height, colsPadding) {
        let imgsObjs = [];
        // Se crea el array de imagenes
        imgs.forEach((img) => {
            let imgObj = null;
            if (img.hasOwnProperty('atlas')) {
                imgObj = this.add.image(0, 0, img.atlas, img.frame);
            }
            else {
                imgObj = this.add.image(0, 0, img);
            }
            let scale = height / imgObj.displayHeight;
            imgObj.setScale(scale);
            imgsObjs.push(imgObj);
        });
        // Se colocan en columnas
        this.placeColsObjsBelow(offsetY, imgsObjs, colsPadding);
        return imgsObjs;
    }

    /**
     * Crear textos dividos en columnas
     */
    createColsTextsBelow(offsetY, texts, fontParams, colsPadding) {
        let style = { ...this.style };
        style.fontSize = fontParams.size + 'px';
        style.fontFamily = fontParams.font;

        // Se crea el array de textos
        let textsObjs = [];
        texts.forEach((text) => {
            let textObj = this.add.text(0, 0, text, style);
            textsObjs.push(textObj);
        });
        // Se colocan en columnas
        this.placeColsObjsBelow(offsetY, textsObjs, colsPadding);
        return textsObjs;
    }

    /**
     * Colocar un objeto debajo del utlimo objeto de los creditos
     * @param {Number} offsetY - distancia que se deja respecto al ultimo item de los creditos 
     * @param {Object} object - objeto que se coloca
     */
    placeObjectBelow(offsetY, object) {
        let y = offsetY;
        // Se calcula su posicion en funcion de la posicion y tamano del ultimo objeto de los creditos
        if (this.lastItem) {
            y = y + this.lastItem.y + this.lastItem.displayHeight;
        }
        object.y = y;
        object.setOrigin(0.5, 0);
        this.creditsCont.add(object);
        this.lastItem = object;
    }

    /**
     * Crear texto localizado
     */
    createTranslatedTextBelow(offsetY, id, fontParams) {
        let text = this.i18next.t(id, { ns: this.ns });
        return this.createTextBelow(offsetY, text, fontParams);
    }

    /**
     * Crear texto debajo del ultimo objeto de los creditos
     */
    createTextBelow(offsetY, text, fontParams) {
        let style = { ...this.style };
        style.fontSize = fontParams.size + 'px';
        style.fontFamily = fontParams.font;

        let textObj = this.add.text(0, 0, text, style);
        this.placeObjectBelow(offsetY, textObj);
        return textObj;
    }

    /**
     * Crear una imagen debajo del ultimo objeto de los creditos
     */
    createImgBelow(offsetY, scale, sprite, atlas) {
        let img = null;
        if (atlas) {
            img = this.add.image(0, 0, atlas, sprite);
        }
        else {
            img = this.add.image(0, 0, sprite);
        }
        img.setScale(scale);
        this.placeObjectBelow(offsetY, img);
        return img;
    }

    /**
     * Crear una flecha que sirve para indicar que se estan desplazando los creditos
     * durante el movimiento manual
     */
    createRewind(x, y, right) {
        let rewind = this.add.image(x, y, 'rewind');
        rewind.setTint(Phaser.Display.Color.GetColor(0, 104, 93));
        rewind.setScale(0.95);
        rewind.setVisible(false);
        rewind.flipX = right;

        return rewind;
    }
}

class DialogNode {
    /**
    * Clase base para la informacion de los nodos de dialogo. Inicialmente esta todo vacio
    */
    constructor() {
        this.type = null;               // dialog, choice, condition, event, chatMessage, socialNetMessage

        this.id = null;                 // id de este nodo dentro del objeto en el que se encuentra
        this.next = [];                 // posibles nodos siguientes
        this.fullId = null;             // id completa del nodo en el archivo en general
    }
}

class TextNode extends DialogNode {
    /**
    * Clase para la informacion de los nodos de texto
    * @extends DialogNode
    * 
    * Ejemplo:
        {
            "type": "text",
            "character": "mom",
            "next": "setNotTalked"
            "centered": "true"
        }
    */
    constructor() {
        super();

        this.type = "text";
        this.dialogs = [];              // serie de dialogos que se van a mostrar
        this.currDialog = null;         // indice del dialogo que se esta mostrando
        this.character = null;          // id del personaje que habla
        this.name = null;               // nombre del personaje que habla (si se trata del player, es el nombre elegido en la pantalla de login)
        this.centered = false;          // indica si el texto esta centrado o no (en caso de que no se especifique aparece alineado arriba a la izquierda)
    }
}


class ChoiceNode extends DialogNode {
    /**
    * Clase para la informacion de los nodos de opcion multiple
    * @extends DialogNode
    * 
    * Ejemplo:
        {
            "type": "choice",
            "choices":[
                { "next": "choice1" },
                { "next": "choice1" }
            ]
        }
    */
    constructor() {
        super();

        this.type = "choice";
        this.choices = [];              // Opciones (texto y si es un mensaje, de que chat y si que hay que responder)
        this.selectedOption = null;     // indice de la opcion seleccionada
    }
}

class ConditionNode extends DialogNode {
    /**
    * Clase para la informacion de los nodos de de condicion
    * @extends DialogNode
    * 
    * Ejemplo:
        {
            "type": "condition", 
            "conditions": [
                {
                    "next": "notTalked",
                    "talked": {
                        "value": false,
                        "operator": "equal",
                        "global": false,
                        "default": true,
                    },
                    "sponsored": {
                        "value": false,
                        "operator": "equal",
                        "type": "boolean"
                        "default": false,
                    }
                },
                {
                    "next": "talked",
                    "talked": {
                        "value": true,
                        "operator": "equal",
                    }
                }
            ]
        }
    */
    constructor() {
        super();

        this.type = "condition";
        this.conditions = [];           // condiciones con su nombre/identificador y sus atributos
    }
}

class EventNode extends DialogNode {
    /**
    * Clase para la informacion de los nodos de evento
    * @extends DialogNode
    * Ejemplo:
        {
            "type": "event",
            "events": [
                { 
                    "talked": { 
                        "variable": "talked", 
                        "global": false,
                        "value": true, 
                        "delay": 20 
                    } 
                }
            ]
        }
    */
    constructor() {
        super();
        this.type = "event";
        this.events = [];               // eventos que se llamaran al procesar el nodo (nombre del evento y el retardo con el que se llama)
    }
}

class ChatNode extends DialogNode {
    /**
    * Clase para la informacion de los nodos de los mensajes de los chats del movil
    * @extends DialogNode
    * Ejemplo:
        {
            "type": "chatMessage",
            "character": "player",
            "chat": "chat1",
            "replyDelay": 1000
        }
    */
    constructor() {
        super();

        this.type = "chatMessage";
        this.text = null;               // texto del mensaje
        this.character = null;          // id del personaje que envia el mensaje
        this.name = null;               // nombre del personaje que envia el mensaje (si se trata del jugador, es el nombre elegido en la pantalla de login)
        this.chat = null;               // chat al que corresponde el mensaje
        this.replyDelay = 0;            // retardo con el que se enviara el mensaje
    }
}

class SocialNetNode extends DialogNode {
    /**
     * Clase para la informacion de los nodos de los mensajes de las publicaciones
     * de la red social
     * @extends DialogNode
    * Ejemplo:
        {
            "type": "socialNetMessaage",
            "character": "player",
            "owner": "mom",
            "post": 0,
            "replyDelay": 1000
        }
     */
    constructor() {
        super();

        this.type = "socialNetMessage";
        this.text = null;               // texto del mensaje
        this.character = null;          // id del personaje que escribe en la publicacion
        this.name = null;               // nombre del personaje que escribe en la publicacion (si se trata del jugador, es el pronombre personal Tu)
        this.owner = null;               // usuario que ha hecho la publicacion (corresponde con los ids de los personajes)
        this.postName = null;           // nombre de la publicacion
        this.replyDelay = 0;            // retardo con el que se enviara el mensaje
    }
}

class BaseScene extends Phaser.Scene {
    /**
     * Escena base para las escenas del juego. Guarda parametros como las dimensiones 
     * del canvas o los managers y posiciones de los retratos de los personajes 
     * @extends Phaser.Scene
     * @param {String} name - id de la escena
     * @param {String} atlasName - nombre del atlas que se utiliza en esta escena
     */
    constructor(name, atlasName) {
        super({ key: name });

        this.atlasName = atlasName;
    }

    create(params) {
        this.CANVAS_WIDTH = this.sys.game.canvas.width;
        this.CANVAS_HEIGHT = this.sys.game.canvas.height;

        // Obtiene el dialogManager (tendria que haberse iniciado antes que la escena)
        this.gameManager = GameManager.getInstance();

        this.UIManager = this.gameManager.UIManager;
        this.dialogManager = this.gameManager.UIManager.dialogManager;
        this.phoneManager = this.gameManager.UIManager.phoneManager;
        this.dispatcher = this.gameManager.dispatcher;
        this.socialNetwork = this.gameManager.computerScene.socialNetScreen;

        // Obtiene el plugin de i18n del GameManager
        this.i18next = this.gameManager.i18next;

        // Crea el mapa para los retratos de los personajes
        this.portraits = new Map();
        this.portraitX = 110;
        this.portraitY = 980;
        this.portraitScale = 0.1;

        // Transform del retrato con posicion y escala 
        this.portraitTr = {
            x: this.portraitX,
            y: this.portraitY,
            scale: this.portraitScale
        };

        // Blackboard de variables dela escena actual
        this.blackboard = new Map();

        // Parametros del fondo y la camara para el scroll
        this.scale = 1;
        this.leftBound = 0;
        this.rightBound = this.CANVAS_WIDTH;
        this.START_SCROLLING = 30;
        this.CAMERA_SPEED = 0.7;

        // Se anaden funciones adicionales a las que se llamara al crear y reactivar
        this.events.on('create', () => {
            this.onCreate(params);
        }, this);
        this.events.on('wake', (scene, params) => {
            this.onWake(params);
        }, this);


        this.phoneManager.topLid.visible = false;
        this.phoneManager.botLid.visible = false;
    }


    /**
     * Metodo que se llama al terminar de crear la escena. Se encarga de llamar initialSetup
     * @param {Object} params - objeto con los parametros que pasarle a initialSetup 
     */
    onCreate(params) {
        this.initialSetup(params);
    }

    /**
     * Metodo que se llama al despertar la escena. Se encarga de llamar initialSetup
     * @param {Object} params - objeto con los parametros que pasarle a initialSetup 
     */
    onWake(params) {
        this.initialSetup(params);
    }

    // Metodo que se encarga de limpiar los eventos del dispatcher y de eliminar los retratos del UIManager
    // IMPORTANTE: Hay que llamar a este metodo antes de llamar al stop de la escena para evitar problemas al eliminar los retratos
    shutdown() {
        this.UIManager.dialogManager.clearScene();

        if (this.dispatcher) {
            this.dispatcher.removeAll();
        }
    }

    /**
     * Se encarga de configurar la escena con los parametros iniciales y
     * de anadir los retratos de la escena actual en el dialogManager
     * @param {Object} params - parametros que se le pasan a la configuracion inicial 
     */
    initialSetup(params) {
        this.dialogManager.changeScene(this);

        // Por defecto se pone la camara en el centro y si hay parametros que indiquen
        // donde colocar la camara, se coloca a la izquierda o a la derecha
        this.cameras.main.scrollX = this.rightBound / 2 - this.CANVAS_WIDTH / 2;
        if (params) {
            if (params.camPos === "left") {
                this.cameras.main.scrollX = this.leftBound;
            }
            else if (params.camPos === "right") {
                this.cameras.main.scrollX = this.rightBound - this.CANVAS_WIDTH;
            }
        }
    }


    update(t, dt) {
        super.update(t, dt);
        
        // Si se esta usando un dispositivo con input de teclado y raton (no es tactil) o
        // si el input es tactil *Y* se esta pulsando la pantalla, se mueve la camara:
        // Si el puntero esta a la izquierda y el scroll de la camara no es inferior al del
        // extremo izquierdo, la mueve hacia la izquierda y lo mismo para el extremo derecho
        if (!IS_TOUCH || (IS_TOUCH && this.input.activePointer.isDown)) {
            // Si se esta usando un dispositivo con input tactil, se ajusta el limite para empezar a mover la camara
            let threshold = this.START_SCROLLING;
            if (IS_TOUCH) {
                threshold *= 1.5;
            }

            if (this.game.input.activePointer.x < threshold && this.cameras.main.scrollX > this.leftBound + this.CAMERA_SPEED * dt) {
                this.cameras.main.scrollX -= this.CAMERA_SPEED * dt;
            }
            else if (this.game.input.activePointer.x > this.CANVAS_WIDTH - threshold
                && this.cameras.main.scrollX < this.rightBound - this.CANVAS_WIDTH - this.CAMERA_SPEED * dt) {
                this.cameras.main.scrollX += this.CAMERA_SPEED * dt;
            }
        }
    }


    // Llama al metodo para leer todos los nodos y luego se encarga de conectarlos
    readNodes(file, namespace, objectName, getObjs) {
        let nodesMap = new Map();
        let root = this.readAllNodes("root", file, namespace, objectName, getObjs, nodesMap);

        // Recorre todos los nodos guardados en el mapa
        nodesMap.forEach((node) => {
            // Recorre el array de nodos siguientes leyendo sus ids
            for (let i = 0; i < node.next.length; i++) {
                // Obtiene el nodo del mapa a partir de su id y la reemplaza en el array
                let nextNode = nodesMap.get(node.next[i]);
                node.next[i] = nextNode;
            }
        });

        return root;
    }


    /**
    * Va leyendo los nodos del json de manera recursiva (el archivo se lee una sola vez y se pasa el objeto obtenido como parametro)
    *
    * @param {String} id - id del nodo que se lee. El nodo inicial es root
    * @param {Object} file - objeto obtenido como resultado de leer el json
    * @param {String} namespace - nombre del archivo de localizacion del que se va a leer
    * @param {String} objectName - nombre del objeto en el que esta el dialogo, si es que el json contiene varios dialogos de distintos objetos
    * @param {Boolean} getObjs - si se quiere devolver el nodo leido como un objeto 
    * @returns {DialogNode} - el nodo de dialogo que se ha procesado
    * 
    * 
    * IMPORTANTE: Este metodo tiene que llamarse una vez se han creado los retratos de los personajes,
    * ya que al momento de separar los textos que sean demasiado largos, es necesario saber si el personaje
    * es un personaje que va a tener retrato o no para usar el ancho de linea correcto
    * 
    * IMPORTANTE 2: La estructura de nodos es comun a todos los idiomas y se tiene que guardar con anterioridad
    * al momento de crear la escena para luego pasarlo como parametro file. El archivo del que se van a leer las
    * traducciones es el que se pasa en el parametro namespace, y tiene que pasarse un string con el nombre del
    * archivo sin la extension .json
    * 
    * IMPORTANTE 3: En un nodo con condiciones, cada condicion lleva a otro nodo distinto.
    * Al momento de llegar a un nodo condicion, el siguiente nodo sera el indicado como siguiente
    * en la primera condicion que se cumpla (se van comprobando en el orden en el que se han leido).
    * Cada condicion puede tener varios requisitos (variables), en cuyo caso, la condicion solo 
    * se cumplira si todos sus requisitos se cumplen (operador &&. De momento no hay soporte para el operador || ) 
    * 
    */
    readAllNodes(id, file, namespace, objectName, getObjs, nodesMap) {
        let playerName = this.gameManager.getUserInfo().name;
        let context = this.gameManager.getUserInfo().gender;
        let fileObj = file;
        let translationId = id;

        // Si el dialogo esta dentro de algun objeto, se ajusta tanto el objeto
        // del json en el que buscar los nodos, como la id que utilizar para encontrar
        // la traduccion del nodo. Esto es porque la id del nodo debe coincidir tanto
        // en el json como en el archivo de traducciones, pero al estar dentro de un objeto
        // con (por ejemplo) nombre object, un nodo con la id name deberia buscarse en el 
        // archivo de traducciones como object.name, pero la id de nodo seguiria siendo name
        if (objectName !== "") {
            fileObj = this.getObjFromName(file, objectName);
            translationId = objectName + "." + id;
        }

        // Si el nodo ya se habia leido, lo devuelve
        if (nodesMap.has(translationId)) {
            return nodesMap.get(translationId);
        }
        // Si no, si la id del nodo no existe, devuelve null
        else if (!fileObj[id]) {
            return null;
        };

        // Crea el nodo y guarda sus atributos (se estableceran en el nodo al final)
        let node = new DialogNode();
        let nodeId = id;
        let type = fileObj[id].type;

        // Guarda el nodo y sus atributos base en caso de que se intente acceder a el antes
        // de que se termine de crear completamente (por si varios nodos llevan a el)
        nodesMap.set(translationId, node);
        node.id = nodeId;
        node.fullId = translationId;

        // Si el nodo es de tipo condicion
        if (type === "condition") {
            node = new ConditionNode();

            // Se leen todas las condiciones. Cada condicion lleva a un nodo distinto y 
            // en una condicion se pueden comprobar multiples variables
            for (let i = 0; i < fileObj[id].conditions.length; i++) {
                // Obtiene el nombre de las variables a comprobar (suprimiendo la propiedad next)
                let obj = Object.keys(fileObj[id].conditions[i]);
                let vars = obj.filter(key => key !== "next");

                let nodeConditions = [];

                // Recorre todas las variables obtenidas
                for (let j = 0; j < vars.length; j++) {
                    // Lee el nombre de la variable
                    let varName = vars[j];

                    // Obtiene el objeto que guarda las propiedades que tiene que cumplir la variable
                    let obj = fileObj[id].conditions[i][varName];

                    // Crea un objeto igual que obj, pero que tambien guarda su nombre
                    let condition = obj;
                    condition.key = varName;

                    // Guarda el valor por defecto del objeto. Si no tiene 
                    // la propiedad en el json, se pone a false por defecto
                    let defaultValue = false;
                    if (obj.default) {
                        defaultValue = obj.default;
                    }

                    // Si no se ha definido si la variable es global o si se ha definido que si lo es,
                    // la guarda en el gameManager con su valor por defecto (si no se ha guardado antes)
                    if (obj.global === undefined || obj.global === true) {
                        if (!this.gameManager.hasValue(varName)) {
                            this.gameManager.setValue(varName, defaultValue);
                        }
                    }
                    // Si no, la guarda en la blackboard de la escena con su valor por defecto
                    // (si no se ha guardado antes) e indica que la blackboard en la que comprobar
                    // la variable es la de esta escena
                    else {
                        if (!this.gameManager.hasValue(varName, this.blackboard)) {
                            this.gameManager.setValue(varName, defaultValue, this.blackboard);
                        }
                        condition.blackboard = this.blackboard;
                    }

                    // Lo mete en las variables del nodo
                    nodeConditions.push(condition);
                }

                // Se guardan las condiciones 
                node.conditions.push(nodeConditions);

                // Si hay un nodo despues de este, se crea de manera y se
                // guarda la id de dicho nodo en el array de nodos siguientes
                if (fileObj[id].conditions[i].next) {
                    let nextNode = this.readAllNodes(fileObj[id].conditions[i].next, file, namespace, objectName, getObjs, nodesMap);
                    node.next.push(nextNode.fullId);
                }
            }
        }
        // Si el nodo es de tipo texto
        else if (type === "text") {
            node = new TextNode();
            // Obtiene la id del personaje y coge su nombre del archivo de nombres localizados
            let character = fileObj[id].character;
            node.character = character;
            node.name = this.i18next.t(fileObj[id].character, { ns: "names", returnObjects: getObjs });

            // Obtiene si el texto esta centrado o no
            if (fileObj[id].centered) {
                node.centered = fileObj[id].centered;
            }

            // Obtiene los fragmentos del dialogo
            let texts = [];
            let textTranslation = this.i18next.t(translationId, { ns: namespace, name: playerName, context: context, returnObjects: getObjs });

            // Si el texto no esta dividido en fragmentos, se guarda directamente en el array de textos
            if (!Array.isArray(textTranslation)) {
                texts.push(textTranslation.text);
            }
            // Si no, se guarda cada fragmento del dialogo en el array
            else {
                for (let i = 0; i < textTranslation.length; i++) {
                    texts.push(textTranslation[i].text);
                }
            }

            // Se recorren todos los fragmentos de texto
            for (let i = 0; i < texts.length; i++) {
                // Se crea un dialogo con todo el texto a mostrar
                let split = {
                    text: texts[i],
                    name: node.name,
                };
                // Se separa el fragmento en caso de que el texto sea demasiado largo
                let dialogs = this.splitDialogs([split], character, node.centered);

                // Se concatenan los fragmentos obtenidos con los que ya habia en el nodo
                // (se tienen que concatenar, ya que splitDialogs devuelve un array, por
                // lo que hacer push a node.dialogs meteria los fragmentos en varios arrays)
                node.dialogs = node.dialogs.concat(dialogs);
            }
            node.currDialog = 0;

            // Si hay un nodo despues de este, se crea de manera y se
            // guarda la id de dicho nodo en el array de nodos siguientes
            if (fileObj[id].next) {
                let nextNode = this.readAllNodes(fileObj[id].next, file, namespace, objectName, getObjs, nodesMap);
                node.next.push(nextNode.fullId);
            }
        }
        // Si el nodo es de tipo opcion multiple
        else if (type === "choice") {
            node = new ChoiceNode();

            // Se obtienen las opciones del archivo de textos traducidos
            let texts = this.i18next.t(translationId, { ns: namespace, name: playerName, context: context, returnObjects: getObjs });
            for (let i = 0; i < fileObj[id].choices.length; i++) {
                let repeat = false;
                if (fileObj[id].choices[i].repeat === undefined || fileObj[id].choices[i].repeat) {
                    repeat = true;
                }
                let choice = {
                    fullId: fileObj[id].choices[i].next || "donothing", // Si la opcion no lleva a ningun nodo, se le asigna un nodo de id "donothing" (que se tendria que crear con anterioridad y no hacer nada) para evitar problemas al intentar acceder a un nodo con id undefined
                    text: texts[i].text,
                    repeat: repeat
                };

                // Se guarda la eleccion y se crea de manera recursiva
                // el nodo siguiente que corresponde a elegir dicha opcion
                node.choices.push(choice);

                // Si hay un nodo despues de este, se crea de manera y se
                // guarda la id de dicho nodo en el array de nodos siguientes
                if (fileObj[id].choices[i].next) {
                    let nextNode = this.readAllNodes(fileObj[id].choices[i].next, file, namespace, objectName, getObjs, nodesMap);
                    node.next.push(nextNode.fullId);
                }
                else {
                    node.next.push({});
                }
            }
        }
        // Si el nodo es de tipo evento
        else if (type === "event") {
            node = new EventNode();

            // Recorre todas las variables obtenidas
            for (let i = 0; i < fileObj[id].events.length; i++) {
                // Lee el nombre del evento
                let evtName = Object.keys(fileObj[id].events[i]);

                // Obtiene el objeto que guarda los parametros del evento 
                let obj = fileObj[id].events[i][evtName];

                // Crea un objeto igual que obj, pero que tambien guarda su nombre
                let evt = { ...obj };
                evt.name = evtName[0];

                // Si se ha definido si la variable es global y si se ha definido que no lo 
                // es, se guarda en las propiedades del evento la blackboard de esta escena
                if (obj.global !== undefined && obj.global === false) {
                    evt.blackboard = this.blackboard;
                }

                // Lo mete en las variables del nodo. Si es un evento de cambiar amistad, lo pone al principio de 
                // los eventos (por si acaso se lanzan a la vez otros eventos que cambien la escena, ya que hacen 
                // que los eventos de cambiar amistad no se lancen si van despues de un cambio de escena)
                if (evt.name === "changeFriendship") {
                    node.events.unshift(evt);
                }
                else {
                    node.events.push(evt);
                }
            }

            // Si hay un nodo despues de este, se crea de manera y se
            // guarda la id de dicho nodo en el array de nodos siguientes
            if (fileObj[id].next) {
                let nextNode = this.readAllNodes(fileObj[id].next, file, namespace, objectName, getObjs, nodesMap);
                node.next.push(nextNode.fullId);
            }
        }
        // Si el nodo es de tipo mensaje de texto
        else if (type === "chatMessage") {
            node = new ChatNode();

            // Obtiene el texto del archivo de textos traducidos y lo guarda
            let text = this.i18next.t(translationId + ".text", { ns: namespace, name: playerName, context: context, returnObjects: getObjs });
            node.text = text;

            // Obtiene el nombre del personaje del archivo de nombres localizados
            // En el caso de que se trate del jugador, obtiene su nombre
            let character = fileObj[id].character;
            if (character === "player") {
                node.name = this.gameManager.getUserInfo().name;
            }
            else {
                node.name = this.i18next.t(fileObj[id].character, { ns: "names" });
            }
            node.character = character;

            // Guarda el chat en el que tiene que ir la respuesta y el retardo con el que se envia
            node.chat = this.i18next.t("textMessages" + "." + fileObj[id].chat, { ns: "phoneInfo" });

            if (fileObj[id].replyDelay) {
                node.replyDelay = fileObj[id].replyDelay;
            }

            // Si hay un nodo despues de este, se crea de manera y se
            // guarda la id de dicho nodo en el array de nodos siguientes
            if (fileObj[id].next) {
                let nextNode = this.readAllNodes(fileObj[id].next, file, namespace, objectName, getObjs, nodesMap);
                node.next.push(nextNode.fullId);
            }
        }
        // Si el nodo es de tipo comentario de la red social
        else if (type === "socialNetMessage") {
            node = new SocialNetNode();

            // Obtiene el texto del archivo de textos traducidos y lo guarda
            let text = this.i18next.t(translationId + ".text", { ns: namespace, name: playerName, context: context, returnObjects: getObjs });
            node.text = text;

            node.character = fileObj[id].character;
            // Obtiene el nombre del personaje del archivo de nombres localizados
            // En el caso de se trate del propio del jugador, obtiene el pronombre personal Tu
            // traducido en el idioma correspondiente
            node.name = this.i18next.t(fileObj[id].character, { ns: "names" });

            // Guarda el usuario que ha subido el post
            node.owner = fileObj[id].owner;

            // Guarda el numero del post del usuario
            node.postName = fileObj[id].postName;

            if (fileObj[id].replyDelay) {
                node.replyDelay = fileObj[id].replyDelay;
            }

            // Si hay un nodo despues de este, se crea de manera y se
            // guarda la id de dicho nodo en el array de nodos siguientes
            if (fileObj[id].next) {
                let nextNode = this.readAllNodes(fileObj[id].next, file, namespace, objectName, getObjs, nodesMap);
                node.next.push(nextNode.fullId);
            }
        }


        // Actualiza el nodo, ya que al momento de guardarse no estaba creado completamente
        nodesMap.set(translationId, node);
        node.id = nodeId;
        node.fullId = translationId;

        return node;
    }


    /**
     * Obtiene el objeto json a partir de su nombre
     * @param {Object} obj - objeto json en el que se busca el objeto 
     * @param {String} prop - nombre de la propiedad (o del objeto) que se busca 
     * @returns {Object} - objeto json con el nombre indicado
     */
    getObjFromName(obj, prop) {
        let nestedProperties = prop.split('.');
        let currObj = obj;

        for (let i = 0; i < nestedProperties.length; i++) {
            if (!currObj) {
                return null;
            }
            else {
                currObj = currObj[nestedProperties[i]];
            }
        }
        return currObj;
    }


    /**
    * Prepara los dialogos por si alguno es demasiado largo y se sale de la caja de texto
    * @param {Array} dialogs - array de dialogos a preparar
    * @returns {Array} - array con los dialogos ajustados
    */
    splitDialogs(dialogs, character, centered) {
        let newDialogs = [];        // Nuevo array de dialogos tras dividir los dialogos demasiado largos
        let i = 0;                  // Indice del dialogo en el array de dialogos
        let dialogCopy = "";        // Copia del dialogo con todos sus atributos
        let currText = "";          // Texto a dividir

        // Mientras no se haya llegado al final de los dialogos
        while (i < dialogs.length) {
            // Se establece el retrato del personaje en la caja de texto para poder
            // hacer los saltos de linea con el ancho de linea correspondiente
            this.dialogManager.textbox.setPortrait(this.portraits.get(character));

            // Se establece si el texto esta centrado en la caja de texto para poder
            // hacer los saltos de liena con el ancho de linea correspondiente
            this.dialogManager.textbox.centerText(centered);

            // Cambia el texto a mostrar por el dialogo completo para obtener sus dimensiones 
            // (se copia la informacion del dialogo actual, pero se cambia el texto a mostrar)
            currText = dialogs[i].text;
            dialogCopy = { ...dialogs[i] };
            dialogCopy.text = currText;
            this.dialogManager.setText(dialogCopy, false);

            // Si la altura del texto supera la de la caja de texto 
            if (this.dialogManager.textTooBig()) {
                // Se separan todas las palabras del dialogo por espacios
                let words = currText.split(' ');
                let prevText = "";          // Texto antes de coger la siguiente palabra del dialogo
                let newText = "";           // Texto obtenido tras coger la siguiente palabra del dialogo
                let currWord = words[0];

                // Va recorriendo el array de palabras hasta que no quede ninguna
                while (words.length > 0) {
                    // Coge la primera palabra y actualiza tanto el
                    // texto anterior como el nuevo con dicha palabra
                    prevText = newText;
                    newText += " " + currWord;

                    // Cambia el texto por el nuevo para calcular sus dimensiones
                    dialogCopy = { ...dialogs[i] };
                    dialogCopy.text = newText;
                    this.dialogManager.setText(dialogCopy, false);

                    // Si no supera la altura de la caja de texto, saca la palabra del array
                    if (!this.dialogManager.textTooBig()) {
                        words.shift();
                        currWord = words[0];
                    }
                    // Si no, reinicia el texto y guarda el dialogo actual con el texto obtenido hasta el momento
                    else {
                        newText = "";
                        dialogCopy = { ...dialogs[i] };
                        dialogCopy.text = prevText;
                        newDialogs.push(dialogCopy);
                    }
                }
                // Una vez recorrido todo el dialogo, guarda el dialogo con el texto restante 
                prevText = newText;
                newText += " " + currWord;
                dialogCopy = { ...dialogs[i] };
                dialogCopy.text = prevText;
                newDialogs.push(dialogCopy);

                i++;
            }
            // Si la altura no supera la de la caja de texto, se guarda 
            // el dialogo actual y se pasa a mirar el siguiente
            else {
                dialogCopy = { ...dialogs[i] };
                dialogCopy.text = currText;
                newDialogs.push(dialogCopy);
                i++;
                if (dialogs[i]) currText = dialogs[i].text;
            }
        }

        let emptyDialog = {
            text: "",
            character: "",
            name: ""
        };

        this.dialogManager.setText(emptyDialog, false);
        return newDialogs;
    }


    /**
     * Cambia la imagen de la puerta cerrada por la puerta abierta o viceversa
     * al interactuar con ella (al hacer click o al pasar/sacar el raton por encima)
     * @param {Phaser.Image} closed - imagen de la puerta cerrada
     * @param {Phaser.Image} opened - imagen de la puerta abierta 
     * @param {Function} onClick - funcion a la que se llamara al hacer click sobre la puerta abierta
     * @param {Boolean} click - true si la imagen se cambia al hacer click, false si lo hace al pasar/sacar el raton por encima
     */
    toggleDoor(closed, opened, onClickClose = {}, click = true, onClickOpen = {}) {
        closed.setInteractive({ useHandCursor: true });
        opened.setInteractive({ useHandCursor: true });

        // Oculta la imagen de la puerta abierta
        opened.visible = false;

        // Establece el tipo de evento de puntero segun si
        // hay que hacer click o pasar el raton por encima
        let openEvt = 'pointerdown';
        let closeEvt = 'pointerdown';
        if (!click) {
            openEvt = 'pointerover';
            closeEvt = 'pointerout';
        }

        // Al producir el evento de puntero en la puerta cerrada, se oculta la 
        // imagen de la puerta cerrada y se muestra la imagen de la puerta abierta.
        closed.on(openEvt, () => {
            closed.visible = false;
            opened.visible = true;
        });
        // Al producir el evento de puntero en la puerta abierta, se oculta la
        // imagen de la puerta abierta y se muestra la imagen de la puerta cerrada.
        opened.on(closeEvt, () => {
            opened.visible = false;
            closed.visible = true;
        });
        
        // Al pulsar la puerta abierta, se produce el evento indicado
        opened.on('pointerdown', () => {
            if (onClickClose !== null && typeof onClickClose === 'function') {
                onClickClose();
            }
        });



        // Al pulsar la puerta cerrada, si se esta usando input tactil, se abre la puerta por un 
        // momento, se produce el evento indicado despues de que se abra la puerta, y luego se cierra
        closed.on('pointerdown', () => {
            if (IS_TOUCH) {
                opened.visible = true;
                closed.visible = false;
                setTimeout(() => {
                    if (onClickClose !== null && typeof onClickClose === 'function') {
                        onClickClose();
                    }
                    if (!click) {
                        opened.visible = false;
                        closed.visible = true;
                    }
                }, 100);
            }
            if (onClickOpen !== null && typeof onClickOpen === 'function') {
                onClickOpen();
            }
        });
    }

}

class TextOnlyScene extends BaseScene {
    /**
     * Escena para las transiciones en las que solo hay texto,  
     * @extends Phaser.Scene
     */
    constructor() {
        super('TextOnlyScene');
    }

    onCreate(params) {
        super.onCreate(params);

        let DEFAULT_TIME = 5000;
        setTimeout(() => {
            if (!this.exiting) {
                this.exiting = true;
                this.cameras.main.fadeOut(this.FADE_TIME, 0, 0, 0);
            }
        }, DEFAULT_TIME);
    }

    /**
     * Crear los elementos de la escena
     * 
     * @param {Object} params - parametros de la escena. Debe contener text, onComplete y onCompleteDelay.
     * Como opcional, puede contener textConfig con la configuracion para el texto a mostrar
     * 
     * IMPORTANTE: Esta escena es general para todas las transiciones, por lo que hay que especificar
     * en los parametros tanto el texto que debera aparecer en la escena, como la funcion que se debe 
     * ejecutar una vez acabe la escena. Generalmente, en la funcion onComplete se llamaria al changeScene 
     * del gameManager con la siguiente escena, pero no se hace directamente porque dependiendo de la 
     * escena a la que se quiera cambiar, podria hacer falta pasarle unos parametros distintos   
     */
    create(params) {
        super.create(params);

        let PADDING = 50;

        let text = "";
        let onComplete = () => { };
        let onCompleteDelay = 0;

        // Configuracion de texto
        let fontSize = 100;
        let textConfig = { ...this.gameManager.textConfig };
        // textConfig.fontFamily = 'gidole-regular';
        textConfig.fontSize = fontSize + 'px';
        textConfig.align = 'center';
        textConfig.wordWrap = {
            width: this.CANVAS_WIDTH - PADDING * 2,
            useAdvancedWrap: true
        };

        if (params.text) {
            text = params.text;
        }
        if (params.onComplete) {
            onComplete = params.onComplete;
        }
        if (params.onCompleteDelay) {
            onCompleteDelay = params.onCompleteDelay;
        }
        if (params.textConfig) {
            // Parsea el string del tamano de fuente. El 10 indica que se parsea en base 10
            fontSize = parseInt(params.fontSize, 10);
            textConfig = params.textConfig;
        }

        // Hace invisible el UIManager entero
        this.scene.setVisible(false, this.UIManager);

        // Establece las animaciones de fade in y fade out
        this.FADE_TIME = 300;
        this.cameras.main.fadeIn(this.FADE_TIME, 0, 0, 0);
        // Una vez terminado el fade out, se vuelve a hacer visible el UIManager 
        // y se llama a la funcion que se haya pasado por los parametros
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, (cam, effect) => {
            setTimeout(() => {
                this.scene.setVisible(true, this.UIManager);
                onComplete();
            }, onCompleteDelay);
        });

        // Anade la imagen del fondo 
        let bg = this.add.rectangle(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT, 0x000, 1).setOrigin(0, 0);

        // Se puede hacer click en la imagen de fondo una vez termine el fade in
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, (cam, effect) => {
            bg.setInteractive();
        });

        this.exiting = false;
        // Se anade el evento de hacer clicke sobre el fondo para que solo se pueda ejecutar una vez.
        // Si no se hace click sobre el fondo, se pone un temporizador para que haga fade out 
        // automaticamente tras un tiempo. El temporizador empezara cuando la escena este creada
        bg.once('pointerdown', (pointer) => {
            // Al hacer click en la imagen del fondo, comienza el fade out
            if (!this.exiting) {
                this.exiting = true;
                this.cameras.main.fadeOut(this.FADE_TIME, 0, 0, 0);
            }
        });


        // Crea el texto
        let screenText = this.add.text(this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2, text, textConfig).setOrigin(0.5, 0.5);

        // En caso de que el texto sea demasiado largo y se salga de la 
        // pantalla, se va reduciendo el tamano de la fuente hasta que quepa
        // IMPORTANTE: SE REALIZA DE ESTA MANERA EN VEZ DE ESCALANDO EL
        // TEXTO PORQUE SI EL TEXTO ES DEMASIADO GRANDE, HABRA DEMASIADOS SALTOS
        // DE LINEA. SIN EMBARGO, ESTE PROCESO TOMARA MUCHO TIEMPO CUANTO MAS GRANDE
        // SEA EL TAMANO DE LA FUENTE, YA QUE VA REDUCIENDOLO POCO A POCO Y CREANDO
        // Y DESTRUYENDO EL TEXTO HASTA ENCONTRAR UN TAMANO CON EL QUE QUEPA.
        while (screenText.displayHeight > this.CANVAS_HEIGHT - PADDING * 2) {
            fontSize -= 5;
            textConfig.fontSize = fontSize + 'px';
            screenText.destroy();
            screenText = this.add.text(this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2, text, textConfig).setOrigin(0.5, 0.5);
        }

    }

}

class AlarmScene extends BaseScene {
    /**
     * Escena para las transiciones en las que solo hay texto,  
     * @extends Phaser.Scene
     * @param {Object} params - parametros de la escena. Debe contener day y nextScene
     * 
     * IMPORTANTE: Esta escena es general para todos los dias, pero a diferencia de la escena de 
     * solo texto, esta escena solo deberia cambiar a la habitacion de por la manana cada dia, por 
     * lo que no hace falta pasar parametros adicionales y se puede cambiar de escena directamente 
     * llamando al changeScene del gameManager en lugar de tener que pasar un callback
     */
    constructor() {
        super('AlarmScene');
    }

    // Metodo que se llama al terminar de crear la escena. 
    onCreate(params) {
        super.onCreate(params);

        this.phoneManager.openEyesAnimation();
        this.phoneManager.phone.toAlarmScreen();
    }

    create(params) {
        super.create();

        // Reinicia la variable de llegar tarde y de haber cogido la mochila
        this.gameManager.setValue("isLate", false);
        this.gameManager.setValue("bagPicked", false);

        
        this.phoneManager.topLid.visible = true;
        this.phoneManager.botLid.visible = true;
        this.phoneManager.icon.visible = false;
        
        // Actualiza el dia en el gameManager y cambia el dia y la hora del telefono
        this.gameManager.day++;
        this.phoneManager.setDayInfo("alarmHour");

        // Pone la imagen de fondo con las dimensiones del canvas
        let bg = this.add.image(0, 0, 'bedroomCeiling').setOrigin(0.5, 0);
        let scale = this.CANVAS_HEIGHT / bg.height;
        bg.setScale(scale);

        // Centra la imagen de fondo
        bg.x += this.CANVAS_WIDTH / 2;
        this.leftBound = bg.x - bg.displayWidth / 2;
        this.rightBound = bg.x + bg.displayWidth / 2;


        // Anade los eventos a los que reaccionara: 
        //  - resetCam reinicia la posicion de la camara de esta escena y de la del UIManager 
        //  - wakeUpEvent se llama al apagar la alarma y se encarga de pasar a la siguiente escena
        this.dispatcher.add(this.phoneManager.resetCamEvent, this, (obj) => {
            this.cameras.main.scrollX = 0;
            this.UIManager.cameras.main.scrollX = 0;
        });
        this.dispatcher.add(this.phoneManager.wakeUpEvent, this, (obj) => {
            let params = {
                camPos: "right"
            };
            this.gameManager.changeScene('BedroomMorningDay' + this.gameManager.day, params);
        });

    }

    update(t, dt) {
        if (!this.phoneManager.toggling && this.phoneManager.phone.visible) {
            super.update(t, dt);
            this.UIManager.cameras.main.scrollX = this.cameras.main.scrollX;
        }

    }
}

class BusScene extends BaseScene {
    /**
     * Escena para las transiciones entre la casa y la escuela 
     * @extends Phaser.Scene
     */
    constructor() {
        super('BusScene');
    }

    /**
     * Crear los elementos de la escena
     * 
     * @param {Object} params - parametros de la escena. Debe contener nextScene y duration como parametro opcional
     */
    create(params) {
        super.create(params);

        // Hace invisible el UIManager entero
        this.scene.setVisible(false, this.UIManager);

        let duration = 1500;
        let nextScene = "";
        
        if (params.duration) {
            duration = params.duration;
        }
        if (params.nextScene) {
            nextScene = params.nextScene;
        }

        this.add.rectangle(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT, 0x2B9E9E, 1).setOrigin(0, 0);        
        let bus = this.add.sprite(this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT /2, 'autobus').setOrigin(0.5, 0.5);
        bus.play('moving');
        
        // Inicia un temporizador y cuando acabe, pasara a la proxima escena
        setTimeout(() => {
            this.scene.setVisible(true, this.UIManager);
            // La proxima escena sera el salon o el patio, y ambas escenas comienzan 
            // desde la izquierda tanto al llegar a casa como al llegar al colegio
            let nextParams = {
                camPos: "left"
            };
            
            this.gameManager.changeScene(nextScene, nextParams);
        }, duration);

    }

}

class RestroomBase extends BaseScene {
    /**
     * Escena base para los banos. Coloca los elementos que se mantienen igual todos los dias
     * @extends BaseScene
     * @param {String} name - id de la escena
     */
    constructor(name) {
        if (!name) {
            name = "RestroomBase";
        }
        super(name, 'restroom');
    }

    create(params) {
        super.create(params);

        this.corridor = "";

        // Pone la imagen de fondo con las dimensiones del canvas
        let bg = this.add.image(0, 0, 'restroomBg').setOrigin(0, 0);
        this.scale = this.CANVAS_HEIGHT / bg.height;
        bg.setScale(this.scale);

        this.rightBound = bg.displayWidth;


        // Puerta al pasillo
        let doorPos = {
            x: 1003 * this.scale,
            y: 168 * this.scale
        };
        let doorClosed = this.add.image(doorPos.x, doorPos.y, this.atlasName, 'restroomDoorClosed').setOrigin(0, 0).setScale(this.scale);
        let doorOpened = this.add.image(doorPos.x, doorPos.y, this.atlasName, 'restroomDoorOpened').setOrigin(0, 0).setScale(this.scale);
        // Al hacer click, se pasara a la escena del pasillo sin eliminar esta escena
        super.toggleDoor(doorClosed, doorOpened, () => {
            this.gameManager.interacted("corridorDoor", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .send();
            let params = {
                camPos: "left"
            };
            this.gameManager.changeScene(this.corridor, params, true);    
        }, false);


        // Puerta del primer cubiculo
        let stall1DoorClosed = this.add.image(1911 * this.scale, 296 * this.scale, this.atlasName, 'restroomStall1Closed').setOrigin(0, 0).setScale(this.scale);
        let stall1DoorOpened = this.add.image(1742 * this.scale, 276 * this.scale, this.atlasName, 'restroomStall1Opened').setOrigin(0, 0).setScale(this.scale);
        super.toggleDoor(stall1DoorClosed, stall1DoorOpened, () => {
            this.gameManager.interacted("restroomStall1", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .withResultExtension("status", "closed")
                            .send();
        }, true, () => {
            this.gameManager.interacted("restroomStall1", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .withResultExtension("status", "opened")
                            .send();
        });

        // Puerta del segundo cubiculo
        this.stall2 = this.add.image(2155 * this.scale, -6 * this.scale, this.atlasName, 'stall2').setOrigin(0, 0).setScale(this.scale);
        let stall2DoorClosed = this.add.image(2197 * this.scale, 244 * this.scale, this.atlasName, 'restroomStall2Closed').setOrigin(0, 0).setScale(this.scale);
        let stall2DoorOpened = this.add.image(1844 * this.scale, 240 * this.scale, this.atlasName, 'restroomStall2Opened').setOrigin(0, 0).setScale(this.scale);
        super.toggleDoor(stall2DoorClosed, stall2DoorOpened, () => {
            this.gameManager.interacted("restroomStall2", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .withResultExtension("status", "closed")
                            .send();
        }, true, () => {
            this.gameManager.interacted("restroomStall2", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .withResultExtension("status", "opened")
                            .send();
        });

        // Tercer cubiculo (puerta cerrada siempre)
        this.stall3 = this.add.image(2395 * this.scale, -6 * this.scale, this.atlasName, 'stall3').setOrigin(0, 0).setScale(this.scale);

        // Se ajustan las profundidades de los cubiculos para poder poner cosas dentro de ellos
        stall1DoorClosed.setDepth(1);
        stall1DoorOpened.setDepth(1);
        this.stall2.setDepth(stall1DoorClosed.depth + 1).setInteractive();
        stall2DoorClosed.setDepth(this.stall2.depth + 1);
        stall2DoorOpened.setDepth(this.stall2.depth + 1);
        this.stall3.setDepth(stall2DoorOpened.depth + 1).setInteractive();


        // El unico sitio al que se puede volver es la escena de la que se 
        // viene, por lo que si esta guardada en los parametros, se establece
        if (params) {
            if (params.corridor) {
                this.corridor = params.corridor;
            }
        }
    }
}

class OppositeRestroom extends BaseScene {
    /**
     * Escena para el bano del genero opuesto al del jugador
     * @extends BaseScene
     * @param {String} name - id de la escena
     */
    constructor() {
        super('OppositeRestroom', 'restroom');
    }

    create(params) {
        super.create(params);

        this.corridor = "";

        // Pone la imagen de fondo con las dimensiones del canvas y dado la vuelta
        let bg = this.add.image(0, 0, 'restroomBg').setOrigin(0, 0);
        this.scale = this.CANVAS_HEIGHT / bg.height;
        bg.setScale(this.scale);
        bg.flipX = true;

        this.rightBound = bg.displayWidth;


        // Puerta al pasillo
        let doorPos = {
            x: 1353 * this.scale,
            y: 168 * this.scale
        };
        let doorClosed = this.add.image(doorPos.x, doorPos.y, this.atlasName, 'restroomDoorClosed').setOrigin(0, 0).setScale(this.scale);
        let doorOpened = this.add.image(doorPos.x, doorPos.y, this.atlasName, 'restroomDoorOpened').setOrigin(0, 0).setScale(this.scale);
        // Al hacer click, se pasara a la escena del pasillo sin eliminar esta escena
        super.toggleDoor(doorClosed, doorOpened, () => {
            this.gameManager.interacted("restroomDoor", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .send();
            let params = {
                camPos: "left"
            };
            this.gameManager.changeScene(this.corridor, params, true);
        }, false);


        // Puerta del segundo cubiculo
        let stall2DoorClosed = this.add.image(593 * this.scale, 244 * this.scale, this.atlasName, 'restroomStall2Closed').setOrigin(0.5, 0).setScale(this.scale);
        let stall2DoorOpened = this.add.image(861 * this.scale, 240 * this.scale, this.atlasName, 'restroomStall2Opened').setOrigin(0.5, 0).setScale(this.scale);
        super.toggleDoor(stall2DoorClosed, stall2DoorOpened, () => {
            this.gameManager.interacted("restroomStall2", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .withResultExtension("status", "closed")
                            .send();
        }, true, () => {
            this.gameManager.interacted("restroomStall2", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .withResultExtension("status", "opened")
                            .send();
        });
        stall2DoorClosed.flipX = true;
        stall2DoorOpened.flipX = true;


        // Telefono del jugador
        let phone = this.add.image(2100 * this.scale, 1280 * this.scale, this.atlasName, 'stolenPhone').setOrigin(0, 0).setScale(this.scale * 1.7);
        phone.setInteractive({ useHandCursor: true });
        phone.on('pointerdown', () => {
            this.gameManager.interacted("phone", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .send();
            this.dialogManager.setNode(phoneNode);
        });

        let nodes = this.cache.json.get('restroomBreakDay4');
        let phoneNode = super.readNodes(nodes, "day4\\restroomBreakDay4", "phone", true);
        
        this.dispatcher.addOnce("pickPhone", this, (obj) => {
            phone.disableInteractive();
            this.tweens.add({
                targets: [phone],
                alpha: { from: 1, to: 0 },
                duration: 500,
                repeat: 0,
            });
        });


        // El unico sitio al que se puede volver es la escena de la que se 
        // viene, por lo que si esta guardada en los parametros, se establece
        if (params) {
            if (params.corridor) {
                this.corridor = params.corridor;
            }
        }
    }
}

class BedroomBase extends BaseScene {
    /**
     * Escena base para la habitacion. Coloca los elementos que se mantienen igual todos los dias
     * @extends BaseScene
     * @param {String} name - id de la escena
     */
    constructor(name) {
        super(name, 'bedroom');
    }

    create(params) {
        super.create(params);
        let statementBuilder=this.gameManager.initialized(`scene.${this.scene.key}`, xapiTracker.COMPLETABLETYPE.COMPLETABLE,true, true);
        statementBuilder=this.gameManager.addStateExtensions(statementBuilder);
        statementBuilder.send();
        this.gameManager.initialized(`scene.${this.scene.key}`, xapiTracker.COMPLETABLETYPE.STORYNODE,true)
                        .send();
                        
        this.livingroom = "";

        // Pone la imagen de fondo con las dimensiones del canvas
        let bg = this.add.image(0, 0, 'bedroomBg').setOrigin(0, 0);
        this.scale = this.CANVAS_HEIGHT / bg.height;
        bg.setScale(this.scale);

        this.rightBound = bg.displayWidth;

        // Puerta del armario individual
        let door1Closed = this.add.image(2190 * this.scale, 330 * this.scale, this.atlasName, 'wardrobeDoor1Closed').setOrigin(0, 0).setScale(this.scale);
        let door1Opened = this.add.image(2110 * this.scale, 330 * this.scale, this.atlasName, 'wardrobeDoor1Opened').setOrigin(0, 0).setScale(this.scale);
        super.toggleDoor(door1Closed, door1Opened, () => {
            this.gameManager.interacted("wardrobeDoor1", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .withResultExtension("status", "closed")
                            .send();
        }, true, () => {
            this.gameManager.interacted("wardrobeDoor1", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .withResultExtension("status", "opened")
                            .send();
        });

        // Puerta izquierda del armario
        let door2Closed = this.add.image(2500 * this.scale, 330 * this.scale, this.atlasName, 'wardrobeDoor2Closed').setOrigin(0, 0).setScale(this.scale);
        let door2Opened = this.add.image(2435 * this.scale, 307 * this.scale, this.atlasName, 'wardrobeDoor2Opened').setOrigin(0, 0).setScale(this.scale);
        super.toggleDoor(door2Closed, door2Opened, () => {
            this.gameManager.interacted("wardrobeDoor2", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .withResultExtension("status", "closed")
                            .send();
        }, true, () => {
            this.gameManager.interacted("wardrobeDoor2", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .withResultExtension("status", "opened")
                            .send();
        });

        // Puerta derecha del armario
        let door3Closed = this.add.image(3155 * this.scale, 330 * this.scale, this.atlasName, 'wardrobeDoor3Closed').setOrigin(1, 0).setScale(this.scale);
        let door3Opened = this.add.image(3220 * this.scale, 330 * this.scale, this.atlasName, 'wardrobeDoor3Opened').setOrigin(1, 0).setScale(this.scale);
        super.toggleDoor(door3Closed, door3Opened, () => {
            this.gameManager.interacted("wardrobeDoor3", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .withResultExtension("status", "closed")
                            .send();
        }, true, () => {
            this.gameManager.interacted("wardrobeDoor3", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .withResultExtension("status", "opened")
                            .send();
        });


        // Interior de los armarios. Se reordenan las profundidades de las puertas de los armarios
        // para hacer click sobre el elemento correcto. Al hacer click sobre el interior del armario,
        // se cambia el nodo en el dialogManager. El nodo que se pone es nulo por defecto, y se tiene
        // que establecer en la creacion de la escena 
        this.wardrobe1Node = null;
        this.wardrobe2Node = null;

        let wardrobe1 = this.add.rectangle(door1Closed.x, door1Closed.y, door1Closed.displayWidth, door1Closed.displayHeight, 0xfff, 0).setOrigin(0, 0);
        door1Closed.setDepth(bg.depth + 3);
        door1Opened.setDepth(door1Closed.depth - 1);
        wardrobe1.setDepth(door1Opened.depth - 1);
        wardrobe1.setInteractive({ useHandCursor: true });
        wardrobe1.on('pointerdown', () => {
            if (door1Opened.visible) {
                this.gameManager.interacted("wardrobe1", xapiTracker.GAMEOBJECTTYPE.ITEM)
                                .send();
                this.dialogManager.setNode(this.wardrobe1Node);
                
            }
        });

        let wardrobe2 = this.add.rectangle(door2Closed.x, door2Closed.y, door2Closed.displayWidth + door3Closed.displayWidth - 15, door1Closed.displayHeight, 0xfff, 0).setOrigin(0, 0);
        door2Closed.setDepth(bg.depth + 4);
        door2Opened.setDepth(door2Closed.depth);
        door3Closed.setDepth(bg.depth + 4);
        door3Opened.setDepth(door2Closed.depth);
        wardrobe2.setInteractive();
        wardrobe2.on('pointerdown', () => {
            if (door2Opened.visible || door3Opened.visible) {
                this.gameManager.interacted("wardrobe2", xapiTracker.GAMEOBJECTTYPE.ITEM)
                                .send();
                this.dialogManager.setNode(this.wardrobe2Node);
            }
        });


        // Ordenador
        let nodes = this.cache.json.get('everydayDialog');
        this.pcNode = super.readNodes(nodes, "everydayDialog", "bedroom.pc", true);
        let pc = this.add.zone(276, 360, 150, 162).setOrigin(0, 0);
        pc.setInteractive({ useHandCursor: true });
        // Al hacer click sobre el, se cambia el nodo en el dialogManager, y si
        // se lanza el evento turnPC, se cambia a la escena del ordenador
        pc.on('pointerdown', () => {
            this.gameManager.interacted("computer", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .send();
            this.dialogManager.setNode(this.pcNode);
        });
        this.dispatcher.add("turnPC", this, (obj) => {
            this.gameManager.switchToComputer();
        });

        // Silla
        this.chair = this.add.image(770 * this.scale, 859 * this.scale, this.atlasName, 'bedroomChair').setOrigin(0, 0).setScale(this.scale);

        // Puerta de la habitacion
        let doorClosed = this.add.image(6, this.CANVAS_HEIGHT, this.atlasName, 'bedroomDoorClosed').setOrigin(0, 1).setScale(this.scale);
        let doorOpened = this.add.image(6, this.CANVAS_HEIGHT, this.atlasName, 'bedroomDoorOpened').setOrigin(0, 1).setScale(this.scale);
        // Al hacer click sobre la puerta abierta, se pasa al salon con la camara en la derecha
        super.toggleDoor(doorClosed, doorOpened, () => {
            let params = {
                camPos: "right"
            };
            this.gameManager.interacted("livingroomDoor", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .send();
            this.gameManager.changeScene(this.livingroom, params, true);
        }, false);


        // Cama
        // Al igual que con el interior de los armarios, se recoloca su profundidad 
        // y al hacer click sobre ella, se cambia el nodo en el dialogManager
        this.bed = this.add.image(bg.displayWidth, this.CANVAS_HEIGHT, this.atlasName, 'bed').setOrigin(1, 1).setScale(this.scale);
        this.bed.setInteractive({ useHandCursor: true });
        this.bed.setDepth(10);
        this.bedNode = null;
        this.bed.on('pointerdown', () => {
            this.gameManager.interacted("bed", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .send();
            this.dialogManager.setNode(this.bedNode);
        });

        // Evento que se llama al elegir dormir. Hace la animacion de cerrar 
        // los ojos y cuando acaba pasa a la pesadilla del dia correspondiente
        this.dispatcher.addOnce("sleep", this, (obj) => {
            this.phoneManager.topLid.visible = true;
            this.phoneManager.botLid.visible = true;
            this.phoneManager.topLid.y = -this.CANVAS_HEIGHT / 2;
            this.phoneManager.botLid.y = this.CANVAS_HEIGHT;
            let anim = this.phoneManager.closeEyesAnimation(false);
            let statementBuilder=this.gameManager.completed(`scene.${this.scene.key}`, xapiTracker.COMPLETABLETYPE.COMPLETABLE,true, true);
            statementBuilder=this.gameManager.addStateExtensions(statementBuilder);
            statementBuilder.send();
            this.gameManager.completed(`scene.${this.scene.key}`, xapiTracker.COMPLETABLETYPE.STORYNODE,true)
                            .send();
            this.gameManager.progressedGame();
            anim.on('complete', () => {
                setTimeout(() => {
                    this.phoneManager.bgBlock.disableInteractive();
                    let nightmareScene = "NightmareDay" + this.gameManager.day;
                    this.gameManager.changeScene(nightmareScene);
                }, 1000);
            });
        });        
    }
}

class BedroomMorningDay1 extends BedroomBase {
    constructor() {
        super('BedroomMorningDay1');
    }

    create(params) {
        super.create(params);

        this.livingroom = "LivingroomMorningDay1";

        let nodes = this.cache.json.get('bedroomMorningDay1');
        
        // Dialogos del interior del armario y la cama
        this.wardrobe1Node = super.readNodes(nodes, "day1\\bedroomMorningDay1", "wardrobe1", true);
        this.wardrobe2Node = super.readNodes(nodes, "day1\\bedroomMorningDay1", "wardrobe2", true);
        this.bedNode = super.readNodes(nodes, "day1\\bedroomMorningDay1", "bed", true);

        // Mochila
        let bagNode = super.readNodes(nodes, "day1\\bedroomMorningDay1", "bag", true);
        let bag = this.add.image(170, this.CANVAS_HEIGHT - 170, this.atlasName, 'bag').setOrigin(0, 0).setScale(this.scale);
        bag.setInteractive({ useHandCursor: true });
        bag.on('pointerdown', () => {
            this.gameManager.interacted("bag", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .withResultExtension("bagPicked", true)
                            .send();
            this.dialogManager.setNode(bagNode);
        });

        // Ropa
        this.add.image(852 * this.scale + 1, 848 * this.scale - 1, this.atlasName, 'bedroomJacket').setOrigin(0, 0).setScale(this.scale);
        this.add.image(2899 * this.scale + 1, 1296 * this.scale - 1, this.atlasName, 'clothes1').setOrigin(0, 0).setScale(this.scale).setDepth(this.bed + 1);
        this.add.image(2704 * this.scale + 1, 963 * this.scale - 1, this.atlasName, 'clothes2').setOrigin(0, 0).setScale(this.scale).setDepth(this.bed + 1);
        this.add.image(2061 * this.scale + 1, 928 * this.scale - 1, this.atlasName, 'clothes3').setOrigin(0, 0).setScale(this.scale);


        // Evento que se llama al encender el ordenador. Pone la hora a la de llegar tarde
        // en el telefono (la variable de llegar tarde la cambia el propio evento)
        this.dispatcher.add("turnPC", this, (obj) => {
            this.phoneManager.setDayInfo("pcLateHour");
        });

        // Evento que se llama al coger la mochila. Hace que la mochila desaparezca con 
        // una animacion (la variable de coger la mochila la cambia el propio evento)
        this.dispatcher.addOnce("pickBag", this, (obj) => {
            bag.disableInteractive();
            this.tweens.add({
                targets: bag,
                alpha: { from: 1, to: 0 },
                duration: 100,
                repeat: 0,
            });
        });

    }
}

class LivingroomBase extends BaseScene {
    /**
     * Escena base para el salon. Coloca los elementos que se mantienen igual todos los dias
     * @extends BaseScene
     * @param {String} name - id de la escena
     */
    constructor(name) {
        super(name, 'livingroom');
    }

    create(params) {
        super.create(params);

        this.bedroom = "";
        this.playground = "";

        
        // Pone la imagen de fondo con las dimensiones del canvas
        let bg = this.add.image(0, 0, 'livingroomBg').setOrigin(0, 0);
        this.scale = this.CANVAS_HEIGHT / bg.height;
        bg.setScale(this.scale);

        // Escala puesta a mano. La imagen original tenia otras dimensiones, pero debido a su gran
        // tamano, no es posible cargarla en dispositivos moviles, por lo que se ha reducido 
        this.scale = this.CANVAS_HEIGHT / 1500;

        this.rightBound = bg.displayWidth;

        // Puerta a la calle
        this.doorNode = null;
        this.canExit = false;
        let playgroundDoorClosed = this.add.image(254 * this.scale - 4, 10 * this.scale - 4, this.atlasName, 'livingroomDoorClosed').setOrigin(0, 0).setScale(this.scale);
        let playgroundDoorOpened = this.add.image(254 * this.scale - 4, 10 * this.scale - 4, this.atlasName, 'livingroomDoorOpened').setOrigin(0, 0).setScale(this.scale);
        // Al hacer click sobre la puerta abierta, si hay algun dialogo que mostrar (para indicar que no se puede salir), se 
        // mostrara. En caso contrario, se pasara a la escena del patio con la camara a la izquierda y se eliminara esta escena
        super.toggleDoor(playgroundDoorClosed, playgroundDoorOpened, () => {
            this.gameManager.interacted("exitHomeDoor", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .send();
            if (this.doorNode) {
                this.dialogManager.setNode(this.doorNode);
            }
            else {
                let params = {
                    nextScene: this.playground
                };
                this.gameManager.changeScene("BusScene", params);
            }
        }, false);


        // Puerta a la habitacion
        let bedroomDoorClosed = this.add.image(3958 * this.scale - 5, 175 * this.scale - 2, this.atlasName, 'bedroomDoorClosed').setOrigin(0, 0).setScale(this.scale);
        let bedroomDoorOpened = this.add.image(3956 * this.scale - 4, 175 * this.scale - 2, this.atlasName, 'bedroomDoorOpened').setOrigin(0, 0).setScale(this.scale);
        // Al hacer click sobre la puerta abierta, se pasa a la habitacion con la camara en la izquierda
        super.toggleDoor(bedroomDoorClosed, bedroomDoorOpened, () => {
            this.gameManager.interacted("bedroomDoor", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .send();
            let params = {
                camPos: "left"
            };
            this.gameManager.changeScene(this.bedroom, params, true);
        }, false);


        // Se comprueba si no se ha cogido la mochila. Si no se ha cogido, se pone el dialogo en la puerta
        if (!this.gameManager.getValue("bagPicked")) {
            let nodes = this.cache.json.get('everydayDialog');
            this.doorNode = super.readNodes(nodes, "everydayDialog", "livingroom.doorMorning", true);
        }

        // Suscripcion al evento de coger la mochila por si no se 
        // coge antes de salir de la habitacion por primera vez
        this.dispatcher.addOnce("pickBag", this, (obj) => {
            this.doorNode = null;
        });

        // Suscripcion al evento de modificar la amistad. Se llama cuando se le cuenta a los padres 
        // algo de la escuela, e impide que les baje la amistad si se elige la opcion de no contarles 
        // nada en la primera tanda de opciones si se les habla de las cosas que han ocurrido
        this.dispatcher.addOnce("changeFriendship", this, (obj) => {
            this.blackboard.set("canIgnore", false);
        });
    }


}

class Character {
    /**
    * Clase para un personaje y su retrato 
    * @param {Phaser.Scene} scene - escena a la que pertenece
    * @param {String} key - identifica al personaje y sus respectivas animaciones
    * @param {Object} trans - posicion y escala del personaje
    * @param {Object} portraitTrans - posicion y escala del retrato
    * @param {Object} dialogContext - contexto de la funcion del dialogo
    * @param {Function} dialog - funcion con el dialogo que reproduce el personaje
    */
    constructor(scene, key, trans, portraitTrans, dialog) {
        this.scene = scene;

        this.anims = [];
        this.key = key;
        // Se crea el personaje y sus animaciones esqueletales de Spine
        // Nota: el origen es (0.5, 1). No se puede modificar
        this.char = this.scene.add.spine(trans.x, trans.y, key);
        this.char.setScale(trans.scale);
        this.char.setInteractive({ useHandCursor: true });
        this.anims.push(this.char);
        this.charContainer = this.scene.add.spineContainer();
        this.charContainer.add(this.char);

        this.dialog = dialog;
        this.char.on('pointerdown', () => {
            xapiTracker.gameObject(this.key, xapiTracker.GAMEOBJECTTYPE.NPC)
                        .interacted()
                        .send();
            this.dialog();
        });

        // Se crea el retrato y sus animaciones esquelates de Spine
        // El retrato se almacena en un contenedor especial para objetos de tipo Spine
        // para poder ponerle una mascara
        this.portrait = this.scene.add.spineContainer();
        this.maxSize = 1;
        this.imgPortrait = this.scene.add.spine(0, 0, key);
        this.portrait.setPosition(portraitTrans.x, portraitTrans.y);
        this.portrait.setScale(portraitTrans.scale);
        this.portrait.add(this.imgPortrait);
        this.anims.push(this.imgPortrait);

        this.DEFAULT_ANIM_SPEED = 0.6; 
        this.setAnimSpeed(this.DEFAULT_ANIM_SPEED);
    }

    setAnimation(name, loop) {
        // cambiar la animacion tanto del personaje como del retrato
        this.anims.forEach((anim) => {
            anim.setAnimation(0, name, loop);
        });
    }

    getPortrait() {
        return this.portrait;
    }

    setPosition(x, y) {
        this.char.setPosition(x, y);
    }

    setScale(scaleX, scaleY) {
        if (!scaleY) {
            scaleY = scaleX;
        }
        this.char.setScale(scaleX, scaleY);
    }

    setActive(enable) {
        this.char.setVisible(enable);
        if (enable) {
            this.char.setInteractive();
        }
        else {
            this.char.disableInteractive();
        }
    }

    setDepth(depth) {
        this.charContainer.setDepth(depth);
    }

    changeDialog(dialog) {
        this.dialog = dialog;
    }

    setAnimSpeed(speed) {
        this.char.state.timeScale = speed;
        this.imgPortrait.state.timeScale = speed;
    }

}

class LivingroomMorningDay1 extends LivingroomBase {
    constructor() {
        super('LivingroomMorningDay1');
    }

    create(params) {
        super.create(params);

        this.bedroom = "BedroomMorningDay1";
        this.playground = "PlaygroundMorningDay1";

        // Personajes
        let tr = {
            x: 460,
            y: this.CANVAS_HEIGHT * 0.83,
            scale: 0.15
        };
        let mom = new Character(this, "mom", tr, this.portraitTr, () => {
            this.dialogManager.setNode(momNode);
        });
        mom.setAnimation("Idle01", true);
        this.portraits.set("mom", mom.getPortrait());

        let nodes = this.cache.json.get('livingroomMorningDay1');
        let momNode = super.readNodes(nodes, "day1\\livingroomMorningDay1", "mom", true);
    }
}

class PlaygroundBase extends BaseScene {
    /**
     * Escena base para el patio. Coloca los elementos que se mantienen igual todos los dias
     * @extends BaseScene
     * @param {String} name - id de la escena
     */
    constructor(name) {
        super(name);
    }
    
    create(params) {
        super.create(params);

        this.home = "";
        this.stairs = "";

        
        // Pone la imagen de fondo con las dimensiones del canvas
        this.bgImg = 'playgroundClosed';
        this.bg = this.add.image(0, 0, this.bgImg).setOrigin(0, 0).setDepth(-1);
        this.scale = this.CANVAS_HEIGHT / this.bg.height;
        this.bg.setScale(this.scale);
        this.rightBound = this.bg.displayWidth;


        this.homeNode = null;
        let exit = this.add.rectangle(0, 913 * this.scale, 1140 * this.scale, 490 * this.scale, 0xfff, 0).setOrigin(0, 0);
        exit.setInteractive({ useHandCursor: true });
        // Al hacer click sobre la zona de salida si hay algun dialogo que mostrar (para indicar que no se puede salir), se
        // mostrara. En caso contrario, se pasara a la escena del salon con la camara a la izquierda y se eliminara esta escena
        exit.on('pointerdown', () => {
            this.gameManager.interacted("exit", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .send();
            if (this.homeNode) {
                this.dialogManager.setNode(this.homeNode);
            }
            else {
                let params = {
                    nextScene: this.home
                };
                this.gameManager.changeScene("BusScene", params);
            }
        });

        // Puertas del edificio
        let nodes = this.cache.json.get('everydayDialog');
        this.doorNode = null;
        let doors = this.add.rectangle(2640 * this.scale, 1060 * this.scale, 262, 186, 0xfff, 0).setOrigin(0, 0);
        doors.setInteractive({ useHandCursor: true });
        // Al hacer click sobre la zona de la puerta, si hay algun dialogo que mostrar, (para indicar que 
        // no se puede entrar), se mostrara. En caso contrario, se pasara a la escena de las escaleras
        doors.on('pointerdown', () => {
            this.gameManager.interacted("doors", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .send();
            if (!this.doorNode && this.bgImg === 'playgroundOpened') {
                this.gameManager.changeScene(this.stairs, { } , true);
            }
            else {
                this.dialogManager.setNode(this.doorNode);
            }
        });

    }

    openDoors() {
        this.bg.destroy();
        let bgDepth = this.bg.depth;
        this.bgImg = 'playgroundOpened';
        this.bg = this.add.image(0, 0, this.bgImg).setOrigin(0, 0).setScale(this.scale).setDepth(bgDepth);
    }
}

class PlaygroundMorningDay1 extends PlaygroundBase {
    constructor() {
        super('PlaygroundMorningDay1');
    }

    create(params) {
        super.create(params);

        this.home = "";
        this.stairs = "StairsMorningDay1";

        let nodes = this.cache.json.get('everydayDialog');
        this.homeNode = super.readNodes(nodes, "everydayDialog", "playground.homeMorning", true);

        // Si no se llega tarde, se colocan personajes de fondo
        if (!this.gameManager.getValue("isLate")) {
            // Se establece el dialogo de la puerta para que no se pueda entrar hasta que se abran 
            this.phoneManager.setDayInfo("playgroundMorning");
            this.doorNode = super.readNodes(nodes, "everydayDialog","playground.doorMorning", true);

            let tr = {
                x: 280,
                y: this.CANVAS_HEIGHT * 0.95,
                scale: 0.065
            };
            let jose = new Character(this, "Jose", tr, this.portraitTr, () => {
                this.dialogManager.setNode(joseNode);
            });
            jose.setScale( -tr.scale, tr.scale);
            jose.setAnimation("IdleBase", true);
            this.portraits.set("Jose", jose.getPortrait());
    
            tr = {
                x: this.rightBound * 0.65,
                y: this.CANVAS_HEIGHT * 0.92,
                scale: 0.055
            };
            let alison = new Character(this, "Alison", tr, this.portraitTr, () => {
                this.dialogManager.setNode(alisonNode);
            });
            alison.setAnimation("IdleBase", true);
            this.portraits.set("Alison", alison.getPortrait());

            tr = {
                x: this.rightBound * 0.96,
                y: this.CANVAS_HEIGHT * 1.25,
                scale: 0.2
            };
            let guille = new Character(this, "Guille", tr, this.portraitTr, () => {
                this.dialogManager.setNode(guilleNode);
            });
            guille.setAnimation("IdleBase", true);
            this.portraits.set("Guille", guille.getPortrait());


            nodes = this.cache.json.get('playgroundMorningDay1');
            let joseNode = super.readNodes(nodes, "day1\\playgroundMorningDay1", "jose", true);
            let alisonNode = super.readNodes(nodes, "day1\\playgroundMorningDay1", "alison", true);
            let guilleNode = super.readNodes(nodes, "day1\\playgroundMorningDay1", "guille", true);
            

            // Evento llamado cuando suena la campana
            this.dispatcher.addOnce("openDoors", this, (obj) => {
                // Cambia la hora del movil
                this.phoneManager.setDayInfo("classStart");
                // Se quita el dialogo que aparece al hacer click en las puertas
                this.doorNode = null;

                jose.char.disableInteractive();
                alison.char.disableInteractive();
                guille.char.disableInteractive();
                // Se hace fade out de todos los personajes de la escena
                let anim = this.tweens.add({
                    targets: [jose.char, alison.char, guille.char],
                    alpha: { from: 1, to: 0 },
                    duration: 1000,
                    repeat: 0,
                });

                // Una vez termina la animacion, se abren las puertas
                anim.on('complete', () => {
                    super.openDoors();
                });
            });
        }
        // Si no, se pone la hora de llegar tarde, se dejan las puertas abiertas, y se quita el dialogo de la puerta
        else {
            this.phoneManager.setDayInfo("playgroundMorningLate");
            super.openDoors();
            this.doorNode = null;
        }
    }
}

class StairsBase extends BaseScene {
    /**
     * Escena base para las escaleras. Coloca los elementos que se mantienen igual todos los dias
     * @extends BaseScene
     * @param {String} name - id de la escena
     */
    constructor(name) {
        super(name);
    }

    create(params) {
        super.create(params);

        this.playground = "";
        this.corridor = "";

        // Pone la imagen de fondo con las dimensiones del canvas
        this.bgImg = 'stairsBg';
        this.bg = this.add.image(0, 0, this.bgImg).setOrigin(0, 0);
        this.scale = this.CANVAS_HEIGHT / this.bg.height;
        this.bg.setScale(this.scale);
        this.rightBound = this.bg.displayWidth;

        let nodes = this.cache.json.get('everydayDialog');

        let wallTagNode = super.readNodes(nodes, "everydayDialog", "stairs.tag", true);
        let wallTag = this.add.rectangle(2321 * this.scale, 650 * this.scale, 130 * this.scale, 78 * this.scale, 0xfff, 0).setOrigin(0, 0);
        wallTag.setInteractive({ useHandCursor: true });
        wallTag.on('pointerdown', () => {
            this.dialogManager.setNode(wallTagNode);
            this.gameManager.interacted("wallTag", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .send();
        });

        // Puerta del despacho
        this.doorNode = super.readNodes(nodes, "everydayDialog", "stairs.door", true);
        let doorPos = {
            x: 2490 * this.scale,
            y: 273 * this.scale
        };
        let doorClosed = this.add.image(doorPos.x, doorPos.y, 'stairsDoorClosed').setOrigin(0, 0).setScale(this.scale);
        let doorOpened = this.add.image(doorPos.x, doorPos.y, 'stairsDoorOpened').setOrigin(0, 0).setScale(this.scale);
        // Al hacer click en la puerta, se muestra un dialogo
        super.toggleDoor(doorClosed, doorOpened, () => {
            this.gameManager.interacted("stairsDoor", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .send();
            this.dialogManager.setNode(this.doorNode);
        }, false);


        // Escaleras al patio
        this.playgroundNode = null;
        let playgroundStairs = this.add.rectangle(379 * this.scale, 711 * this.scale, 980 * this.scale, 600 * this.scale, 0xfff, 0).setOrigin(0, 0);
        playgroundStairs.setInteractive({ useHandCursor: true });
        // Al hacer click sobre las escaleras de bajada, si hay algun dialogo que mostrar (para indicar que no se puede bajar), se
        // mostrara. En caso contrario, se pasara a la escena del patio con la camara a la derecha sin eliminar esta escena
        playgroundStairs.on('pointerdown', () => {
            this.gameManager.interacted("playgroundStairs", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .send();
            if (this.playgroundNode) {
                this.dialogManager.setNode(this.playgroundNode);
            }
            else {
                let params = {
                    camPos: "right"
                };
                this.gameManager.changeScene(this.playground, params, true);
            }
        });

        // Escaleras al pasillo
        this.corridorNode = null;
        let corridorStairs = this.add.rectangle(1110 * this.scale, 60 * this.scale, 800 * this.scale, 770 * this.scale, 0xfff, 0).setOrigin(0, 0);
        corridorStairs.setInteractive({ useHandCursor: true });
        // Al hacer click sobre las escaleras de subida, si hay algun dialogo que mostrar (para indicar que no se puede subir), se
        // mostrara. En caso contrario, se pasara a la escena del pasillo sin eliminar esta escena
        corridorStairs.on('pointerdown', () => {
            this.gameManager.interacted("corridorStairs", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .send();
            if (this.corridorNode) {
                this.dialogManager.setNode(this.corridorNode);
            }
            else {
                let params = {
                    camPos: "left"
                };
                this.gameManager.changeScene(this.corridor, params, true);
            }
        });

    }

}

class StairsMorningDay1 extends StairsBase {
    constructor() {
        super('StairsMorningDay1');
    }

    create(params) {
        super.create(params);

        this.playground = "PlaygroundMorningDay1";
        this.corridor = "CorridorMorningDay1";

        let nodes = this.cache.json.get('everydayDialog');
        this.playgroundNode = super.readNodes(nodes, "everydayDialog", "stairs.downstairs", true);

    }
}

class CorridorBase extends BaseScene {
    /**
     * Escena base para el pasillo. Coloca los elementos que se mantienen igual todos los dias
     * @extends BaseScene
     * @param {String} name - id de la escena
     */
    constructor(name) {
        super(name, 'corridor');
    }

    create(params) {
        super.create(params);

        this.stairs = "";
        this.class = "";

        // Establece la escena de bano y el nodo por defecto del bano opuesto segun el genero del jugador
        let nodes = this.cache.json.get('everydayDialog');
        if (this.gameManager.getUserInfo().gender === "male") {
            this.boysRestroom = "RestroomBase";
            this.girlsRestroom = "OppositeRestroom";
            this.girlsRestroomNode = super.readNodes(nodes, "everydayDialog", "corridor.restroom", true);
        }
        else {
            this.girlsRestroom = "RestroomBase";
            this.boysRestroom = "OppositeRestroom";
            this.boysRestroomNode = super.readNodes(nodes, "everydayDialog", "corridor.restroom", true);
        }
        


        // Pone la imagen de fondo con las dimensiones del canvas
        let bg = this.add.image(0, 0, 'corridorBg').setOrigin(0, 0);
        this.scale = this.CANVAS_HEIGHT / bg.height;
        bg.setScale(this.scale);

        this.rightBound = bg.displayWidth;


        // Puerta a las escaleras
        this.stairsNode = null;
        this.stairsDoor = this.add.rectangle(844 * this.scale, 687 * this.scale, 286 * this.scale, 290 * this.scale, 0xfff, 0).setOrigin(0, 0);
        this.stairsDoor.setInteractive({ useHandCursor: true });
        // Al hacer click, si hay algun dialogo que mostrar (para indicar que no se puede salir), se
        // mostrara. En caso contrario, se pasara a la escena de las escaleras sin eliminar esta escena
        this.stairsDoor.on('pointerdown', () => {
            this.gameManager.interacted("stairsDoor", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .send();
            if (this.stairsNode) {
                this.dialogManager.setNode(this.stairsNode);
            }
            else {
                this.gameManager.changeScene(this.stairs, {}, true);
            }
        });

        // Puerta del bano de los chicos
        let doorPos = {
            x: 1485 * this.scale,
            y: 596 * this.scale
        };
        let boysRestroomdoorClosed = this.add.image(doorPos.x, doorPos.y, this.atlasName, 'boysDoorClosed').setOrigin(0, 0).setScale(this.scale);
        let boysRestroomDoorOpened = this.add.image(doorPos.x, doorPos.y, this.atlasName, 'boysDoorOpened').setOrigin(0, 0).setScale(this.scale);
        // Al hacer click, si hay algun dialogo que mostrar (para indicar que no se puede entrar), se
        // mostrara. En caso contrario, se pasara a la escena del bano sin eliminar esta escena
        super.toggleDoor(boysRestroomdoorClosed, boysRestroomDoorOpened, () => {
            this.gameManager.interacted("boysRestroom", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .send();
            if (this.boysRestroomNode) {
                this.dialogManager.setNode(this.boysRestroomNode);
            }
            else {
                let params = {
                    camPos: "left",
                    corridor: this
                };
                this.gameManager.changeScene(this.boysRestroom, params, true);
            }
        }, false);

        // Puerta del bano de las chicas
        doorPos = {
            x: 1361 * this.scale,
            y: 636 * this.scale
        };
        let girlsRestroomDoorClosed = this.add.image(doorPos.x, doorPos.y, this.atlasName, 'girlsDoorClosed').setOrigin(0, 0).setScale(this.scale);
        let girlsRestroomDoorOpened = this.add.image(doorPos.x, doorPos.y, this.atlasName, 'girlsDoorOpened').setOrigin(0, 0).setScale(this.scale);
        // Al hacer click, si hay algun dialogo que mostrar (para indicar que no se puede entrar), se
        // mostrara. En caso contrario, se pasara a la escena del bano sin eliminar esta escena
        super.toggleDoor(girlsRestroomDoorClosed, girlsRestroomDoorOpened, () => {
            this.gameManager.interacted("girlsRestroom", xapiTracker.GAMEOBJECTTYPE.ITEM);
            if (this.girlsRestroomNode) {
                this.dialogManager.setNode(this.girlsRestroomNode);
            }
            else {
                let params = {
                    camPos: "left",
                    corridor: this
                };
                this.gameManager.changeScene(this.girlsRestroom, params, true);
            }
        }, false);


        // Puerta de la clase
        doorPos = {
            x: 109 * this.scale,
            y: 341 * this.scale
        };
        this.classNode = null;
        let classDoorClosed = this.add.image(doorPos.x, doorPos.y, this.atlasName, 'classDoorClosed').setOrigin(0, 0).setScale(this.scale);
        let classDoorOpened = this.add.image(doorPos.x, doorPos.y, this.atlasName, 'classDoorOpened').setOrigin(0, 0).setScale(this.scale);
        // Al hacer click, si hay algun dialogo que mostrar, se mostrara. 
        // En caso contrario, se pasara a la escena de la clase y se borrara esta escena
        super.toggleDoor(classDoorClosed, classDoorOpened, () => {
            this.gameManager.interacted("classDoor", xapiTracker.GAMEOBJECTTYPE.ITEM);
            if (this.classNode) {
                this.dialogManager.setNode(this.classNode);
            }
            else {
                let params = {
                    camPos: "left",
                };
                this.gameManager.changeScene(this.class, params);
            }
        }, false);


        // Evento llamado cuando se elige volver a entrar en clase
        this.dispatcher.addOnce("endBreak", this, (obj) => {
            let sceneName = 'TextOnlyScene';
            let textID = "day" + this.gameManager.day + ".endBreak";
            // Se obtiene el texto de la escena de transicion del archivo de traducciones 
            let text = this.i18next.t(textID, { ns: "transitionScenes", returnObjects: true });

            let params = {
                text: text,
                onComplete: () => {
                    this.gameManager.changeScene(this.class, this.classChangeParams);
                },
                onCompleteDelay: 500
            };
            
            // Se cambia a la escena de transicion
            this.gameManager.changeScene(sceneName, params);
        });
        

    }
}

class CorridorMorningDay1 extends CorridorBase {
    constructor() {
        super('CorridorMorningDay1');
    }

    create(params) {
        super.create(params);

        this.stairs = "StairsMorningDay1";
        this.class = "ClassFrontMorningDay1";

        
        // Si no se llega tarde, se colocan personajes en el fondo
        if (!this.gameManager.getValue("isLate")) {
            let tr = {
                x: 250,
                y: this.CANVAS_HEIGHT * 0.75,
                scale: 0.087
            };
            let maria = new Character(this, "Maria", tr, this.portraitTr, () => {
                this.dialogManager.setNode(mariaNode);
            });
            maria.setAnimation("IdleBase", true);
            this.portraits.set("Maria", maria.getPortrait());
    
            tr = {
                x: this.rightBound * 0.60,
                y: this.CANVAS_HEIGHT * 0.75,
                scale: 0.083
            };
            let alison = new Character(this, "Alison", tr, this.portraitTr, () => {
                this.dialogManager.setNode(alisonNode);
            });
            alison.setAnimation("IdleBase", true);
            this.portraits.set("Alison", alison.getPortrait());
    
    
            tr = {
                x: this.rightBound * 0.76,
                y: this.CANVAS_HEIGHT * 0.93,
                scale: 0.15
            };
            let guille = new Character(this, "Guille", tr, this.portraitTr, () => {
                this.dialogManager.setNode(guilleNode);
                this.gameManager.setValue("metGuille", true);
            });
            guille.setScale(-tr.scale, tr.scale);
            guille.setAnimation("IdleBase", true);
            this.portraits.set("Guille", guille.getPortrait());
    
            let nodes = this.cache.json.get('corridorMorningDay1');
            let mariaNode = super.readNodes(nodes, "day1\\corridorMorningDay1", "maria", true);
            let alisonNode = super.readNodes(nodes, "day1\\corridorMorningDay1", "alison", true);
            let guilleNode = super.readNodes(nodes, "day1\\corridorMorningDay1", "guille", true);
        }
        
    }
}

class ClassFrontBase extends BaseScene {
    /**
     * Escena base para el frente de la clase. Coloca los elementos que se mantienen igual todos los dias
     * @extends BaseScene
     * @param {String} name - id de la escena
     */
    constructor(name) {
        super(name, 'classFront');
    }
    
    create(params) {
        super.create(params);

        // Pone la imagen de fondo con las dimensiones del canvas
        let bg = this.add.image(0, 0, 'classFrontBg').setOrigin(0, 0);
        this.scale = this.CANVAS_HEIGHT / bg.height;
        bg.setScale(this.scale);

        this.rightBound = bg.displayWidth;

        // Primera fila de sillas y mesas
        this.row1Chairs = this.add.image(0, 0, 'frontRow1Chairs').setOrigin(0, 0).setScale(this.scale);
        this.row1Tables = this.add.image(0, 0, 'frontRow1Tables').setOrigin(0, 0).setScale(this.scale);

        // Segunda fila de sillas y mesas
        this.row2Chairs = this.add.image(0, 0, 'frontRow2Chairs').setOrigin(0, 0).setScale(this.scale);
        this.row2Tables = this.add.image(0, 0, 'frontRow2Tables').setOrigin(0, 0).setScale(this.scale);

        // Tercera fila de sillas y mesas
        this.row3Chairs = this.add.image(0, 0, 'frontRow3Chairs').setOrigin(0, 0).setScale(this.scale);
        this.row3Tables = this.add.image(0, 0, 'frontRow3Tables').setOrigin(0, 0).setScale(this.scale);

        // Cuarta fila de sillas y mesas
        this.row4Chairs = this.add.image(0, 0, 'frontRow4Chairs').setOrigin(0, 0).setScale(this.scale);
        this.row4Tables = this.add.image(0, 0, 'frontRow4Tables').setOrigin(0, 0).setScale(this.scale);

        // Quinta fila de sillas y mesas
        this.row5Chairs = this.add.image(0, 0, 'frontRow5Chairs').setOrigin(0, 0).setScale(this.scale);
        this.row5Tables = this.add.image(0, 0, 'frontRow5Tables').setOrigin(0, 0).setScale(this.scale);


        // Se recolocan las filas para que las sillas esten por debajo de las 
        // mesas y las filas del fondo esten por debajo de las filas del frente
        this.row5Chairs.setDepth(1);
        this.row5Tables.setDepth(this.row5Chairs.depth + 1);

        this.row4Chairs.setDepth(this.row5Tables.depth + 1);
        this.row4Tables.setDepth(this.row4Chairs.depth + 1);

        this.row3Chairs.setDepth(this.row4Tables.depth + 1);
        this.row3Tables.setDepth(this.row3Chairs.depth + 1);

        this.row2Chairs.setDepth(this.row3Tables.depth + 1);
        this.row2Tables.setDepth(this.row2Chairs.depth + 1);

        this.row1Chairs.setDepth(this.row2Tables.depth + 1);
        this.row1Tables.setDepth(this.row1Chairs.depth + 1);


        this.tablesNode = null;
        // Forma geometrica para poder interactuar con los sitios libres
        let graphics = this.add.graphics(0, 0);
        let polygon = new Phaser.Geom.Polygon([
            1240, 525,
            910, 525,
            1095, 670,
            1495, 670,
            1550, 680,
            1550, 600,
            1365, 615,
            1260, 580,
            1465, 565,
        ]);
        // graphics.lineStyle(5, 0xFF00FF, 1.0).fillStyle(0xFFF, 1.0).fillPoints(polygon.points, true);
        graphics.generateTexture('tables', this.rightBound, this.CANVAS_HEIGHT);
        let tables = this.add.image(0, 0, 'tables').setOrigin(0, 0).setDepth(200);
        graphics.destroy();

        // Para las areas interactuables con forma de poligono, hay que hacerlas primero interactivas
        // y luego cambiar el cursor manualmente, ya que si no, toda la textura se vuelve interactuable
        tables.setInteractive(polygon, Phaser.Geom.Polygon.Contains);
        tables.input.cursor = 'pointer';
        
        tables.on('pointerdown', () => {
            this.gameManager.interacted("tables", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .send();
            this.dialogManager.setNode(this.tablesNode);
        });

    }
}

class ClassFrontMorningDay1 extends ClassFrontBase {
    constructor() {
        super('ClassFrontMorningDay1');
    }

    create(params) {
        super.create(params);

        let teacher = this.add.image(this.portraitTr.x, this.portraitTr.y + 20, 'teacherChar').setOrigin(0.5, 1).setScale(this.portraitTr.scale);
        this.portraits.set("teacher", teacher);

        // Si no se ha llegado tarde, solo se coloca a Ana en clase
        if (!this.gameManager.getValue("isLate")) {
            let tr = {
                x: 650,
                y: this.CANVAS_HEIGHT * 0.86,
                scale: 0.1
            };
            let ana = new Character(this, "Ana", tr, this.portraitTr, () => {
                this.dialogManager.setNode(anaNode);
            });
            ana.setDepth(this.row4Tables.depth);
            ana.setAnimation("IdleBase", true);
            this.portraits.set("Ana", ana.getPortrait());

            let nodes = this.cache.json.get('classFrontMorningDay1');
            let anaNode = super.readNodes(nodes, "day1\\classFrontMorningDay1", "ana", true);
        }
        // Si no, se colocan mas alumnos en la clase y se pone directamente el nodo del profesor
        else {
            let tr = {
                x: 160,
                y: this.CANVAS_HEIGHT * 0.51,
                scale: this.scale * 1.4
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar3').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row1Chairs.depth);

            tr = {
                x: 680,
                y: this.CANVAS_HEIGHT * 0.55,
                scale: this.scale * 1.4
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar2').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row1Chairs.depth);

            tr = {
                x: 1150,
                y: this.CANVAS_HEIGHT * 0.55,
                scale: this.scale * 1.4
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar1').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row1Chairs.depth);


            tr = {
                x: 280,
                y: this.CANVAS_HEIGHT * 0.54,
                scale: this.scale * 1
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar8').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row2Chairs.depth);

            tr = {
                x: 720,
                y: this.CANVAS_HEIGHT * 0.54,
                scale: this.scale * 1
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar10').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row2Chairs.depth);

            tr = {
                x: 1060,
                y: this.CANVAS_HEIGHT * 0.54,
                scale: this.scale * 1.1
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar11').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row2Chairs.depth);


            tr = {
                x: 1560,
                y: this.CANVAS_HEIGHT * 0.52,
                scale: this.scale * 0.9
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar7').setOrigin(0, 0).setScale(-tr.scale, tr.scale).setDepth(this.row3Chairs.depth);

            tr = {
                x: 1030,
                y: this.CANVAS_HEIGHT * 0.52,
                scale: this.scale * 0.8
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar5').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row3Chairs.depth);


            tr = {
                x: 510,
                y: this.CANVAS_HEIGHT * 0.49,
                scale: this.scale * 0.76
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar9').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row4Chairs.depth);


            let nodes = this.cache.json.get('classFrontMorningDay1');
            let teacherNode = super.readNodes(nodes, "day1\\classFrontMorningDay1", "teacher", true);
            setTimeout(() => {
                this.dialogManager.setNode(teacherNode);                
            }, 50);
        }


        // Evento llamado cuando terminan los dialogos y empieza la clase
        this.dispatcher.addOnce("startClass", this, (obj) => {
            let sceneName = 'TextOnlyScene';

            // Se obtiene el texto de la escena de transicion del archivo de traducciones 
            let text = this.i18next.t("day1.startClass", { ns: "transitionScenes", returnObjects: true });
            if (this.gameManager.getValue("isLate")) {
                text = this.i18next.t("day1.startClassLate", { ns: "transitionScenes", returnObjects: true });
            }

            let params = {
                text: text,
                onComplete: () => {
                    this.gameManager.changeScene('ClassBackMorningDay1');
                },
                onCompleteDelay: 500
            };

            // Se cambia a la escena de transicion
            this.gameManager.changeScene(sceneName, params);
        });
    }
}

class ClassBackBase extends BaseScene {
    /**
     * Escena base para el fondo de la clase. Coloca los elementos que se mantienen igual todos los dias
     * @extends BaseScene
     * @param {String} name - id de la escena
     */
    constructor(name) {
        super(name, 'classBack');
    }
    
    create(params) {
        super.create(params);

        this.corridor = "";

        // Pone la imagen de fondo con las dimensiones del canvas
        let bg = this.add.image(0, 0, 'classBackBg').setOrigin(0, 0);
        this.scale = this.CANVAS_HEIGHT / bg.height;
        bg.setScale(this.scale);

        this.rightBound = bg.displayWidth;


        // Puerta al pasillo
        let doorPos = {
            x: 2224 * this.scale,
            y: 530 * this.scale
        };
        this.doorNode = null;
        let doorClosed = this.add.image(doorPos.x, doorPos.y, this.atlasName, 'classDoorClosed').setOrigin(0, 0).setScale(this.scale);
        let doorOpened = this.add.image(doorPos.x, doorPos.y, this.atlasName, 'classDoorOpened').setOrigin(0, 0).setScale(this.scale);
        // Al hacer click, si hay algun dialogo que mostrar (para indicar que no se puede salir), se
        // mostrara. En caso contrario, se pasara a la escena del pasillo y se elimina esta escena
        super.toggleDoor(doorClosed, doorOpened, () => {
            this.gameManager.interacted("classDoor", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .send();
            if (this.doorNode) {
                this.dialogManager.setNode(this.doorNode);
            }
            else {
                let params = {
                    camPos: "left"
                };
                this.gameManager.changeScene(this.corridor, params);
            }
        }, false);


        // Primera fila de sillas y mesas
        this.row1Chairs = this.add.image(0, 0, 'backRow1Chairs').setOrigin(0, 0).setScale(this.scale);
        this.row1Tables = this.add.image(0, 0, 'backRow1Tables').setOrigin(0, 0).setScale(this.scale);

        // Segunda fila de sillas y mesas
        this.row2Chairs = this.add.image(0, 0, 'backRow2Chairs').setOrigin(0, 0).setScale(this.scale);
        this.row2Tables = this.add.image(0, 0, 'backRow2Tables').setOrigin(0, 0).setScale(this.scale);

        // Tercera fila de sillas y mesas
        this.row3Chairs = this.add.image(0, 0, 'backRow3Chairs').setOrigin(0, 0).setScale(this.scale);
        this.row3Tables = this.add.image(0, 0, 'backRow3Tables').setOrigin(0, 0).setScale(this.scale);

        // Cuarta fila de sillas y mesas
        this.row4Chairs = this.add.image(0, 0, 'backRow4Chairs').setOrigin(0, 0).setScale(this.scale);
        this.row4Tables = this.add.image(0, 0, 'backRow4Tables').setOrigin(0, 0).setScale(this.scale);

        // Quinta fila de sillas y mesas
        this.row5Chairs = this.add.image(0, 0, 'backRow5Chairs').setOrigin(0, 0).setScale(this.scale);
        this.row5Tables = this.add.image(0, 0, 'backRow5Tables').setOrigin(0, 0).setScale(this.scale);


        // Se recolocan las filas para que las mesas esten por debajo de las 
        // sillas y las filas del fondo esten por debajo de las filas del frente
        this.row1Tables.setDepth(1);
        this.row1Chairs.setDepth(this.row1Tables.depth + 1);

        this.row2Tables.setDepth(this.row1Chairs.depth + 1);
        this.row2Chairs.setDepth(this.row2Tables.depth + 1);

        this.row3Tables.setDepth(this.row2Chairs.depth + 1);
        this.row3Chairs.setDepth(this.row3Tables.depth + 1);

        this.row4Tables.setDepth(this.row3Chairs.depth + 1);
        this.row4Chairs.setDepth(this.row4Tables.depth + 1);

        this.row5Tables.setDepth(this.row4Chairs.depth + 1);
        this.row5Chairs.setDepth(this.row5Tables.depth + 1);

        let picPos = {
            x: 735,
            y: 365,
            scale: this.scale * 1.8
        };
        this.blackboardPics = [
            this.add.image(picPos.x, picPos.y, this.atlasName, 'blackboardPic1').setOrigin(0.5, 0.5).setScale(picPos.scale),
            this.add.image(picPos.x, picPos.y, this.atlasName, 'blackboardPic2').setOrigin(0.5, 0.5).setScale(picPos.scale),
            this.add.image(picPos.x, picPos.y, this.atlasName, 'blackboardPic3').setOrigin(0.5, 0.5).setScale(picPos.scale)
        ];
        for (let i = 0; i < this.blackboardPics.length; i++) {
            this.blackboardPics[i].visible = false;
        }
    }
}

class ClassBackMorningDay1 extends ClassBackBase {
    constructor() {
        super('ClassBackMorningDay1');
    }

    create(params) {
        super.create(params);

        // Imagenes de la puerta (para bloquear la interaccion y poder mostrarlas/ocultarlas)
        let doorPos = {
            x: 2224 * this.scale,
            y: 530 * this.scale
        };
        let doorClosed = this.add.image(doorPos.x, doorPos.y, this.atlasName, 'classDoorClosed').setOrigin(0, 0).setScale(this.scale).setInteractive();
        let doorOpened = this.add.image(doorPos.x, doorPos.y, this.atlasName, 'classDoorOpened').setOrigin(0, 0).setScale(this.scale).setInteractive();
        doorOpened.visible = false;

        this.blackboardPics[2].visible = true;


        // Profesor
        let tr = {
            x: this.rightBound / 2,
            y: this.CANVAS_HEIGHT * 0.37,
            scale: 0.07
        };
        let teacher = this.add.image(tr.x, tr.y, 'teacherChar').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row1Tables.depth - 1);
        let teacherPortrait = this.add.image(this.portraitTr.x, this.portraitTr.y + 20, 'teacherChar').setOrigin(0.5, 1).setScale(this.portraitTr.scale);
        this.portraits.set("teacherChar", teacherPortrait);


        // Personajes de fondo
        tr = {
            x: this.rightBound * 0.45,
            y: this.CANVAS_HEIGHT * 0.65,
            scale: this.scale * 0.8
        };
        this.add.image(tr.x, tr.y, this.atlasName, 'backChar8').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row4Chairs.depth - 1);

        tr = {
            x: this.rightBound * 0.725,
            y: this.CANVAS_HEIGHT * 0.675,
            scale: this.scale * 0.8
        };
        this.add.image(tr.x, tr.y, this.atlasName, 'backChar12').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row4Chairs.depth - 1);


        tr = {
            x: 60,
            y: this.CANVAS_HEIGHT * 0.62,
            scale: this.scale * 0.6
        };
        this.add.image(tr.x, tr.y, this.atlasName, 'backChar4').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row3Chairs.depth - 1);

        tr = {
            x: this.rightBound * 0.26,
            y: this.CANVAS_HEIGHT * 0.62,
            scale: this.scale * 0.6
        };
        this.add.image(tr.x, tr.y, this.atlasName, 'backChar10').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row3Chairs.depth - 1);

        tr = {
            x: this.rightBound * 0.46,
            y: this.CANVAS_HEIGHT * 0.62,
            scale: this.scale * 0.53
        };
        this.add.image(tr.x, tr.y, this.atlasName, 'backChar2').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row3Chairs.depth - 1);

        tr = {
            x: this.rightBound * 0.655,
            y: this.CANVAS_HEIGHT * 0.625,
            scale: this.scale * 0.6
        };
        this.add.image(tr.x, tr.y, this.atlasName, 'backChar3').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row3Chairs.depth - 1);


        tr = {
            x: this.rightBound * 0.61,
            y: this.CANVAS_HEIGHT * 0.585,
            scale: this.scale * 0.53
        };
        this.add.image(tr.x, tr.y, this.atlasName, 'backChar9').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row2Chairs.depth - 1);


        tr = {
            x: this.rightBound * 0.18,
            y: this.CANVAS_HEIGHT * 0.58,
            scale: this.scale * 0.45
        };
        this.add.image(tr.x, tr.y, this.atlasName, 'backChar7').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row1Chairs.depth - 1);

        tr = {
            x: this.rightBound * 0.27,
            y: this.CANVAS_HEIGHT * 0.58,
            scale: this.scale * 0.45
        };
        this.add.image(tr.x, tr.y, this.atlasName, 'backChar11').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row1Chairs.depth - 1);

        tr = {
            x: this.rightBound * 0.44,
            y: this.CANVAS_HEIGHT * 0.58,
            scale: this.scale * 0.45
        };
        this.add.image(tr.x, tr.y, this.atlasName, 'backChar15').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row1Chairs.depth - 1);



        // Se desactiva el icono del telefono para que no se pueda sacar durante esta escena
        this.phoneManager.activate(false);

        // Al iniciar la escena, se pone el dialogo directamente con un poco de retardo
        let nodes = this.cache.json.get('classBackMorningDay1');
        setTimeout(() => {
            let node = super.readNodes(nodes, "day1\\classBackMorningDay1", "beforeEnter", true);
            this.dialogManager.setNode(node);
        }, 500);


        // Evento llamado cuando el profesor termina su primer dialogo
        this.dispatcher.addOnce("enterClass", this, (obj) => {
            // Se abre la puerta y se pone una mascara a la derecha tapando lo que hay detras ede la pared
            doorClosed.visible = false;
            doorOpened.visible = true;
            let rectangle = this.add.rectangle(doorPos.x + doorOpened.displayWidth * 0.77, doorPos.y, doorOpened.displayWidth * 2, doorOpened.displayHeight, 0xfff, 0).setOrigin(0, 0);
            let mask = rectangle.createGeometryMask();
            mask.invertAlpha = true;

            // Alex de lado caminando
            tr = {
                x: doorPos.x + 160,
                y: doorPos.y + doorOpened.displayHeight * 0.95,
                scale: 0.07
            };
            let alex = new Character(this, "Alex_side", tr, this.portraitTr, () => { });
            alex.setScale(-tr.scale, tr.scale);
            alex.setDepth(this.row1Tables.depth - 1);
            alex.setAnimation("Walk", true);
            alex.charContainer.setMask(mask);
            alex.setAnimSpeed(0.6);
            alex.portrait.visible = false;


            // Animacion de Alex entrando a la clase
            let finalX = tr.x - 380;
            let walkingIn = this.tweens.add({
                targets: [alex.char],
                x: { from: tr.x, to: finalX },
                duration: 4000,
                repeat: 0,
            });

            // Cuando termina la animacion,
            walkingIn.on('complete', () => {
                // Se oculta la espina de Alex de perfil
                alex.setActive(false);

                // Alex de frente
                tr = {
                    x: finalX,
                    y: tr.y + 10,
                    scale: tr.scale
                };
                alex = new Character(this, "Alex_front", tr, this.portraitTr, () => { });
                alex.setScale(-tr.scale, tr.scale);
                alex.setDepth(this.row1Tables.depth - 1);
                alex.setAnimation("IdleBase", true);
                this.portraits.set("Alex", alex.getPortrait());

                // Se actualiza el dialogManager con el nuevo retrato
                this.dialogManager.changeScene(this);

                // Se ponen los dialogos que hay despues de que Alex entre en clase
                let node = super.readNodes(nodes, "day1\\classBackMorningDay1", "afterEnter", true);
                this.dialogManager.setNode(node);

            });

        });


        // Evento llamado cuando el profesor termina su segundo dialogo
        this.dispatcher.addOnce("startBreak", this, (obj) => {
            let sceneName = 'TextOnlyScene';

            // Se obtiene el texto de la escena de transicion del archivo de traducciones 
            let text = this.i18next.t("day1.startBreak", { ns: "transitionScenes", returnObjects: true });

            let params = {
                text: text,
                onComplete: () => {
                    this.gameManager.changeScene('ClassBackBreakDay1');
                },
                onCompleteDelay: 500
            };

            // Se cambia a la escena de transicion
            this.gameManager.changeScene(sceneName, params);

            // Se reactiva el icono del telefono
            this.phoneManager.activate(true);
        });
    }
}

class ClassBackBreakDay1 extends ClassBackBase {
    constructor() {
        super('ClassBackBreakDay1');
    }

    create(params) {
        super.create(params);

        this.corridor = "CorridorBreakDay1";

        // Cambia la hora del movil
        this.phoneManager.setDayInfo("startBreak");


        // Imagen de la puerta (para bloquear la interaccion)
        let doorPos = {
            x: 2224 * this.scale,
            y: 530 * this.scale
        };
        let doorClosed = this.add.image(doorPos.x, doorPos.y, this.atlasName, 'classDoorClosed').setOrigin(0, 0).setScale(this.scale).setInteractive();
        doorClosed.setInteractive();


        // Personajes
        let tr = {
            x: this.rightBound * 0.33,
            y: this.CANVAS_HEIGHT * 1.12,
            scale: 0.12
        };
        let alison = new Character(this, "Alison", tr, this.portraitTr, () => {
            this.dialogManager.setNode(alisonNode);
        });
        alison.setAnimation("IdleBase", true);
        this.portraits.set("Alison", alison.getPortrait());
        alison.setScale(-tr.scale, tr.scale);
        alison.setDepth(this.row5Chairs.depth + 1);

        tr = {
            x: this.rightBound * 0.78,
            y: this.CANVAS_HEIGHT * 0.69,
            scale: 0.07
        };
        let alex = new Character(this, "Alex_front", tr, this.portraitTr, () => {
            this.dialogManager.setNode(alexNode);

         });
        alex.setScale(-tr.scale, tr.scale);
        alex.setDepth(this.row1Tables.depth - 1);
        alex.setAnimation("IdleBase", true);
        this.portraits.set("Alex", alex.getPortrait());


        let nodes = this.cache.json.get('classBackBreakDay1');
        let alexNode = super.readNodes(nodes, "day1\\classBackBreakDay1", "alex", true);
        let alisonNode = super.readNodes(nodes, "day1\\classBackBreakDay1", "alison", true);
        this.doorNode = super.readNodes(nodes, "day1\\classBackBreakDay1", "door", true);


        // Eventos llamados cuando se termina de hablar con Alex
        this.dispatcher.addOnce("moveAlex", this, (obj) => {
            alex.char.disableInteractive();
            let anim = this.tweens.add({
                targets: [alex.char],
                alpha: { from: 1, to: 0 },
                duration: 500,
                repeat: 0,
            });

            anim.on('complete', () => {
                tr = {
                    x: this.rightBound * 0.84,
                    y: this.CANVAS_HEIGHT * 0.74,
                };
                alex.setPosition(tr.x, tr.y);

                anim = this.tweens.add({
                    targets: [alex.char],
                    alpha: { from: 0, to: 1 },
                    duration: 500,
                    repeat: 0,
                });
                alex.setScale(-0.08, 0.08);
                anim.on('complete', () => {
                    alex.char.setInteractive();
                    doorClosed.visible = false;
                    doorClosed.disableInteractive();
                });
            });
        });
        this.dispatcher.addOnce("leaveAlex", this, (obj) => {
            alex.char.disableInteractive();
            let anim = this.tweens.add({
                targets: [alex.char],
                alpha: { from: 1, to: 0 },
                duration: 500,
                repeat: 0,
            });
            anim.on('complete', () => {
                doorClosed.visible = false;
                doorClosed.disableInteractive();
            });
        });

        // Evento llamado cuando se termina de hablar con Alison
        this.dispatcher.addOnce("setTalkedAlison", this, (obj) => {
            this.doorNode = null;
        });



        // Personajes de fondo
        tr = {
            x: this.rightBound * 0.46,
            y: this.CANVAS_HEIGHT * 0.62,
            scale: this.scale * 0.53
        };
        this.add.image(tr.x, tr.y, this.atlasName, 'backChar2').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row3Chairs.depth - 1);

        tr = {
            x: this.rightBound * 0.655,
            y: this.CANVAS_HEIGHT * 0.625,
            scale: this.scale * 0.6
        };
        this.add.image(tr.x, tr.y, this.atlasName, 'backChar3').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row3Chairs.depth - 1);

        tr = {
            x: this.rightBound * 0.61,
            y: this.CANVAS_HEIGHT * 0.585,
            scale: this.scale * 0.53
        };
        this.add.image(tr.x, tr.y, this.atlasName, 'backChar9').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row2Chairs.depth - 1);
        
        tr = {
            x: this.rightBound * 0.18,
            y: this.CANVAS_HEIGHT * 0.58,
            scale: this.scale * 0.45
        };
        this.add.image(tr.x, tr.y, this.atlasName, 'backChar7').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row1Chairs.depth - 1);

    }
}

class CorridorBreakDay1 extends CorridorBase {
    constructor() {
        super('CorridorBreakDay1');
    }

    create(params) {
        super.create(params);

        this.stairs = "StairsBreakDay1";
        this.class = "PlaygroundAfternoonDay1";
        this.classChangeParams = {
            camPos: "right"
        };
        
        // Cambia la hora del movil
        this.phoneManager.setDayInfo("midBreak");
        

        // Personajes
        let tr = {
            x: 380,
            y: this.CANVAS_HEIGHT * 0.65,
            scale: 0.051
        };
        let maria = new Character(this, "Maria", tr, this.portraitTr, () => {
            this.dialogManager.setNode(mariaNode);
        });
        maria.setAnimation("IdleBase", true);
        this.portraits.set("Maria", maria.getPortrait());
        
        tr = {
            x: 180,
            y: this.CANVAS_HEIGHT * 0.84,
            scale: 0.105
        };
        let alison = new Character(this, "Alison", tr, this.portraitTr, () => {
            this.dialogManager.setNode(alisonNode);
        });
        alison.setScale(-tr.scale, tr.scale);
        alison.setAnimation("IdleBase", true);
        this.portraits.set("Alison", alison.getPortrait());
        alison.char.visible = false;

        let nodes = this.cache.json.get('corridorBreakDay1');
        let mariaNode = super.readNodes(nodes, "day1\\corridorBreakDay1", "maria", true);
        let alisonNode = super.readNodes(nodes, "day1\\corridorBreakDay1", "alison", true);
        let phoneNode = super.readNodes(nodes, "day1\\corridorBreakDay1", "phone", true);

        nodes = this.cache.json.get('everydayDialog');
        this.classNode = super.readNodes(nodes, "everydayDialog", "corridor.class", true);
        
        let chatName = this.i18next.t("textMessages.chat1", { ns: "phoneInfo", returnObjects: true });
        this.phoneManager.phone.addChat(chatName, "Alison");
        this.phoneManager.phone.setChatNode(chatName, phoneNode);


        // Al salir a las escaleras, aparece Alison
        this.stairsDoor.once('pointerdown', () => {
            this.gameManager.interacted("stairsDoor", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .send();
            alison.char.visible = true;
        });
        
        // Evento que se llama cuando se le devuelve el pendiente a Alison. La hace desaparecer con una animacion
        this.dispatcher.addOnce("alisonEnter", this, (obj) => {
            alison.char.disableInteractive();
            this.tweens.add({
                targets: [alison.char],
                alpha: { from: 1, to: 0 },
                duration: 1000,
                repeat: 0,
            });
        });
        
    }

    
}

class StairsBreakDay1 extends StairsBase {
    constructor() {
        super('StairsBreakDay1');
    }

    create(params) {
        super.create(params);

        this.playground = "PlaygroundBreakDay1";
        this.corridor = "CorridorBreakDay1";

        // Cambia la hora del movil
        this.phoneManager.setDayInfo("endBreak");
    }
}

class PlaygroundBreakDay1 extends PlaygroundBase {
    constructor() {
        super('PlaygroundBreakDay1');
    }

    create(params) {
        super.create(params);

        this.home = "";
        this.stairs = "StairsBreakDay1";
        
        // Se abren las puertas 
        super.openDoors();
        this.doorNode = null;

        // Personajes
        let tr = {
            x: 280,
            y: this.CANVAS_HEIGHT * 0.92,
            scale: 0.062
        };
        let ana = new Character(this, "Ana", tr, this.portraitTr, () => {
            this.dialogManager.setNode(anaNode);
        });
        ana.setScale( -tr.scale, tr.scale);
        ana.setAnimation("IdleBase", true);
        this.portraits.set("Ana", ana.getPortrait());

        tr = {
            x: this.rightBound * 0.34,
            y: this.CANVAS_HEIGHT * 1.17,
            scale: 0.1
        };
        let guille = new Character(this, "Guille", tr, this.portraitTr, () => {
            this.dialogManager.setNode(guilleNode);
        });
        guille.setScale( -tr.scale, tr.scale);
        guille.setAnimation("IdleBase", true);
        this.portraits.set("Guille", guille.getPortrait());


        // Pendiente con sus animaciones
        tr = {
            x: this.rightBound * 0.88,
            y: this.CANVAS_HEIGHT * 0.92,
            scale: 0.5
        };
        let earring = this.add.image(tr.x, tr.y, 'earring').setScale(tr.scale);
        // La rotacion se tiene que hacer con un twen de contador
        this.tweens.addCounter({
            targets: [earring],
            duration: 500,
            repeat: -1,
            onUpdate: (tween) => {
                earring.rotation += 0.005;
            },
        });
        this.tweens.add({
            targets: [earring],
            scale: tr.scale - 0.2,
            duration: 500,
            repeat: -1,
            yoyo: true,
        });
        earring.setInteractive();
        earring.on('pointerdown', () => {
            this.gameManager.interacted("earring", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .send();
            this.dialogManager.setNode(earringNode);
        });

        let nodes = this.cache.json.get('playgroundBreakDay1');
        let anaNode = super.readNodes(nodes, "day1\\playgroundBreakDay1", "ana", true);
        let guilleNode = super.readNodes(nodes, "day1\\playgroundBreakDay1", "guille", true);
        let earringNode = super.readNodes(nodes, "day1\\playgroundBreakDay1", "earring", true);
        
        nodes = this.cache.json.get('everydayDialog');
        this.homeNode = super.readNodes(nodes, "everydayDialog", "playground.homeBreak", true);



        // Evento que se llama al recoger el pendiente. Lo hace desaparecer con una
        // animacion (la variable de coger el pendiente la cambia el propio evento)
        this.dispatcher.addOnce("pickEarring", this, (obj) => {
            earring.disableInteractive();
            let anim = this.tweens.add({
                targets: [earring],
                alpha: { from: 1, to: 0 },
                duration: 500,
                repeat: 0,
            });
        });
        
    }
}

class PlaygroundAfternoonDay1 extends PlaygroundBase {
    constructor() {
        super('PlaygroundAfternoonDay1');
    }

    create(params) {
        super.create(params);

        this.home = "LivingroomAfternoonDay1";

        // Cambia la hora del movil
        this.phoneManager.setDayInfo("endClass");

        let nodes = this.cache.json.get('everydayDialog');
        this.doorNode = super.readNodes(nodes, "everydayDialog","playground.doorAfternoon", true);
    }
}

class LivingroomAfternoonDay1 extends LivingroomBase {
    constructor() {
        super('LivingroomAfternoonDay1');
    }

    create(params) {
        super.create(params);

        this.bedroom = "BedroomAfternoonDay1";
        this.playground = "";

        // Cambia la hora del movil
        this.phoneManager.setDayInfo("returnHome");

        // Personajes
        let tr = {
            x: this.rightBound * 0.56,
            y: this.CANVAS_HEIGHT * 0.945,
            scale: 0.16
        };
        let mom = new Character(this, "mom", tr, this.portraitTr, () => {
            this.dialogManager.setNode(momNode);
        });
        mom.setAnimation("IdleBase", true);
        this.portraits.set("mom", mom.getPortrait());

        tr = {
            x: this.rightBound * 0.49,
            y: this.CANVAS_HEIGHT * 0.93,
            scale: 0.17
        };
        let dad = new Character(this, "dad", tr, this.portraitTr, () => {
            this.dialogManager.setNode(dadNode);
        });
        dad.setAnimation("IdleBase", true);
        this.portraits.set("dad", dad.getPortrait());

        let nodes = this.cache.json.get('livingroomAfternoonDay1');
        let momNode = super.readNodes(nodes, "day1\\livingroomAfternoonDay1", "mom", true);
        let dadNode = super.readNodes(nodes, "day1\\livingroomAfternoonDay1", "dad", true);

        nodes = this.cache.json.get('everydayDialog');
        this.doorNode = super.readNodes(nodes, "everydayDialog", "livingroom.doorAfternoon", true);

        
        // Prepara las tandas de opciones. Solo se hace una vez, 
        // y quita de las opciones aquellas que no se puedan elegir
        this.dispatcher.addOnce("prepareChoices1", this, (obj) => {
            // Si no se ha conocido a Guille, se quita la opcion para hablar de el
            if (!this.gameManager.getValue("metGuille")) {
                this.dialogManager.activateOptions(false, () => {
                    let node = this.dialogManager.currNode;
                    node.choices.splice(1, 1);
                    node.next.splice(1, 1);

                    this.dialogManager.setTalking(false);
                    this.dialogManager.setNode(node);
                }, 0, true);
            }
        });
        
        this.dispatcher.addOnce("prepareChoices2", this, (obj) => {
            // Si no se ha conocido a Jose, se quita la opcion para hablar de el
            // No se comprueba si se ha hablado de Alison porque hay que hablar con ella si o si
            if (!this.gameManager.getValue("metJose")) {
                this.dialogManager.activateOptions(false, () => {
                    let node = this.dialogManager.currNode;
                
                    node.choices.splice(1, 1);
                    node.next.splice(1, 1);

                    this.dialogManager.setTalking(false);
                    this.dialogManager.setNode(node);
                }, 0, true);
            }
        });
        
        this.dispatcher.addOnce("prepareChoices3", this, (obj) => {
            // Si no se ha conocido a Maria, se quita la opcion para hablar de ella
            // No se comprueba si se ha hablado de Alex porque hay que hablar con el si o si
            if (!this.gameManager.getValue("metMaria")) {
                this.dialogManager.activateOptions(false, () => {
                    let node = this.dialogManager.currNode;
                
                    node.choices.splice(0, 1);
                    node.next.splice(0, 1);

                    this.dialogManager.setTalking(false);
                    this.dialogManager.setNode(node);
                }, 0, true);
            }
        });

        this.dispatcher.addOnce("prepareChoices4", this, (obj) => {
            // Si no se ha conocido a Ana, se quita la opcion para hablar de ella
            if (!this.gameManager.getValue("metAna")) {
                this.dialogManager.activateOptions(false, () => {
                    let node = this.dialogManager.currNode;
                
                    node.choices.splice(0, 1);
                    node.next.splice(0, 1);

                    this.dialogManager.setTalking(false);
                    this.dialogManager.setNode(node);
                }, 0, true);
            }
        });
    }

}

class BedroomAfternoonDay1 extends BedroomBase {
    constructor() {
        super('BedroomAfternoonDay1');
    }

    create(params) {
        super.create(params);

        this.livingroom = "LivingroomAfternoonDay1";

        // Cambia la hora del movil
        this.phoneManager.setDayInfo("night");
        
        // Crer la informacion correspondiente en el ordenador
        this.socialNetwork.addDailyRequests(1);
        this.socialNetwork.createDailyPosts(1);

        let nodes = this.cache.json.get('bedroomAfternoonDay1');

        // Dialogos del interior del armario y la cama
        this.wardrobe1Node = super.readNodes(nodes, "day1\\bedroomAfternoonDay1", "wardrobe1", true);
        this.wardrobe2Node = super.readNodes(nodes, "day1\\bedroomAfternoonDay1", "wardrobe2", true);
        nodes = this.cache.json.get('everydayDialog');

        // Mochila
        let bagNode = super.readNodes(nodes, "everydayDialog", "bedroom.bagAfternoon", true);
        let bag = this.add.image(1900 * this.scale, 1035 * this.scale, this.atlasName, 'bag').setOrigin(0, 0).setScale(-this.scale * 0.9, this.scale * 0.9);
        bag.setInteractive({ useHandCursor: true });
        bag.on('pointerdown', () => {
            this.gameManager.interacted("bag", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .send();
            this.dialogManager.setNode(bagNode);
        });

        // Cama
        this.bedNode = super.readNodes(nodes, "everydayDialog", "bedroom.bedAfternoon", true);

        // Ordenador (el mismo nodo que el de por la manana, pero sin el dialogo del jugador)
        let node = super.readNodes(nodes, "everydayDialog", "bedroom.pc", true);
        node = node.next[0];
        this.pcNode = node;

        // Ropa
        this.add.image(852 * this.scale + 1, 848 * this.scale - 1, this.atlasName, 'bedroomJacket').setOrigin(0, 0).setScale(this.scale);
        this.add.image(2899 * this.scale + 1, 1296 * this.scale - 1, this.atlasName, 'clothes1').setOrigin(0, 0).setScale(this.scale).setDepth(this.bed + 1);
        this.add.image(2704 * this.scale + 1, 963 * this.scale - 1, this.atlasName, 'clothes2').setOrigin(0, 0).setScale(this.scale).setDepth(this.bed + 1);
        this.add.image(2061 * this.scale + 1, 928 * this.scale - 1, this.atlasName, 'clothes3').setOrigin(0, 0).setScale(this.scale);

        // Mensajes del movil
        nodes = this.cache.json.get('bedroomAfternoonDay1');
        let phoneNode = super.readNodes(nodes, "day1\\bedroomAfternoonDay1", "phone", true);
        let chatName = this.i18next.t("textMessages.chat1", { ns: "phoneInfo", returnObjects: true });
        this.phoneManager.phone.setChatNode(chatName, phoneNode);
    }
}

class NightmareBase extends BaseScene {
    /**
     * Escena base para las pesadillas. Coloca los elementos que se mantienen igual todos los dias
     * @extends BaseScene
     * @param {Number} day - numero de dia (a partir de el se configura el nombre de la escena y se obtienen los dialogos)
     */
    constructor(day) {
        super('NightmareDay' + day, 'nightmaresElements');

        this.day = day;
    }

    create(params) {
        super.create(params);

        // Se oculta el telefono y el icono
        this.phoneManager.activate(false);

        // Se coloca la imagen del fondo centrada con el tam del canvas
        this.bg = this.add.image(this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2, 'nightmaresBg').setOrigin(0.5);
        this.scale = this.CANVAS_HEIGHT / this.bg.height;
        this.bg.setScale(this.scale);

        // No se puede hacer scroll
        this.rightBound = this.CANVAS_WIDTH;

        // Archivo con la estructura del dialogo (a partir del dia)
        this.file = this.cache.json.get('nightmareDay' + this.day);
        // Namespace con los textos localizados (a partir del dia)
        this.ns = 'day' + this.day + '\\nightmareDay' + this.day;
    }

    /**
    * Lee y conecta los nodos a partir del nombre dado usando el namespace y el archivo de la pesadilla correspondiente
    */
    readNodes(objectName) {
        return super.readNodes(this.file, this.ns, objectName, true);
    }
}

class NightmareMinigame extends NightmareBase {
    /**
     * Clase base para todas las pesadillas que funcionan como minijuegos, es decir,
     * para las de los cuatro primeros dias
     * Se encarga de todo lo relativo a la sombra y tiene metodos para el flujo del minijuego
     * @param {Number} day - numero de dia (a partir de el se configura el nombre de la escena y se obtienen todos los dialogos)
     * @param {Boolean} left - indica si la sombra debe colocarse en la izquierda (true) o en la derecha (false) 
     */
    constructor(day, left) {
        super(day);

        this.left = left;
    }

    create(params) {
        super.create(params);

        this.portraitOffset = {
            x: 0,
            y: 63,
            scale: 1.6
        };

        // Se crea la sombra, su retrato y los nodos con sus dialogos
        this.shadow = this.createShadow();

        // Se hace un fade in de la camara y cuando termina, se inicia el dialogo
        this.cameras.main.fadeIn(500, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, (cam, effect) => {
            setTimeout(() => {
                // Se inicia el dialogo introductorio de la sombra
                this.dialogManager.setNode(this.shadow.intro);
            }, 500);
        });


        // Se produce este evento despues de la introduccion
        let introEvent = 'startNightmare' + this.day;
        this.dispatcher.add(introEvent, this, () => {
            // Desparece la sombra
            this.shadow.char.setVisible(false);
            // Se inicia el minijuego
            this.onMinigameStarts();
        });

        // Se produce este evento despues del monologo final
        let outroEvent = 'finishNightmare' + this.day;
        this.dispatcher.add(outroEvent, this, () => {
            // Se hace un fade out de la camara y cuando termina, se cambia a la escena de la alarma
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, (cam, effect) => {
                setTimeout(() => {
                    // Se puede volver a usar el telefono
                    this.phoneManager.activate(true);
                    this.gameManager.changeScene("AlarmScene");
                }, 500);
            });
        });
    }

    /**
     * Crea objetos centradas respecto a un offset a los lados
     * @param {Number} y - posicion y donde se crean los objetos 
     * @param {Number} nItems - numero de objetos que se crean
     * @param {Number} sideOffset - distancia que se deja a cada lado respecto al ancho del canvas
     * @param {Object} object - objeto modelo 
     *                              Importante: tiene que tener definida la propieda w (ancho del objeto) y la funcion clone (clonar el objeto)
     */
    createCenteredObjects(y, nItems, sideOffset, object) {
        let objects = [];

        if (nItems > 0) {
            // El ancho donde colocar los objetos es el ancho del canvas menos el offset a cada lado y 
            // la mitad del objeto a cada a cada lado para que no se salga de los bordes
            let areaWidth = this.CANVAS_WIDTH - sideOffset * 2 - object.w;
            let posX = areaWidth / (nItems - 1);

            // Se crean y colocan cada uno de los objetos
            for (let i = 0; i < nItems; ++i) {
                let x = posX * i + sideOffset + object.w / 2;
                let clonedObject = object.clone();
                clonedObject.x = x;
                clonedObject.y = y;
                objects.push(clonedObject);
            }
        }
        // Se destruye el objeto modelo
        object.destroy();

        // Se devuelven los objetos creados
        return objects;
    }

    /**
     * Se encarga de crear el personaje, el retrato y los dialogos de la sombra
     * @returns {Object} - personaje, retrato y dialogos de la sombra
     */
    createShadow() {
        let blackColor = '#000000';
        let charName = 'shadow';

        // Por defecto esta colocado en la izquierda mirando hacia la derecha
        // Sombra
        let offset = 40;

        let tr = {
            x: offset,
            y: offset,
            scale: 0.48
        };
        let shadow = this.createCharFromImage(tr, 'AlexChar', null, null, charName);

        shadow.char.setOrigin(0).setDepth(2);
        //shadow.char.setVisible(false);

        shadow.char.setTint(blackColor);
        shadow.portrait.setTint(blackColor);

        // Se va a colocar en la derecha mirando hacia la izquierda
        if (this.left !== undefined && this.left === false) {
            shadow.char.x = this.CANVAS_WIDTH - shadow.char.displayWidth - offset;
            // Se rota la imagen (si es un frame de un atlas tb afecta al origen)
            shadow.char.flipX = true;
            shadow.portrait.flipX = true;
        }

        shadow.intro = this.readNodes(charName + '.introduction');
        shadow.outro = this.readNodes(charName + '.outro');

        return shadow;
    }

    /**
     * 
     * @param {Object} tr - posicion y escala del personaje 
     * @param {String} sprite - sprite del personaje
     * @param {String} atlas - atlas de donde obtener la imagen (opcional)
     * @param {Object} portraitOffset - desplazamiento de la posicion y la escala respecto a la por defecto
     *                                  (opcional, sino se usa la por defecto)
     * @param {String} portraitName - nombre con el guardar el retrato del personaje (opcional, sino se usa el nombre del sprite) 
     * @returns {Object} - personaje y retrato
     */
    createCharFromImage(tr, sprite, atlas, portraitOffset, portraitName) {
        // Si no se ha indicado ningun offset, se usa el por defecto
        if (!portraitOffset) {
            portraitOffset = this.portraitOffset;
        }

        let char = null;
        let portrait = null;
        let portraitPos = {
            x: this.portraitTr.x + portraitOffset.x,
            y: this.portraitTr.y + portraitOffset.y
        };

        if (atlas) {
            char = this.add.image(tr.x, tr.y, atlas, sprite);
            portrait = this.add.image(portraitPos.x, portraitPos.y, atlas, sprite);
        }
        else {
            char = this.add.image(tr.x, tr.y, sprite);
            portrait = this.add.image(portraitPos.x, portraitPos.y, sprite);
        }

        char.setScale(tr.scale);

        // Se situa en este origen porque es el unico que tienen las animaciones esqueletales
        portrait.setOrigin(0.5, 1);
        portrait.setScale(this.portraitTr.scale * portraitOffset.scale);

        let name = sprite;
        // Si se indica un nombre para el retrato, se usa ese
        if (portraitName) {
            name = portraitName;
        }
        this.portraits.set(name, portrait);

        return { char: char, portrait: portrait }
    }

    /**
     * Metodo abstracto
     * Hay que sobrescribirlo con la logica del minijuego
     */
    onMinigameStarts() {
        throw new Error('You have to implement the method onMinigameStarts!');
    }

    /**
     * Hay que llamarlo una vez se ha terminado el minijuego
     */
    onMinigameFinishes() {
        // Se inicia el dialogo con el texto final de la sombra
        this.dialogManager.setNode(this.shadow.outro);
    }
}

class NightmareDay1 extends NightmareMinigame {
    /**
     * Pesadilla que aparece el dia 1
     * El minijuego consiste en pasar el cursor por todas las sillas y hacer que desaparezcan
     */
    constructor() {
        super(1, true);
    }

    create(params) {
        super.create(params);

        // Guardar las sillas
        this.chairs = [];
        // Ultima silla tocada (para saber cual hay que hacer desaparecer)
        // Nota: solo se usa cuando la silla emite un dialogo
        this.lastTouchedChair = null;

        // Dialogo que emiten alguna de las sillas
        this.seatNode = this.readNodes('seat');
        // Numero de sillas que emiten el dialogo
        this.nChairsWithDialogs = 2;

        let upperRow = {
            y: 2.8 * this.CANVAS_HEIGHT / 4,
            nItems: 5,
            sideOffset: 120
        };
        let upperChairs = this.createCenteredChairs(upperRow.y, upperRow.nItems, upperRow.sideOffset);

        let lowerRow = {
            y: 3.3 * this.CANVAS_HEIGHT / 4,
            nItems: 5,
            sideOffset: 50
        };
        let lowerChairs = this.createCenteredChairs(lowerRow.y, lowerRow.nItems, lowerRow.sideOffset);

        this.chairs = upperChairs.concat(lowerChairs);

        // Saber cuantas sillas restantes quedan por tocar
        this.nChairs = this.chairs.length;

        // Evento para hacer desaparecer una silla que ha emitido un dialogo
        this.dispatcher.add('seatFadesOut', this, () => {
            if (this.lastTouchedChair) {
                this.chairFadesOut(this.lastTouchedChair);
            }
            this.lastTouchedChair = null;
        });
    }

    /**
     * Crear un numero de sillas centradas
     */
    createCenteredChairs(y, nItems, sideOffset) {
        // Objeto que sirve como modelo para el resto de objetos
        let chairAux = this.createChair();
        return this.createCenteredObjects(y, nItems, sideOffset, chairAux);
    }

    /**
     * Crear una silla
     * Nota: propiedades w (ancho de la silla) y clone (clonar silla) para poder crear una hilera de sillas
     */
    createChair() {
        let scale = 0.55;
        let chair = this.add.image(0, 0, this.atlasName, 'chair');
        chair.setScale(scale);
        chair.w = chair.displayWidth;
        chair.clone = () => {
            return this.createChair();
        };
        return chair;
    }

    onMinigameStarts() {
        // Se seleccionan dos silla aleatorias para que emitan dialogos
        for (let i = 0; i < this.nChairsWithDialogs; ++i) {
            let randIndex = Phaser.Math.Between(0, this.chairs.length - 1);
            let chair = this.chairs[randIndex];
            this.activateChairForMinigame(chair, this.seatNode);
            this.chairs.splice(randIndex, 1);
        }

        // El resto de sillas directamente se desvacenen
        this.chairs.forEach((chair) => {
            this.activateChairForMinigame(chair);
        });

        this.chairs = [];
    }

    /**
     * Logica del minijuego
     * Animar las sillas y hacer que al pasar el cursor por encima de ellas, desaparezcan.
     * Ademas, algunas de las sillas antes de desaparecer emitiran un dialogo.
     */
    activateChairForMinigame(chair, node) {
        chair.setInteractive({ useHandCursor: true });
        // Desaparece la silla
        chair.once('pointerover', () => {
            chair.removeInteractive();

            if (node) {
                xapiTracker.gameObject("chair_with_dialog", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .interacted()
                            .send();
                this.lastTouchedChair = chair;
                this.dialogManager.setNode(node);
            } else {
                xapiTracker.gameObject("chair_without_dialog", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .interacted()
                            .send();
                this.chairFadesOut(chair);
            }
        });
    }

    /**
     * Hacer desaparecer una silla
     */
    chairFadesOut(chair) {
        let fadeOutDuration = 90;

        let fadeOut = this.tweens.add({
            targets: chair,
            alpha: 0,
            duration: fadeOutDuration,
            repeat: 0,
        });

        fadeOut.on('complete', () => {
            chair.destroy();

            --this.nChairs;
            if (this.nChairs <= 0) {
                this.onMinigameFinishes();
            }
        });
    }
}

class BedroomMorningDay2 extends BedroomBase {
    constructor() {
        super('BedroomMorningDay2');
    }

    create(params) {
        super.create(params);

        this.livingroom = "LivingroomMorningDay2";

        let nodes = this.cache.json.get('bedroomMorningDay2');

        // Dialogos del interior del armario y la cama
        this.wardrobe1Node = super.readNodes(nodes, "day2\\bedroomMorningDay2", "wardrobe1", true);
        this.wardrobe2Node = super.readNodes(nodes, "day2\\bedroomMorningDay2", "wardrobe2", true);
        this.bedNode = super.readNodes(nodes, "day2\\bedroomMorningDay2", "bed", true);

        // Mochila
        let bagNode = super.readNodes(nodes, "day2\\bedroomMorningDay2", "bag", true);
        let bag = this.add.image(1900 * this.scale, 1035 * this.scale, this.atlasName, 'bag').setOrigin(0, 0).setScale(-this.scale * 0.9, this.scale * 0.9);
        bag.setInteractive({ useHandCursor: true });
        bag.on('pointerdown', () => {
            this.gameManager.interacted("bag", xapiTracker.GAMEOBJECTTYPE.ITEM)
                                    .withResultExtension("bagPicked", true)
                                    .send();
            this.dialogManager.setNode(bagNode);
        });

        // Ropa
        this.add.image(852 * this.scale + 1, 848 * this.scale - 1, this.atlasName, 'bedroomJacket').setOrigin(0, 0).setScale(this.scale);
        this.add.image(2899 * this.scale + 1, 1296 * this.scale - 1, this.atlasName, 'clothes1').setOrigin(0, 0).setScale(this.scale).setDepth(this.bed + 1);
        this.add.image(2704 * this.scale + 1, 963 * this.scale - 1, this.atlasName, 'clothes2').setOrigin(0, 0).setScale(this.scale).setDepth(this.bed + 1);
        this.add.image(2061 * this.scale + 1, 928 * this.scale - 1, this.atlasName, 'clothes3').setOrigin(0, 0).setScale(this.scale);


        // Evento que se llama al encender el ordenador. Pone la hora a la de llegar tarde
        // en el telefono (la variable de llegar tarde la cambia el propio evento)
        this.dispatcher.add("turnPC", this, (obj) => {
            this.phoneManager.setDayInfo("pcLateHour");
        });

        // Evento que se llama al coger la mochila. Hace que la mochila desaparezca con 
        // una animacion (la variable de coger la mochila la cambia el propio evento)
        this.dispatcher.addOnce("pickBag", this, (obj) => {
            bag.disableInteractive();
            this.tweens.add({
                targets: bag,
                alpha: { from: 1, to: 0 },
                duration: 100,
                repeat: 0,
            });
        });

    }
}

class LivingroomMorningDay2 extends LivingroomBase {
    constructor() {
        super('LivingroomMorningDay2');
    }

    create(params) {
        super.create(params);

        this.bedroom = "BedroomMorningDay2";
        this.playground = "PlaygroundMorningDay2";

        let nodes = this.cache.json.get('livingroomMorningDay2');
        let otherDoorNode = super.readNodes(nodes, "day2\\livingroomMorningDay2", "door", true);

        // Se comprueba si se ha cogido la mochila. Si se ha cogido, se 
        // pone el dialogo de que los padres ya se han ido en la puerta
        if (this.gameManager.getValue("bagPicked")) {
            this.doorNode = otherDoorNode;
        }

        // Suscripcion al evento de coger la mochila por si no se 
        // coge antes de salir de la habitacion por primera vez
        this.dispatcher.addOnce("pickBag", this, (obj) => {
            this.doorNode = otherDoorNode;
        });

        // Evento que se llama una vez termina el dialogo de la puerta. Cambia directamente a la
        // escena del patio para no tener que quitar el nodo ni hacer click de nuevo en la puerta
        this.dispatcher.addOnce("leaveHome", this, (obj) => {
            let params = {
                camPos: "left"
            };
            this.gameManager.changeScene(this.playground, params);
        });
    }
}

class PlaygroundMorningDay2 extends PlaygroundBase {
    constructor() {
        super('PlaygroundMorningDay2');
    }

    create(params) {
        super.create(params);

        this.home = "";
        this.stairs = "StairsMorningDay2";

        let nodes = this.cache.json.get('everydayDialog');
        this.homeNode = super.readNodes(nodes, "everydayDialog", "playground.homeMorning", true);

        // Si no se llega tarde, se colocan personajes de fondo
        if (!this.gameManager.getValue("isLate")) {
            // Se establece el dialogo de la puerta para que no se pueda entrar hasta que se abran 
            this.phoneManager.setDayInfo("playgroundMorning");
            this.doorNode = super.readNodes(nodes, "everydayDialog","playground.doorMorning", true);


            let tr = {
                x: 350,
                y: this.CANVAS_HEIGHT * 0.975,
                scale: 0.075
            };
            let ana = new Character(this, "Ana", tr, this.portraitTr, () => {
                this.dialogManager.setNode(anaNode);
            });
            ana.setAnimation("IdleBase", true);
            this.portraits.set("Ana", ana.getPortrait());
    
            tr = {
                x: this.rightBound * 0.4,
                y: this.CANVAS_HEIGHT * 0.84,
                scale: 0.04
            };
            let maria = new Character(this, "Maria", tr, this.portraitTr, () => {
                this.dialogManager.setNode(mariaNode);
            });
            maria.setAnimation("IdleBase", true);
            this.portraits.set("Maria", maria.getPortrait());

            tr = {
                x: this.rightBound * 0.81,
                y: this.CANVAS_HEIGHT * 0.955,
                scale: 0.055
            };
            let jose = new Character(this, "Jose", tr, this.portraitTr, () => {
                this.dialogManager.setNode(joseNode);
            });
            jose.setAnimation("IdleBase", true);
            this.portraits.set("Jose", jose.getPortrait());


            nodes = this.cache.json.get('playgroundMorningDay2');
            let anaNode = super.readNodes(nodes, "day2\\playgroundMorningDay2", "ana", true);
            let mariaNode = super.readNodes(nodes, "day2\\playgroundMorningDay2", "maria", true);
            let joseNode = super.readNodes(nodes, "day2\\playgroundMorningDay2", "jose", true);
            

            // Evento llamado cuando suena la campana
            this.dispatcher.addOnce("openDoors", this, (obj) => {
                    // Cambia la hora del movil
                this.phoneManager.setDayInfo("classStart");

                // Se quita el dialogo que aparece al hacer click en las puertas
                this.doorNode = null;
                super.openDoors();
            });
            
            // Prepara las tandas de opciones. Solo se hace una vez, 
            // y quita de las opciones aquellas que no se puedan elegir
            this.dispatcher.addOnce("prepareChoices", this, (obj) => {
                // Si Maria no ha avisado al jugador, se quita la opcion de hablarle a Ana sobre ello
                if (!this.gameManager.getValue("warned")) {
                    this.dialogManager.activateOptions(false, () => {
                        let node = this.dialogManager.currNode;
                    
                        node.choices.splice(1, 1);
                        node.next.splice(1, 1);
    
                        this.dialogManager.setTalking(false);
                        this.dialogManager.setNode(node);
                    }, 0, true);
                }
            });
        }
        // Si no, se pone la hora de llegar tarde, se dejan las puertas abiertas, y se quita el dialogo de la puerta
        else {
            this.phoneManager.setDayInfo("playgroundMorningLate");
            super.openDoors();
            this.doorNode = null;
        }


        
    }
}

class StairsMorningDay2 extends StairsBase {
    constructor() {
        super('StairsMorningDay2');
    }

    create(params) {
        super.create(params);

        this.playground = "PlaygroundMorningDay2";
        this.corridor = "CorridorMorningDay2";

        let nodes = this.cache.json.get('everydayDialog');
        this.playgroundNode = super.readNodes(nodes, "everydayDialog", "stairs.downstairs", true);

    }
}

class CorridorMorningDay2 extends CorridorBase {
    constructor() {
        super('CorridorMorningDay2');
    }

    create(params) {
        super.create(params);
        
        this.stairs = "StairsMorningDay2";
        this.class = "ClassFrontMorningDay2";

        let tr = {
            x: this.rightBound * 0.58,
            y: this.CANVAS_HEIGHT * 0.75,
            scale: 0.088
        };
        let alex = new Character(this, "Alex_front", tr, this.portraitTr, () => {
            this.dialogManager.setNode(alexNode);
        });
        alex.setScale(-tr.scale, tr.scale);
        alex.setAnimation("IdleBase", true);
        this.portraits.set("Alex", alex.getPortrait());

        let nodes = this.cache.json.get('corridorMorningDay2');
        let alexNode = super.readNodes(nodes, "day2\\corridorMorningDay2", "alex", true);

        
        // Si no se llega tarde, se colocan personajes en el fondo
        if (!this.gameManager.getValue("isLate")) {
            tr = {
                x: 250,
                y: this.CANVAS_HEIGHT * 0.77,
                scale: 0.087
            };
            let alison = new Character(this, "Alison", tr, this.portraitTr, () => {
                this.dialogManager.setNode(alisonNode);
            });
            alison.setScale(-tr.scale, tr.scale);
            alison.setAnimation("IdleBase", true);
            this.portraits.set("Alison", alison.getPortrait());
    
    
            tr = {
                x: this.rightBound * 0.78,
                y: this.CANVAS_HEIGHT * 0.93,
                scale: 0.15
            };
            let guille = new Character(this, "Guille", tr, this.portraitTr, () => {
                this.dialogManager.setNode(guilleNode);
                this.gameManager.setValue("metGuille", true);
            });
            guille.setAnimation("IdleBase", true);
            this.portraits.set("Guille", guille.getPortrait());
    
            
            let alisonNode = super.readNodes(nodes, "day2\\corridorMorningDay2", "alison", true);
            let guilleNode = super.readNodes(nodes, "day2\\corridorMorningDay2", "guille", true);
        }
        
    }
}

class ClassFrontMorningDay2 extends ClassFrontBase {
    constructor() {
        super('ClassFrontMorningDay2');
    }

    create(params) {
        super.create(params);

        let teacher = this.add.image(this.portraitTr.x, this.portraitTr.y + 20, 'teacherChar').setOrigin(0.5, 1).setScale(this.portraitTr.scale);
        this.portraits.set("teacher", teacher);

        // Si no se ha llegado tarde, pone el nodo de dialogo al interactuar con las mesas
        if (!this.gameManager.getValue("isLate")) {  
            let nodes = this.cache.json.get('everydayDialog');
            this.tablesNode = super.readNodes(nodes, "everydayDialog", "class.table", true);
        }
        // Si no, se colocan mas alumnos en la clase y se pone directamente el nodo del profesor
        else {
            let tr = {
                x: 160,
                y: this.CANVAS_HEIGHT * 0.51,
                scale: this.scale * 1.4
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar6').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row1Chairs.depth);

            tr = {
                x: 680,
                y: this.CANVAS_HEIGHT * 0.55,
                scale: this.scale * 1.4
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar2').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row1Chairs.depth);

            tr = {
                x: 1150,
                y: this.CANVAS_HEIGHT * 0.55,
                scale: this.scale * 1.4
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar1').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row1Chairs.depth);


            tr = {
                x: 280,
                y: this.CANVAS_HEIGHT * 0.54,
                scale: this.scale * 1
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar8').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row2Chairs.depth);

            tr = {
                x: 720,
                y: this.CANVAS_HEIGHT * 0.54,
                scale: this.scale * 1
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar15').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row2Chairs.depth);

            tr = {
                x: 1060,
                y: this.CANVAS_HEIGHT * 0.54,
                scale: this.scale * 1.1
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar11').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row2Chairs.depth);


            tr = {
                x: 1560,
                y: this.CANVAS_HEIGHT * 0.52,
                scale: this.scale * 0.9
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar7').setOrigin(0, 0).setScale(-tr.scale, tr.scale).setDepth(this.row3Chairs.depth);

            tr = {
                x: 1030,
                y: this.CANVAS_HEIGHT * 0.52,
                scale: this.scale * 0.8
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar5').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row3Chairs.depth);


            tr = {
                x:  510,
                y: this.CANVAS_HEIGHT * 0.49,
                scale: this.scale * 0.76
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar9').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row4Chairs.depth);


            let nodes = this.cache.json.get('everydayDialog');
            let teacherNode = super.readNodes(nodes, "everydayDialog", "class.late", true);
            setTimeout(() => {
                this.dialogManager.setNode(teacherNode);                
            }, 50);
        }


        // Evento llamado cuando terminan los dialogos y empieza la clase
        this.dispatcher.addOnce("startClass", this, (obj) => {
            let sceneName = 'TextOnlyScene';

            // Se obtiene el texto de la escena de transicion del archivo de traducciones 
            let text = this.i18next.t("day2.startClass", { ns: "transitionScenes", returnObjects: true });
            if (this.gameManager.getValue("isLate")) {
                text = this.i18next.t("day2.startClassLate", { ns: "transitionScenes", returnObjects: true });
            }

            let params = {
                text: text,
                onComplete: () => {
                    this.gameManager.changeScene('ClassBackBreakDay2');
                },
                onCompleteDelay: 500
            };

            // Se cambia a la escena de transicion
            this.gameManager.changeScene(sceneName, params);
        });
    }
}

class ClassBackBreakDay2 extends ClassBackBase {
    constructor() {
        super('ClassBackBreakDay2');
    }

    create(params) {
        super.create(params);

        this.corridor = "CorridorBreakDay2";

        // Cambia la hora del movil
        this.phoneManager.setDayInfo("startBreak");


        // Personajes
        let tr = {
            x: this.rightBound * 0.18,
            y: this.CANVAS_HEIGHT * 0.72,
            scale: 0.08
        };
        let alex = new Character(this, "Alex_front", tr, this.portraitTr, () => {
            this.dialogManager.setNode(alexNode);
         });
        alex.setDepth(this.row1Tables.depth - 1);
        alex.setAnimation("IdleBase", true);
        this.portraits.set("Alex", alex.getPortrait());

        let nodes = this.cache.json.get('classBackBreakDay2');
        let alexNode = super.readNodes(nodes, "day2\\classBackBreakDay2", "alex", true);

        this.gameManager.changeFriendship("Ana", -10);
        this.gameManager.changeFriendship("Jose", -10);
        

        // Personajes de fondo
        tr = {
            x: this.rightBound * 0.46,
            y: this.CANVAS_HEIGHT * 0.65,
            scale: this.scale * 0.68
        };
        this.add.image(tr.x, tr.y, this.atlasName, 'backChar8').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row4Chairs.depth - 1);

        tr = {
            x: this.rightBound * 0.72,
            y: this.CANVAS_HEIGHT * 0.69,
            scale: this.scale * 0.72
        };
        this.add.image(tr.x, tr.y, this.atlasName, 'backChar12').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row4Chairs.depth - 1);

        tr = {
            x: this.rightBound * 0.05,
            y: this.CANVAS_HEIGHT * 0.62,
            scale: this.scale * 0.61
        };
        this.add.image(tr.x, tr.y, this.atlasName, 'backChar4').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row3Chairs.depth - 1);
        
        tr = {
            x: this.rightBound * 0.26,
            y: this.CANVAS_HEIGHT * 0.63,
            scale: this.scale * 0.56
        };
        this.add.image(tr.x, tr.y, this.atlasName, 'backChar10').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row3Chairs.depth - 1);

        
    }
}

class CorridorBreakDay2 extends CorridorBase {
    constructor() {
        super('CorridorBreakDay2');
    }

    create(params) {
        super.create(params);

        this.stairs = "StairsBreakDay2";
        this.class = "PlaygroundAfternoonDay2";
        this.classChangeParams = {
            camPos: "right"
        };

        if (this.gameManager.getUserInfo().gender === "male") {
            this.boysRestroom = "RestroomBreakDay2";
            this.girlsRestroom = "OppositeRestroom";
        }
        else {
            this.girlsRestroom = "RestroomBreakDay2";
            this.boysRestroom = "OppositeRestroom";
        }

        // Cambia la hora del movil
        this.phoneManager.setDayInfo("midBreak");
        

        // Personajes
        let tr = {
            x: this.rightBound * 0.6,
            y: this.CANVAS_HEIGHT * 0.75,
            scale: 0.088
        };
        let maria = new Character(this, "Maria", tr, this.portraitTr, () => {
            this.dialogManager.setNode(mariaNode);
        });
        maria.setAnimation("IdleBase", true);
        this.portraits.set("Maria", maria.getPortrait());
        
        let nodes = this.cache.json.get('corridorBreakDay2');
        let mariaNode = super.readNodes(nodes, "day2\\corridorBreakDay2", "maria", true);

        nodes = this.cache.json.get('everydayDialog');
        this.classNode = super.readNodes(nodes, "everydayDialog", "corridor.class", true);
        
    }

    
}

class RestroomBreakDay2 extends RestroomBase {
    constructor() {
        super("RestroomBreakDay2");
    }

    create(params) {
        super.create(params);
        

        let nodes = this.cache.json.get('restroomBreakDay2');
        let sinkNode = super.readNodes(nodes, "day2\\restroomBreakDay2", "sink", true);

        // Forma geometrica para poder interactuar con los lavabos
        let graphics = this.add.graphics(0, 0);
        let sinkPolygon = new Phaser.Geom.Polygon([
            0, 80,
            240, 140,
            240, 430,
            450, 430,
            0, 830
        ]);
        // graphics.lineStyle(5, 0xFF00FF, 1.0).fillStyle(0xFFF, 1.0).fillPoints(sinkPolygon.points, true);
        graphics.generateTexture('sink', this.rightBound, this.CANVAS_HEIGHT);
        let sink = this.add.image(0, 0, 'sink').setOrigin(0, 0).setDepth(200);
        graphics.destroy();

        // Para las areas interactuables con forma de poligono, hay que hacerlas primero interactivas
        // y luego cambiar el cursor manualmente, ya que si no, toda la textura se vuelve interactuable
        sink.setInteractive(sinkPolygon, Phaser.Geom.Polygon.Contains);
        sink.input.cursor = 'pointer';
        
        sink.on('pointerdown', () => {
            this.gameManager.interacted("sink", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .send();
            this.dialogManager.setNode(sinkNode);
        });

        
    }
}

class StairsBreakDay2 extends StairsBase {
    constructor() {
        super('StairsBreakDay2');
    }

    create(params) {
        super.create(params);

        this.playground = "PlaygroundBreakDay2";
        this.corridor = "CorridorBreakDay2";

        // Cambia la hora del movil
        this.phoneManager.setDayInfo("endBreak");
    }
}

class PlaygroundBreakDay2 extends PlaygroundBase {
    constructor() {
        super('PlaygroundBreakDay2');
    }

    create(params) {
        super.create(params);

        this.home = "";
        this.stairs = "StairsBreakDay2";

        // Se abren las puertas 
        super.openDoors();
        this.doorNode = null;

        // Personajes
        let tr = {
            x: this.rightBound * 0.61,
            y: this.CANVAS_HEIGHT * 0.91,
            scale: 0.055
        };
        let jose = new Character(this, "Jose", tr, this.portraitTr, () => {
            this.dialogManager.setNode(ana_joseNode);
        });
        jose.setScale(-tr.scale, tr.scale);
        jose.setAnimation("IdleBase", true);
        this.portraits.set("Jose", jose.getPortrait());
        
        tr = {
            x: this.rightBound * 0.65,
            y: this.CANVAS_HEIGHT * 0.91,
            scale: 0.05
        };
        let ana = new Character(this, "Ana", tr, this.portraitTr, () => {
            this.dialogManager.setNode(ana_joseNode);
        });
        ana.setAnimation("IdleBase", true);
        this.portraits.set("Ana", ana.getPortrait());

        tr = {
            x: this.rightBound * 0.85,
            y: this.CANVAS_HEIGHT * 1.2,
            scale: 0.1
        };
        let alison = new Character(this, "Alison", tr, this.portraitTr, () => {
            this.dialogManager.setNode(guille_alisonNode);
        });
        alison.setScale(-tr.scale, tr.scale);
        alison.setAnimation("IdleBase", true);
        this.portraits.set("Alison", alison.getPortrait());

        tr = {
            x: this.rightBound * 0.92,
            y: this.CANVAS_HEIGHT * 1.15,
            scale: 0.1
        };
        let guille = new Character(this, "Guille", tr, this.portraitTr, () => {
            this.dialogManager.setNode(guille_alisonNode);
        });
        guille.setAnimation("IdleBase", true);
        this.portraits.set("Guille", guille.getPortrait());


        let nodes = this.cache.json.get('playgroundBreakDay2');
        let ana_joseNode = super.readNodes(nodes, "day2\\playgroundBreakDay2", "ana_jose", true);
        let guille_alisonNode = super.readNodes(nodes, "day2\\playgroundBreakDay2", "guille_alison", true);
                
        nodes = this.cache.json.get('everydayDialog');
        this.homeNode = super.readNodes(nodes, "everydayDialog", "playground.homeBreak", true);

    }
}

class PlaygroundAfternoonDay2 extends PlaygroundBase {
    constructor() {
        super('PlaygroundAfternoonDay2');
    }

    create(params) {
        super.create(params);

        this.home = "LivingroomAfternoonDay2";

        // Cambia la hora del movil
        this.phoneManager.setDayInfo("endClass");


        // Personajes
        let tr = {
            x: this.rightBound * 0.61,
            y: this.CANVAS_HEIGHT * 0.91,
            scale: 0.055
        };
        let jose = new Character(this, "Jose", tr, this.portraitTr, () => {
            this.dialogManager.setNode(voicesNode);
        });
        jose.setScale(-tr.scale, tr.scale);
        jose.setAnimation("IdleBase", true);
        this.portraits.set("Jose", jose.getPortrait());
        
        tr = {
            x: this.rightBound * 0.65,
            y: this.CANVAS_HEIGHT * 0.91,
            scale: 0.05
        };
        let ana = new Character(this, "Ana", tr, this.portraitTr, () => {
            this.dialogManager.setNode(voicesNode);
        });
        ana.setAnimation("IdleBase", true);
        this.portraits.set("Ana", ana.getPortrait());

        tr = {
            x: this.rightBound * 0.82,
            y: this.CANVAS_HEIGHT * 1.05,
            scale: 0.08
        };
        let alex = new Character(this, "Alex_front", tr, this.portraitTr, () => {
            this.dialogManager.setNode(voicesNode);
        });
        alex.setScale(-tr.scale, tr.scale);
        alex.setAnimation("IdleBase", true);
        this.portraits.set("Alex", alex.getPortrait());


        tr = {
            x: this.rightBound * 0.05,
            y: this.CANVAS_HEIGHT * 1.1,
            scale: 0.1
        };
        let guille = new Character(this, "Guille", tr, this.portraitTr, () => {
            this.dialogManager.setNode(guilleNode);
        });
        guille.setScale(-tr.scale, tr.scale);
        guille.setAnimation("IdleBase", true);
        this.portraits.set("Guille", guille.getPortrait());


        let nodes = this.cache.json.get('playgroundAfternoonDay2');
        let voicesNode = super.readNodes(nodes, "day2\\playgroundAfternoonDay2", "voices", true);
        let guilleNode = super.readNodes(nodes, "day2\\playgroundAfternoonDay2", "guille", true);
                
        nodes = this.cache.json.get('everydayDialog');
        this.doorNode = super.readNodes(nodes, "everydayDialog","playground.doorAfternoon", true);

    }
}

class LivingroomAfternoonDay2 extends LivingroomBase {
    constructor() {
        super('LivingroomAfternoonDay2');
    }

    create(params) {
        super.create(params);

        this.bedroom = "BedroomAfternoonDay2";
        this.playground = "";

        // Cambia la hora del movil
        this.phoneManager.setDayInfo("returnHome");

        // Personajes
        let tr = {
            x: this.rightBound * 0.9,
            y: this.CANVAS_HEIGHT * 0.945,
            scale: 0.16
        };
        let dad = new Character(this, "dad", tr, this.portraitTr, () => {
            this.dialogManager.setNode(dadNode);
        });
        dad.setScale(-tr.scale, tr.scale);
        dad.setAnimation("IdleBase", true);
        this.portraits.set("dad", dad.getPortrait());

        let nodes = this.cache.json.get('livingroomAfternoonDay2');
        let dadNode = super.readNodes(nodes, "day2\\livingroomAfternoonDay2", "dad", true);

        nodes = this.cache.json.get('everydayDialog');
        this.doorNode = super.readNodes(nodes, "everydayDialog", "livingroom.doorAfternoon", true);

        
        // Prepara las tandas de opciones. Solo se hace una vez, 
        // y quita de las opciones aquellas que no se puedan elegir
        this.dispatcher.addOnce("prepareChoices1", this, (obj) => {
            if (!this.gameManager.getValue("aboutMatch")) {
                this.dialogManager.activateOptions(false, () => {
                    let node = this.dialogManager.currNode;
                    node.choices.splice(1, 1);
                    node.next.splice(1, 1);

                    this.dialogManager.setTalking(false);
                    this.dialogManager.setNode(node);
                }, 0, true);
            }
        });
        
        this.dispatcher.addOnce("prepareChoices3", this, (obj) => {
            // Si no se ha conocido a Maria o no se tiene suficiente amistad con ella, se quita la opcion para hablar de ella
            if (!this.gameManager.getValue("metMaria") || this.gameManager.getValue("MariaFS") < 50) {
                this.dialogManager.activateOptions(false, () => {
                    let node = this.dialogManager.currNode;
                
                    node.choices.splice(0, 1);
                    node.next.splice(0, 1);

                    this.dialogManager.setTalking(false);
                    this.dialogManager.setNode(node);
                }, 0, true);
            }
        });

    }

}

class BedroomAfternoonDay2 extends BedroomBase {
    constructor() {
        super('BedroomAfternoonDay2');
    }

    create(params) {
        super.create(params);

        this.livingroom = "LivingroomAfternoonDay2";

        // Cambia la hora del movil
        this.phoneManager.setDayInfo("night");

        let nodes = this.cache.json.get('bedroomAfternoonDay2');

        // Dialogos del interior del armario y la cama
        this.wardrobe1Node = super.readNodes(nodes, "day2\\bedroomAfternoonDay2", "wardrobe1", true);
        this.wardrobe2Node = super.readNodes(nodes, "day2\\bedroomAfternoonDay2", "wardrobe2", true);
        nodes = this.cache.json.get('everydayDialog');

        // Mochila
        let bagNode = super.readNodes(nodes, "everydayDialog", "bedroom.bagAfternoon", true);
        let bag = this.add.image(this.rightBound * 0.17, this.CANVAS_HEIGHT * 0.76, this.atlasName, 'bag').setOrigin(0, 0).setScale(this.scale * 1.1);
        bag.setInteractive({ useHandCursor: true });
        bag.on('pointerdown', () => {
            this.gameManager.interacted("bag", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .send();
            this.dialogManager.setNode(bagNode);
        });

        // Cama
        this.bedNode = super.readNodes(nodes, "everydayDialog", "bedroom.bedAfternoon", true);

        // Ordenador (el mismo nodo que el de por la manana, pero sin el dialogo del jugador)
        let node = super.readNodes(nodes, "everydayDialog", "bedroom.pc", true);
        node = node.next[0];
        this.pcNode = node;

        this.add.image(852 * this.scale + 1, 848 * this.scale - 1, this.atlasName, 'bedroomJacket').setOrigin(0, 0).setScale(this.scale);

        
        // Mensajes del movil
        nodes = this.cache.json.get('bedroomAfternoonDay2');
        let phoneNode = super.readNodes(nodes, "day2\\bedroomAfternoonDay2", "phone1", true);

        let chatName = this.i18next.t("textMessages.chat2", { ns: "phoneInfo", returnObjects: true });
        this.phoneManager.phone.addChat(chatName, "default");
        this.phoneManager.phone.setChatNode(chatName, phoneNode);

        let sendingMessage = false;

        // Evento que se llama cuando se envian los primeros mensajes. Le da al jugador la posibilidad 
        // de responder a los mensajes, pero si no lo hace, pasa directamente a los siguientes
        this.dispatcher.addOnce("startTimer1", this, (obj) => {
            phoneNode = super.readNodes(nodes, "day2\\bedroomAfternoonDay2", "phone2", true);
            this.phoneManager.phone.setChatNode(chatName, phoneNode);

            setTimeout(() => {
                if (!sendingMessage) {
                    phoneNode = super.readNodes(nodes, "day2\\bedroomAfternoonDay2", "phone3", true);
                    this.phoneManager.phone.setChatNode(chatName, phoneNode);
                }
            }, obj.time);
        });

        // Evento que se llama al responder a los primeros mensajes para que pase a los
        // siguientes mensajes sin necesidad de esperar a que acabe el contador
        this.dispatcher.addOnce("reply1", this, (obj) => {
            sendingMessage = true;
            phoneNode = super.readNodes(nodes, "day2\\bedroomAfternoonDay2", "phone3", true);
            this.phoneManager.phone.setChatNode(chatName, phoneNode);
        });
    }
}

class ChairWithGum extends Phaser.GameObjects.Container {
    /**
     * Silla con un chicle pegado con colisiones
     * Se usa en el minijuego del segundo dia: cuando una bola de chicle colisiona con una silla aparece un chicle pegado
     * @param {Phaser.Scene} scene - escena la que pertenecen
     * @param {Number} x 
     * @param {Number} y 
     * @param {Number} scale 
     */
    constructor(scene, x, y, scale) {
        super(scene, x, y);

        this.scene.add.existing(this);

        this.setScale(scale).setDepth(1);

        // Silla
        let chair = this.scene.add.image(0, 0, 'nightmaresElements', 'chair');
        this.add(chair);

        // Chicle pegado (inicialmente invisible)
        this.gum = this.scene.add.image(0, 0, 'nightmaresElements', 'gumChair');
        this.gumScale = 0.38;
        this.gum.setScale(this.gumScale);
        this.gum.setVisible(false);
        this.add(this.gum);

        // Collider del objeto (ocupa solo el asietno de la silla)
        this.scene.physics.add.existing(this);
        // Tam del collider (respecto a la silla)
        let bodyWidth = chair.displayWidth / 1.2;
        let bodyHeight = chair.displayHeight / 4;
        // Centros del collider
        let bodyCenter = {
            x: -bodyWidth / 2,
            y: -bodyHeight / 2
        };
        // Se setea el tam del collider
        this.body.setSize(bodyWidth, bodyHeight);
        // Se setea la posicion del collider
        this.body.setOffset(bodyCenter.x, 0.8 * bodyCenter.y);
        // El objeto no se mueve al ser golpeado por otro objeto con fisicas
        this.body.setImmovable(true);

        // Ancho del objeto (para poder colocar una hilera directamente)
        this.w = chair.displayWidth * scale;
        // Si se le ha pegado un chicle o no
        this.stickedGum = false;
    }

    stickGum() {
        this.stickedGum = true;
        this.gum.setVisible(true);
    }

    /**
     * Clonar el objeto (para poder colocar una hilera directamnete)
     * @returns {ChairWithGum} - copia del objeto
     */
    clone() {
        return new ChairWithGum(this.scene, this.x, this.y, this.scale);
    }

    /**
     * Cambiar la posicion, escala y orientacion del chicle pegado
     */
    moveGum(gumOffset) {
        this.gum.x += gumOffset.x;
        this.gum.y += gumOffset.y;
        this.gum.setScale(this.gumScale * gumOffset.scale);
        this.gum.flipX = gumOffset.left;
    }
}

class NightmareDay2 extends NightmareMinigame {
    /**
     * Pesadilla que aparece el dia 2
     * El minijuego consiste en chicles que van cayendo desde el cielo cada vez mas deprisa y cada menos tiempo
     * Hay que evitar que choquen con las sillas clicandolos
     */
    constructor() {
        super(2, false);
    }

    create(params) {
        super.create(params);

        // Grupo con las sillas (para las colisiones)
        // Se diferencia de un grupo de arcade physics en que un grupo de arcade sirve ademas de para las funciones normales de un grupo,
        // para configurar las fisicas de todos los elementos del grupo de forma conjunta (anade un collider a todos los elementos)
        let chairs = this.add.group();
        this.gums = this.add.group();

        // Si el minijuego esta activo o no
        this.enableMinigame = false;

        // Velocidad que adquiere un chice
        this.gumSpeed = {
            value: 100.0,       // valor que adquiere
            increase: 1.1,      // cuanto aumenta (aumenta cada vez que spawnea un chicle)
            max: 500.0,         // maximo que puede aumentar
            // Actualizar valores rapidamente
            update: () => {
                this.gumSpeed.value = this.gumSpeed.value * this.gumSpeed.increase;
                if (this.gumSpeed.value > this.gumSpeed.max) {
                    this.gumSpeed.value = this.gumSpeed.max;
                }
            }
        };
        // Cada cuanto tiempo spawnea un chicle
        this.elapsedTime = 0;
        this.gumSpawnTime = {
            value: 1500.0,      // cada cuanto spawnea
            decrement: 0.87,     // cuanto decrementa este tiempo (decrementa cada vez que spawnea un chicle)
            min: 200,           // minimo que puede disminuir
            // Actualizar valores rapidamente
            update: () => {
                this.gumSpawnTime.value = this.gumSpawnTime.value * this.gumSpawnTime.decrement;
                if (this.gumSpawnTime.value < this.gumSpawnTime.min) {
                    this.gumSpawnTime.value = this.gumSpawnTime.min;
                }
            }
        };
        // Minimo y maximo valor que puede tener el tam de un chicle spawneado
        this.gumScale = {
            min: 0.67,
            max: 1.0
        };

        // Donde spawnean los chicles
        this.spawnPosY = -50;
        // Distancia que se deja a los lados respecto al canvas para la linea de spawn de los chicles
        this.spawPadding = 10;

        // Posiciones de los chicles pegados en las sillas
        let gumsOffsets = [
            {
                x: 10,
                y: -2.5,
                scale: 1.15,
                left: false
            },
            {
                x: 17,
                y: 17,
                scale: 0.95,
                left: true
            },
            {
                x: 0,
                y: -7,
                scale: 0.8,
                left: true
            },
            {
                x: 0,
                y: -2.5,
                scale: 1.15,
                left: false
            },
            {
                x: 5,
                y: 3,
                scale: 1.27,
                left: true
            }
        ];

        // Numero de sillas que hay en el escenario
        let nChairs = 5;

        // Se crea el modelo
        let chairAux = new ChairWithGum(this, 0, 0, 1.160);
        let y = this.CANVAS_HEIGHT - 75;
        // Se crea la hilera de sillas
        let chairsArr = this.createCenteredObjects(y, nChairs, 0, chairAux);
        for (let i = 0; i < nChairs; ++i) {
            let chair = chairsArr[i];
            // Se coloca el chicle que tienen pegado
            chair.moveGum(gumsOffsets[i]);
            // Se anaden al grupo (para las fisicas)
            chairs.add(chair);
        }

        // Colision entre las sillas y las bolas de chicle
        this.physics.add.collider(chairs, this.gums, (chair, gum) => {
            // Se elimina el chicle del grupo
            // 1er true --> se elimina tb de la escena
            // 2º true --> se llama al destroy() del chicle
            this.gums.remove(gum, true, true);
            // Si el chicle no estaba pegado...
            if (!chair.stickedGum) {
                // Se pega
                chair.stickGum();
                // Disminuye el numero de sillas con chicles pegados
                --nChairs;
                if (nChairs <= 0) {
                    this.onMinigameFinishes();
                }
            }
        });
    }

    update(t, dt) {
        super.update(t, dt);

        if (this.enableMinigame) {
            // Crear una bola de chicle cada cierto tiempo
            this.elapsedTime += dt;
            if (this.elapsedTime > this.gumSpawnTime.value) {
                this.elapsedTime = 0;
                this.createGum();
                // Actualizar velocidad y tiempo de spawn
                this.gumSpeed.update();
                this.gumSpawnTime.update();
            }
        }
    }

    /**
     * Crear un chicle con collider que se destruye cuando se clica
     */
    createGum() {
        let gum = this.add.image(0, 0, this.atlasName, 'gum');

        // Escala aleatoria
        let randScale = Phaser.Math.FloatBetween(this.gumScale.min, this.gumScale.max);
        gum.setScale(randScale);

        // Posicion aleatoria dentro de la linea de spawn
        let randPosX = Phaser.Math.FloatBetween(gum.displayWidth / 2 + this.spawPadding, this.CANVAS_WIDTH - gum.displayWidth / 2 - this.spawPadding);
        gum.x = randPosX;
        gum.y = this.spawnPosY;

        this.physics.add.existing(gum);
        // Velocidad del chicle
        gum.body.setVelocityY(this.gumSpeed.value);
        this.gums.add(gum);

        gum.setInteractive({ useHandCursor: true });
        gum.on('pointerup', () => {
            xapiTracker.gameObject("gum", xapiTracker.GAMEOBJECTTYPE.ITEM)
                        .interacted()
                        .send();
            // Si se clica, se elmina del grupo y se destruye
            this.gums.remove(gum, true, true);
        });
    }

    onMinigameStarts() {
        this.enableMinigame = true;
    }

    onMinigameFinishes() {
        this.enableMinigame = false;
        // Cuando termina el minijuego...
        this.gums.getChildren().forEach((gum) => {
            // Se paran todos los chicles restantes
            gum.body.stop();
            // Los chicles restantes dejan de ser interactuables
            gum.removeInteractive();
        });
        super.onMinigameFinishes();
    }
}

class BedroomMorningDay3 extends BedroomBase {
    constructor() {
        super('BedroomMorningDay3');
    }

    create(params) {
        super.create(params);

        this.livingroom = "LivingroomMorningDay3";

        let nodes = this.cache.json.get('bedroomMorningDay3');

        // Dialogos del interior del armario y la cama
        this.wardrobe1Node = super.readNodes(nodes, "day3\\bedroomMorningDay3", "wardrobe1", true);
        this.wardrobe2Node = super.readNodes(nodes, "day3\\bedroomMorningDay3", "wardrobe2", true);
        this.bedNode = super.readNodes(nodes, "day3\\bedroomMorningDay3", "bed", true);

        // Mochila
        let bagNode = super.readNodes(nodes, "day3\\bedroomMorningDay3", "bag", true);
        let bag = this.add.image(this.rightBound * 0.17, this.CANVAS_HEIGHT * 0.76, this.atlasName, 'bag').setOrigin(0, 0).setScale(this.scale * 1.1);
        bag.setInteractive({ useHandCursor: true });
        bag.on('pointerdown', () => {
            this.gameManager.interacted("bag", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .withResultExtension("bagPicked", true)
                            .send();
            this.dialogManager.setNode(bagNode);
        });

        // Ropa
        this.add.image(2619 * this.scale + 1, 1268 * this.scale - 1, this.atlasName, 'clothes1').setOrigin(0, 0).setScale(this.scale).setDepth(this.bed.depth - 1);
        this.add.image(2700 * this.scale + 1, 972 * this.scale - 3, this.atlasName, 'clothes3').setOrigin(0, 0).setScale(this.scale).setDepth(this.bed.depth + 1);


        // Evento que se llama al encender el ordenador. Pone la hora a la de llegar tarde
        // en el telefono (la variable de llegar tarde la cambia el propio evento)
        this.dispatcher.add("turnPC", this, (obj) => {
            this.phoneManager.setDayInfo("pcLateHour");
        });

        // Evento que se llama al coger la mochila. Hace que la mochila desaparezca con 
        // una animacion (la variable de coger la mochila la cambia el propio evento)
        this.dispatcher.addOnce("pickBag", this, (obj) => {
            bag.disableInteractive();
            this.tweens.add({
                targets: bag,
                alpha: { from: 1, to: 0 },
                duration: 100,
                repeat: 0,
            });
        });

    }
}

class LivingroomMorningDay3 extends LivingroomBase {
    constructor() {
        super('LivingroomMorningDay3');
    }

    create(params) {
        super.create(params);

        this.bedroom = "BedroomMorningDay3";
        this.playground = "PlaygroundMorningDay3";

        // Personajes
        let tr = {
            x: 440,
            y: this.CANVAS_HEIGHT * 0.72,
            scale: 0.15
        };
        let mom = new Character(this, "mom", tr, this.portraitTr, () => {
            this.dialogManager.setNode(momNode);
        });
        mom.setAnimation("Idle01", true);
        this.portraits.set("mom", mom.getPortrait());

        let nodes = this.cache.json.get('livingroomMorningDay3');
        let momNode = super.readNodes(nodes, "day3\\livingroomMorningDay3", "mom", true);
    }
}

class PlaygroundMorningDay3 extends PlaygroundBase {
    constructor() {
        super('PlaygroundMorningDay3');
    }

    create(params) {
        super.create(params);

        this.home = "";
        this.stairs = "StairsMorningDay3";

        
        // Si no se llega tarde, y se establece el dialogo de la puerta para que no se pueda entrar hasta que se abran 
        if (!this.gameManager.getValue("isLate")) {
            this.phoneManager.setDayInfo("playgroundMorning");
            let nodes = this.cache.json.get('everydayDialog');
            this.doorNode = super.readNodes(nodes, "everydayDialog","playground.doorMorning", true);
        }
        // Si no, se pone la hora de llegar tarde, se dejan las puertas abiertas, y se quita el dialogo de la puerta
        else {
            this.phoneManager.setDayInfo("playgroundMorningLate");
            super.openDoors();
            this.doorNode = null;
        }     


        // Personajes
        let tr = {
            x: this.rightBound * 0.5,
            y: this.CANVAS_HEIGHT * 1.05,
            scale: 0.1
        };
        let alex = new Character(this, "Alex_front", tr, this.portraitTr, () => {
            this.dialogManager.setNode(groupNode);
        });
        alex.setAnimation("IdleBase", true);
        this.portraits.set("Alex", alex.getPortrait());

        tr = {
            x: this.rightBound * 0.53,
            y: this.CANVAS_HEIGHT * 1.02,
            scale: 0.087
        };
        let ana = new Character(this, "Ana", tr, this.portraitTr, () => {
            this.dialogManager.setNode(groupNode);
        });
        ana.setAnimation("IdleBase", true);
        this.portraits.set("Ana", ana.getPortrait());

        alex.setDepth(ana.char.depth + 1);

        tr = {
            x: this.rightBound * 0.57,
            y: this.CANVAS_HEIGHT * 1.01,
            scale: 0.09
        };
        let jose = new Character(this, "Jose", tr, this.portraitTr, () => {
            this.dialogManager.setNode(groupNode);
        });
        jose.setAnimation("IdleBase", true);
        this.portraits.set("Jose", jose.getPortrait());

        tr = {
            x: this.rightBound * 0.61,
            y: this.CANVAS_HEIGHT * 1.03,
            scale: 0.1
        };
        let guille = new Character(this, "Guille", tr, this.portraitTr, () => {
            this.dialogManager.setNode(groupNode);
        });
        guille.setAnimation("IdleBase", true);
        this.portraits.set("Guille", guille.getPortrait());


        let nodes = this.cache.json.get('playgroundMorningDay3');
        let groupNode = super.readNodes(nodes, "day3\\playgroundMorningDay3", "group", true);
        
        nodes = this.cache.json.get('everydayDialog');
        this.homeNode = super.readNodes(nodes, "everydayDialog", "playground.homeMorning", true);
        let boardNode = super.readNodes(nodes, "everydayDialog", "board", true);


        // Foto
        let blackBG = this.add.rectangle(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT, 0x000, 0.9).setOrigin(0, 0);

        let img = "photoGum";
        if (this.gameManager.getValue("gumWashed")) {
            img = "photoGumWashed";
        }
        let photo = this.add.image(this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT * 0.4, "photos", img).setOrigin(0.5, 0.5);
        photo.setScale(1.2);
        let borderWidth = 20;
        let photoBorder = this.add.rectangle(photo.x, photo.y, photo.displayWidth + borderWidth, photo.displayHeight + borderWidth, 0xf2f2f2, 1).setOrigin(0.5, 0.5);

        this.photo = this.add.container(0, 0).setScrollFactor(0).setDepth(alex.char.depth + 1);
        this.photo.add(blackBG);
        this.photo.add(photoBorder);
        this.photo.add(photo);
        this.photo.visible = false;

        // Tablon de anuncios
        let bulletinBoard = this.add.rectangle(1221 * this.scale, 1027 * this.scale, 190 * this.scale, 161 * this.scale, 0xfff, 0).setOrigin(0, 0);
        bulletinBoard.setInteractive({ useHandCursor: true });
        bulletinBoard.on('pointerdown', () => {
            this.gameManager.interacted("bulletinBoard", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .send();
            this.photo.visible = true;
            this.dialogManager.setNode(boardNode);
        });
        
        // Se baja la amistad de los personajes automaticamente
        this.gameManager.changeFriendship("Alex", -20);
        this.gameManager.changeFriendship("Ana", -20);
        this.gameManager.changeFriendship("Jose", -20);
        this.gameManager.changeFriendship("Guille", -10);

        
        // Evento llamado cuando suena la campana
        this.dispatcher.addOnce("openDoors", this, (obj) => {
            // Cambia la hora del movil
            this.phoneManager.setDayInfo("classStart");

            // Se quita el dialogo que aparece al hacer click en las puertas
            this.doorNode = null;
            super.openDoors();
        });
        
        // Evento llamado cuando acaba el dialogo de ver la foto
        this.dispatcher.add("closePhoto", this, (obj) => {
            // Oculta la foto
            this.photo.visible = false;
        });
        
    }
}

class StairsMorningDay3 extends StairsBase {
    constructor() {
        super('StairsMorningDay3');
    }

    create(params) {
        super.create(params);

        this.playground = "PlaygroundMorningDay3";
        this.corridor = "CorridorMorningDay3";

        let nodes = this.cache.json.get('everydayDialog');
        this.playgroundNode = super.readNodes(nodes, "everydayDialog", "stairs.downstairs", true);

    }
}

class CorridorMorningDay3 extends CorridorBase {
    constructor() {
        super('CorridorMorningDay3');
    }

    create(params) {
        super.create(params);

        this.stairs = "StairsMorningDay3";
        this.class = "ClassFrontMorningDay3";

        
        let nodes = this.cache.json.get('everydayDialog');
        let boardNode = super.readNodes(nodes, "everydayDialog", "board", true);
        // Foto
        let blackBG = this.add.rectangle(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT, 0x000, 0.9).setOrigin(0, 0);

        let img = "photoGum";
        if (this.gameManager.getValue("gumWashed")) {
            img = "photoGumWashed";
        }
        let photo = this.add.image(this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT * 0.4, "photos", img).setOrigin(0.5, 0.5);
        photo.setScale(1.2);
        let borderWidth = 20;
        let photoBorder = this.add.rectangle(photo.x, photo.y, photo.displayWidth + borderWidth, photo.displayHeight + borderWidth, 0xf2f2f2, 1).setOrigin(0.5, 0.5);

        this.photo = this.add.container(0, 0).setScrollFactor(0);
        this.photo.add(blackBG);
        this.photo.add(photoBorder);
        this.photo.add(photo);
        this.photo.visible = false;

        // Tablon de anuncios
        let bulletinBoard = this.add.rectangle(2261 * this.scale, 388 * this.scale, 570 * this.scale, 590 * this.scale, 0xfff, 0).setOrigin(0, 0);
        bulletinBoard.setInteractive({ useHandCursor: true });
        bulletinBoard.on('pointerdown', () => {
            this.gameManager.interacted("bulletinBoard", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .send();
            this.photo.visible = true;
            this.dialogManager.setNode(boardNode);
        });

        // Evento llamado cuando acaba el dialogo de ver la foto
        this.dispatcher.add("closePhoto", this, (obj) => {
            // Oculta la foto
            this.photo.visible = false;
        });

        this.photo.setDepth(3);
        bulletinBoard.setDepth(1);

        // Si no se llega tarde, se colocan personajes en el fondo
        if (!this.gameManager.getValue("isLate")) {
            let tr = {
                x: this.rightBound * 0.78,
                y: this.CANVAS_HEIGHT * 0.93,
                scale: 0.14
            };
            let alison = new Character(this, "Alison", tr, this.portraitTr, () => {
                this.dialogManager.setNode(alisonNode);
            });
            alison.setDepth(bulletinBoard.depth + 1);
            alison.setAnimation("IdleBase", true);
            this.portraits.set("Alison", alison.getPortrait());

            nodes = this.cache.json.get('corridorMorningDay3');
            let alisonNode = super.readNodes(nodes, "day3\\corridorMorningDay3", "alison", true);
        }


    }
}

class ClassFrontMorningDay3 extends ClassFrontBase {
    constructor() {
        super('ClassFrontMorningDay3');
    }

    create(params) {
        super.create(params);

        let teacher = this.add.image(this.portraitTr.x, this.portraitTr.y + 20, 'teacherChar').setOrigin(0.5, 1).setScale(this.portraitTr.scale);
        this.portraits.set("teacher", teacher);

        // Si no se ha llegado tarde, pone el nodo de dialogo al interactuar con las mesas
        if (!this.gameManager.getValue("isLate")) {  
            let nodes = this.cache.json.get('everydayDialog');
            this.tablesNode = super.readNodes(nodes, "everydayDialog", "class.table", true);
        }
        // Si no, se colocan mas alumnos en la clase y se pone directamente el nodo del profesor
        else {
            let tr = {
                x: 160,
                y: this.CANVAS_HEIGHT * 0.51,
                scale: this.scale * 1.4
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar3').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row1Chairs.depth);

            tr = {
                x: 680,
                y: this.CANVAS_HEIGHT * 0.55,
                scale: this.scale * 1.4
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar2').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row1Chairs.depth);

            tr = {
                x: 1150,
                y: this.CANVAS_HEIGHT * 0.55,
                scale: this.scale * 1.4
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar1').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row1Chairs.depth);


            tr = {
                x: 280,
                y: this.CANVAS_HEIGHT * 0.54,
                scale: this.scale * 1
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar8').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row2Chairs.depth);

            tr = {
                x: 720,
                y: this.CANVAS_HEIGHT * 0.54,
                scale: this.scale * 1
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar10').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row2Chairs.depth);

            tr = {
                x: 1060,
                y: this.CANVAS_HEIGHT * 0.54,
                scale: this.scale * 1.1
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar11').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row2Chairs.depth);


            tr = {
                x: 1560,
                y: this.CANVAS_HEIGHT * 0.52,
                scale: this.scale * 0.9
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar7').setOrigin(0, 0).setScale(-tr.scale, tr.scale).setDepth(this.row3Chairs.depth);

            tr = {
                x: 1030,
                y: this.CANVAS_HEIGHT * 0.52,
                scale: this.scale * 0.8
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar5').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row3Chairs.depth);


            tr = {
                x:  510,
                y: this.CANVAS_HEIGHT * 0.49,
                scale: this.scale * 0.76
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar9').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row4Chairs.depth);


            let nodes = this.cache.json.get('everydayDialog');
            let teacherNode = super.readNodes(nodes, "everydayDialog", "class.late", true);
            setTimeout(() => {
                this.dialogManager.setNode(teacherNode);                
            }, 50);
        }


        // Evento llamado cuando terminan los dialogos y empieza la clase
        this.dispatcher.addOnce("startClass", this, (obj) => {
            let sceneName = 'TextOnlyScene';

            // Se obtiene el texto de la escena de transicion del archivo de traducciones 
            let text = this.i18next.t("day3.startClass", { ns: "transitionScenes", returnObjects: true });

            let params = {
                text: text,
                onComplete: () => {
                    this.gameManager.changeScene('ClassBackAfternoonDay3');
                },
                onCompleteDelay: 500
            };

            // Se cambia a la escena de transicion
            this.gameManager.changeScene(sceneName, params);
        });
    }
}

class ClassBackAfternoonDay3 extends ClassBackBase {
    constructor() {
        super('ClassBackAfternoonDay3');
    }

    create(params) {
        super.create(params);

        this.corridor = "CorridorAfternoonDay3";

        // Cambia la hora del movil
        this.phoneManager.setDayInfo("afternoon.endClass");

        let nodes = this.cache.json.get('classCorridorAfternoonDay3');
        let node = super.readNodes(nodes, "day3\\classCorridorAfternoonDay3", "player_stairs", true);
        setTimeout( () => {
            this.dialogManager.setNode(node);
        }, 100);

    }
}

class CorridorAfternoonDay3 extends CorridorBase {
    constructor() {
        super('CorridorAfternoonDay3');
    }

    create(params) {
        super.create(params);

        this.stairs = "StairsAfternoonDay3";
        this.class = "";

        if (this.gameManager.getUserInfo().gender === "male") {
            this.boysRestroom = "RestroomAfternoonDay3";
            this.girlsRestroom = "OppositeRestroom";
        }
        else {
            this.girlsRestroom = "RestroomAfternoonDay3";
            this.boysRestroom = "OppositeRestroom";
        }

        // Cambia la hora del movil
        this.phoneManager.setDayInfo("afternoon.corridor");
        
        let nodes = this.cache.json.get('classCorridorAfternoonDay3');
        this.stairsNode = super.readNodes(nodes, "day3\\classCorridorAfternoonDay3", "player_stairs", true);
        this.classNode = super.readNodes(nodes, "day3\\classCorridorAfternoonDay3", "class", true);


        this.dispatcher.addOnce("setTalked", this, (obj) => {
            this.stairsNode = null;
        });

        
    }

    
}

class RestroomAfternoonDay3 extends RestroomBase {
    constructor() {
        super("RestroomAfternoonDay3");
    }

    create(params) {
        super.create(params);
        
        let tr = {
            x: this.rightBound * 0.85,
            y: this.CANVAS_HEIGHT * 0.96,
            scale: 0.16
        };
        let guille = new Character(this, "Guille", tr, this.portraitTr, () => {
            this.dialogManager.setNode(guilleNode);
        });
        guille.setDepth(this.stall2.depth);
        guille.setAnimation("IdleBase", true);
        this.portraits.set("Guille", guille.getPortrait());

        let nodes = this.cache.json.get('restroomAfternoonDay3');
        let guilleNode = super.readNodes(nodes, "day3\\restroomAfternoonDay3", "guille", true);

        // Prepara las tandas de opciones. Solo se hace una vez, 
        // y quita de las opciones aquellas que no se puedan elegir
        this.dispatcher.addOnce("prepareChoices", this, (obj) => {
            // Si no se ha visto la foto de los tablones, no se puede preguntar por ella
            if (!this.gameManager.getValue("seenPhoto")) {
                this.dialogManager.activateOptions(false, () => {
                    let node = this.dialogManager.currNode;
                    node.choices.splice(1, 1);
                    node.next.splice(1, 1);

                    this.dialogManager.setTalking(false);
                    this.dialogManager.setNode(node);
                }, 0, true);
            }
        });
    }
}

class StairsAfternoonDay3 extends StairsBase {
    constructor() {
        super('StairsAfternoonDay3');
    }

    create(params) {
        super.create(params);

        this.playground = "PlaygroundAfternoonDay3";
        this.corridor = "CorridorAfternoonDay3";
    }
}

class PlaygroundAfternoonDay3 extends PlaygroundBase {
    constructor() {
        super('PlaygroundAfternoonDay3');
    }

    create(params) {
        super.create(params);

        this.home = "LivingroomAfternoonDay3";

        // Cambia la hora del movil
        this.phoneManager.setDayInfo("afternoon.corridor");
        
        let nodes = this.cache.json.get('everydayDialog');
        this.doorNode = super.readNodes(nodes, "everydayDialog","playground.doorAfternoon", true);

    }
}

class LivingroomAfternoonDay3 extends LivingroomBase {
    constructor() {
        super('LivingroomAfternoonDay3');
    }

    create(params) {
        super.create(params);

        this.bedroom = "BedroomAfternoonDay3";
        this.playground = "";

        // Cambia la hora del movil
        this.phoneManager.setDayInfo("returnHome");

        // Personajes
        let tr = {
            x: this.rightBound * 0.73,
            y: this.CANVAS_HEIGHT * 0.87,
            scale: 0.16
        };
        let mom = new Character(this, "mom", tr, this.portraitTr, () => {
            this.dialogManager.setNode(momNode);
        });
        mom.setAnimation("IdleBase", true);
        this.portraits.set("mom", mom.getPortrait());

        let nodes = this.cache.json.get('livingroomAfternoonDay3');
        let momNode = super.readNodes(nodes, "day3\\livingroomAfternoonDay3", "mom", true);

        nodes = this.cache.json.get('everydayDialog');
        this.doorNode = super.readNodes(nodes, "everydayDialog", "livingroom.doorAfternoon", true);

        
        // Prepara las tandas de opciones. Solo se hace una vez, 
        // y quita de las opciones aquellas que no se puedan elegir
        this.dispatcher.addOnce("prepareChoices2", this, (obj) => {
            // Si no se ha visto o se sabe sobre la foto de los tablones, se quita la opcion para hablar de ella
            if (!this.gameManager.getValue("seenPhoto")) {
                this.dialogManager.activateOptions(false, () => {
                    let node = this.dialogManager.currNode;
                
                    node.choices.splice(1, 1);
                    node.next.splice(1, 1);

                    this.dialogManager.setTalking(false);
                    this.dialogManager.setNode(node);
                }, 0, true);
            }
        });

    }

}

class BedroomAfternoonDay3 extends BedroomBase {
    constructor() {
        super('BedroomAfternoonDay3');
    }

    create(params) {
        super.create(params);

        this.livingroom = "LivingroomAfternoonDay3";

        // Cambia la hora del movil
        this.phoneManager.setDayInfo("night");

        // Crer la informacion correspondiente en el ordenador
        this.socialNetwork.createDailyPosts(3);

        let nodes = this.cache.json.get('bedroomAfternoonDay3');

        // Dialogos del interior del armario y la cama
        this.wardrobe1Node = super.readNodes(nodes, "day3\\bedroomAfternoonDay3", "wardrobe1", true);
        this.wardrobe2Node = super.readNodes(nodes, "day3\\bedroomAfternoonDay3", "wardrobe2", true);
        nodes = this.cache.json.get('everydayDialog');

        this.chair.setDepth(this.chair.depth + 1);

        // Mochila
        this.add.image(843 * this.scale, 1035 * this.scale, this.atlasName, 'bag').setOrigin(0, 0).setScale(this.scale * 0.9).setDepth(this.chair.depth - 1);

        // Cama
        this.bedNode = super.readNodes(nodes, "everydayDialog", "bedroom.bedAfternoon", true);

        // Ordenador (el mismo nodo que el de por la manana, pero sin el dialogo del jugador)
        let node = super.readNodes(nodes, "everydayDialog", "bedroom.pc", true);
        node = node.next[0];
        this.pcNode = node;

        this.add.image(852 * this.scale + 1, 848 * this.scale - 1, this.atlasName, 'bedroomJacket').setOrigin(0, 0).setScale(this.scale).setDepth(this.chair.depth + 1);

    }
}

class NightmareDay3 extends NightmareMinigame {
    /**
     * Pesadilla que aparece el dia 3
     * El minijuego consiste en hablar con todos los personajes
     */
    constructor() {
        super(3, false);
    }

    create(params) {
        super.create(params);

        this.characters = new Map();

        // Se crean todos los personajes y sus retratos
        let tr = {
            x: this.CANVAS_WIDTH / 3.7,
            y: 7.15 * this.CANVAS_HEIGHT / 8,
            scale: 0.16
        };
        this.createClassmate(tr, 'Maria');

        tr = {
            x: 1.65 * this.CANVAS_WIDTH / 4,
            y: 3.15 * this.CANVAS_HEIGHT / 4,
            scale: 0.138
        };
        let character = this.createClassmate(tr, 'Guille');
        character.char.flipX = true;
        character.portrait.flipX = true;

        tr = {
            x: 1.12 * this.CANVAS_WIDTH / 2,
            y: 2.95 * this.CANVAS_HEIGHT / 4,
            scale: 0.125
        };
        let portraitOffset = { ...this.portraitOffset };
        portraitOffset.x += 5;
        portraitOffset.scale = 1.54;
        portraitOffset.y += -20;
        this.createClassmate(tr, 'Jose', portraitOffset);

        tr = {
            x: 2.9 * this.CANVAS_WIDTH / 4,
            y: 7.8 * this.CANVAS_HEIGHT / 9,
            scale: 0.17
        };
        portraitOffset = { ...this.portraitOffset };
        portraitOffset.y -= 20;
        this.createClassmate(tr, 'Alison', portraitOffset);

        tr = {
            x: 3.6 * this.CANVAS_WIDTH / 4,
            y: this.CANVAS_HEIGHT - 17,
            scale: 0.182
        };
        portraitOffset = { ...this.portraitOffset };
        portraitOffset.y -= 23;
        portraitOffset.scale = 1.558;
        this.createClassmate(tr, 'Ana', portraitOffset);

        // Los personajes se han creado algo desplazados a la derecha, por lo tanto,
        // se mueven para que esten mas o menos en el centro
        let offset = 60;
        this.characters.forEach((char, name) => {
            char.x -= offset;
        });

        // Cuando llega el evento, es que el dialogo del personaje ha terminado y tiene que desaparecer
        let fadeOutDuration = 1000;
        this.dispatcher.add('characterFadesOut', this, (eventInfo) => {
            let charName = eventInfo.character;
            if (this.characters.has(charName)) {
                let char = this.characters.get(charName);

                // El personaje desparece
                let fadeOut = this.tweens.add({
                    targets: char,
                    alpha: 0,
                    duration: fadeOutDuration,
                    repeat: 0,
                });
                fadeOut.on('complete', () => {
                    this.characters.delete(charName);
                    char.destroy();

                    // Si han desaparecido todos los personajes, la pesadillas termina
                    if (this.characters.size <= 0) {
                        this.onMinigameFinishes();
                    }
                });
            }
        });
    }

    onMinigameStarts() {
        this.characters.forEach((char, name) => {
            char.setVisible(true);
        });
    }

    /**
     * Crear personaje que aparece en la pesadillas con el que se puede interactuar
     */
    createClassmate(tr, charName, portraitOffset) {
        let character = this.createCharFromImage(tr, charName, 'someCharacters', portraitOffset);
        character.char.setOrigin(0.5, 1);
        character.char.setVisible(false);

        let node = this.readNodes(charName);

        character.char.setInteractive({ useHandCursor: true });
        character.char.once('pointerdown', () => {
            this.gameManager.interacted(charName, xapiTracker.GAMEOBJECTTYPE.NPC)
                            .send();
            character.char.removeInteractive();
            this.dialogManager.setNode(node);
        });

        this.characters.set(charName, character.char);

        return character;
    }
}

class BedroomMorningDay4 extends BedroomBase {
    constructor() {
        super('BedroomMorningDay4');
    }

    create(params) {
        super.create(params);

        this.livingroom = "LivingroomMorningDay4";

        let nodes = this.cache.json.get('bedroomMorningDay4');

        // Dialogos del interior del armario y la cama
        this.wardrobe1Node = super.readNodes(nodes, "day4\\bedroomMorningDay4", "wardrobe1", true);
        this.wardrobe2Node = super.readNodes(nodes, "day4\\bedroomMorningDay4", "wardrobe2", true);
        this.bedNode = super.readNodes(nodes, "day4\\bedroomMorningDay4", "bed", true);

        this.chair.setDepth(this.chair.depth + 1);

        
        // Mochila
        let bagNode = super.readNodes(nodes, "day4\\bedroomMorningDay4", "bag", true);
        let bag =  this.add.image(843 * this.scale, 1035 * this.scale, this.atlasName, 'bag').setOrigin(0, 0).setScale(this.scale * 0.9).setDepth(this.chair.depth - 1);
        bag.setInteractive({ useHandCursor: true });
        bag.on('pointerdown', () => {
            this.gameManager.interacted("bag", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .withResultExtension("bagPicked", true)
                            .send();
            this.dialogManager.setNode(bagNode);
        });

        // Ropa
        let clothes1 = this.add.image(3108 * this.scale - 20, 1466 * this.scale - 10, this.atlasName, 'clothes2').setOrigin(0, 0).setScale(this.scale * 2).setDepth(this.bed.depth + 1);
        clothes1.setCrop(0, 0, clothes1.displayWidth * 0.7, clothes1.displayHeight);
        this.add.image(3278 * this.scale + 40, 1469 * this.scale - 10, this.atlasName, 'clothes3').setOrigin(0, 0).setScale(this.scale * 2).setDepth(this.bed.depth + 1);


        // Evento que se llama al encender el ordenador. Pone la hora a la de llegar tarde
        // en el telefono (la variable de llegar tarde la cambia el propio evento)
        this.dispatcher.add("turnPC", this, (obj) => {
            this.phoneManager.setDayInfo("pcLateHour");
        });

        // Evento que se llama al coger la mochila. Hace que la mochila desaparezca con 
        // una animacion (la variable de coger la mochila la cambia el propio evento)
        this.dispatcher.addOnce("pickBag", this, (obj) => {
            bag.disableInteractive();
            this.tweens.add({
                targets: bag,
                alpha: { from: 1, to: 0 },
                duration: 100,
                repeat: 0,
            });
        });

    }
}

class LivingroomMorningDay4 extends LivingroomBase {
    constructor() {
        super('LivingroomMorningDay4');
    }

    create(params) {
        super.create(params);

        this.bedroom = "BedroomMorningDay4";
        this.playground = "PlaygroundMorningDay4";

        // Personajes
        let tr = {
            x: this.rightBound * 0.45,
            y: this.CANVAS_HEIGHT * 0.735,
            scale: 0.14
        };
        let mom = new Character(this, "mom", tr, this.portraitTr, () => {
            this.dialogManager.setNode(mom_dadNode);
        });
        mom.setAnimation("Idle01", true);
        this.portraits.set("mom", mom.getPortrait());

        tr = {
            x: this.rightBound * 0.4,
            y: this.CANVAS_HEIGHT * 0.72,
            scale: 0.15
        };
        let dad = new Character(this, "dad", tr, this.portraitTr, () => {
            this.dialogManager.setNode(mom_dadNode);
        });
        dad.setAnimation("Idle01", true);
        this.portraits.set("dad", dad.getPortrait());

        let nodes = this.cache.json.get('livingroomMorningDay4');
        let mom_dadNode = super.readNodes(nodes, "day4\\livingroomMorningDay4", "mom_dad", true);


        // Pone el dialogo automaticamente al entrar en la escena
        setTimeout( () => {
            this.dialogManager.setNode(mom_dadNode);
        }, 500); 

    }
}

class PlaygroundMorningDay4 extends PlaygroundBase {
    constructor() {
        super('PlaygroundMorningDay4');
    }

    create(params) {
        super.create(params);

        this.home = "";
        this.stairs = "StairsMorningDay4";
        
        // Se pone a Alison independientemente de si se llega tarde o no
        let tr = {
            x: this.rightBound * 0.65,
            y: this.CANVAS_HEIGHT * 0.92,
            scale: 0.055
        };
        let alison = new Character(this, "Alison", tr, this.portraitTr, () => {
            this.dialogManager.setNode(alisonNode);
        });
        alison.setAnimation("IdleBase", true);
        this.portraits.set("Alison", alison.getPortrait());

        // Tablon de anuncios
        let bulletinBoard = this.add.rectangle(1221 * this.scale, 1027 * this.scale, 190 * this.scale, 161 * this.scale, 0xfff, 0).setOrigin(0, 0);
        bulletinBoard.setInteractive({ useHandCursor: true });
        bulletinBoard.on('pointerdown', () => {
            this.gameManager.interacted("bulletinBoard", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .send();
            this.dialogManager.setNode(boardNode);
        });

        // Si no se llega tarde, y se establece el dialogo de la puerta para que no se pueda entrar hasta que se abran 
        if (!this.gameManager.getValue("isLate")) {
            this.phoneManager.setDayInfo("playgroundMorning");
            let nodes = this.cache.json.get('everydayDialog');
            this.doorNode = super.readNodes(nodes, "everydayDialog","playground.doorMorning", true);

            
            // Personajes
            tr = {
                x: this.rightBound * 0.83,
                y: this.CANVAS_HEIGHT * 1.05,
                scale: 0.1
            };
            let guille = new Character(this, "Guille", tr, this.portraitTr, () => {
                this.dialogManager.setNode(guilleNode);
            });
            guille.setScale(-tr.scale, tr.scale);
            guille.setAnimation("IdleBase", true);
            this.portraits.set("Guille", guille.getPortrait());

            tr = {
                x: this.rightBound * 0.9,
                y: this.CANVAS_HEIGHT * 1.07,
                scale: 0.1
            };
            let jose = new Character(this, "Jose", tr, this.portraitTr, () => {
                this.dialogManager.setNode(joseNode);
            });
            jose.setAnimation("IdleBase", true);
            this.portraits.set("Jose", jose.getPortrait());

            nodes = this.cache.json.get('playgroundMorningDay4');
            let guilleNode = super.readNodes(nodes, "day4\\playgroundMorningDay4", "guille", true);
            let joseNode = super.readNodes(nodes, "day4\\playgroundMorningDay4", "jose", true);

            // Evento llamado cuando suena la campana
            this.dispatcher.addOnce("openDoors", this, (obj) => {
                // Cambia la hora del movil
                this.phoneManager.setDayInfo("classStart");

                // Se quita el dialogo que aparece al hacer click en las puertas
                this.doorNode = null;

                jose.char.disableInteractive();
                alison.char.disableInteractive();
                guille.char.disableInteractive();
                // Se hace fade out de todos los personajes de la escena
                let anim = this.tweens.add({
                    targets: [jose.char, alison.char, guille.char],
                    alpha: { from: 1, to: 0 },
                    duration: 1000,
                    repeat: 0,
                });

                // Una vez termina la animacion, se abren las puertas
                anim.on('complete', () => {
                    super.openDoors();
                });
            });
        }
        // Si no, se pone la hora de llegar tarde, se dejan las puertas abiertas, y se quita el dialogo de la puerta
        else {
            this.phoneManager.setDayInfo("playgroundMorningLate");
            super.openDoors();
            this.doorNode = null;
        }     

        let nodes = this.cache.json.get('playgroundMorningDay4');
        let alisonNode = super.readNodes(nodes, "day4\\playgroundMorningDay4", "alison", true);
        let boardNode = super.readNodes(nodes, "day4\\playgroundMorningDay4", "board", true);
        
        nodes = this.cache.json.get('everydayDialog');
        this.homeNode = super.readNodes(nodes, "everydayDialog", "playground.homeMorning", true);

        
        // Evento llamado cuando se termina de hablar con Alison y se llega tarde
        this.dispatcher.addOnce("alisonLeave", this, (obj) => {
            // Se hace fade out de Alison
            alison.char.disableInteractive();
            this.tweens.add({
                targets: [alison.char],
                alpha: { from: 1, to: 0 },
                duration: 1000,
                repeat: 0,
            });
        });

    }
}

class StairsMorningDay4 extends StairsBase {
    constructor() {
        super('StairsMorningDay4');
    }

    create(params) {
        super.create(params);

        this.playground = "PlaygroundMorningDay4";
        this.corridor = "CorridorMorningDay4";

        let nodes = this.cache.json.get('everydayDialog');
        this.playgroundNode = super.readNodes(nodes, "everydayDialog", "stairs.downstairs", true);

        // Si no se llega tarde, se colocan personajes en el fondo
        if (!this.gameManager.getValue("isLate")) {
            let tr = {
                x: this.rightBound * 0.8,
                y: this.CANVAS_HEIGHT * 0.81,
                scale: 0.12
            };
            let maria = new Character(this, "Maria", tr, this.portraitTr, () => {
                this.dialogManager.setNode(mariaNode);
            });
            maria.setAnimation("IdleBase", true);
            this.portraits.set("Maria", maria.getPortrait());
    
            nodes = this.cache.json.get('stairsMorningDay4');
            let mariaNode = super.readNodes(nodes, "day4\\stairsMorningDay4", "maria", true);
        }
        
    }
}

class CorridorMorningDay4 extends CorridorBase {
    constructor() {
        super('CorridorMorningDay4');
    }

    create(params) {
        super.create(params);

        this.stairs = "StairsMorningDay4";
        this.class = "ClassFrontMorningDay4";
        
        // Tablon de anuncios
        let bulletinBoard = this.add.rectangle(2261 * this.scale, 388 * this.scale, 570 * this.scale, 590 * this.scale, 0xfff, 0).setOrigin(0, 0);
        bulletinBoard.setInteractive({ useHandCursor: true });
        bulletinBoard.on('pointerdown', () => {
            this.gameManager.interacted("bulletinBoard", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .send();
            this.dialogManager.setNode(boardNode);
        });

        // Si no se llega tarde, se colocan personajes en el fondo
        if (!this.gameManager.getValue("isLate")) {
            let tr = {
                x: this.rightBound * 0.6,
                y: this.CANVAS_HEIGHT * 0.75,
                scale: 0.087
            };
            let ana = new Character(this, "Ana", tr, this.portraitTr, () => {
                this.dialogManager.setNode(alexAnaNode);
            });
            ana.setScale(-tr.scale, tr.scale);
            ana.setAnimation("IdleBase", true);
            this.portraits.set("Ana", ana.getPortrait());

            tr = {
                x: this.rightBound * 0.65,
                y: this.CANVAS_HEIGHT * 0.75,
                scale: 0.092
            };
            let alex = new Character(this, "Alex_front", tr, this.portraitTr, () => {
                this.dialogManager.setNode(alexAnaNode);
            });
            alex.setScale(-tr.scale, tr.scale);
            alex.setAnimation("IdleBase", true);
            this.portraits.set("Alex", alex.getPortrait());

            let nodes = this.cache.json.get('corridorMorningDay4');
            let alexAnaNode = super.readNodes(nodes, "day4\\corridorMorningDay4", "alexAna", true);
        }

        let nodes = this.cache.json.get('corridorMorningDay4');
        let boardNode = super.readNodes(nodes, "day4\\corridorMorningDay4", "board", true);
    }
}

class ClassFrontMorningDay4 extends ClassFrontBase {
    constructor() {
        super('ClassFrontMorningDay4');
    }

    create(params) {
        super.create(params);

        let teacher = this.add.image(this.portraitTr.x, this.portraitTr.y + 20, 'teacherChar').setOrigin(0.5, 1).setScale(this.portraitTr.scale);
        this.portraits.set("teacher", teacher);

        // Si no se ha llegado tarde, pone el nodo de dialogo al interactuar con las mesas
        if (!this.gameManager.getValue("isLate")) {
            let nodes = this.cache.json.get('everydayDialog');
            this.tablesNode = super.readNodes(nodes, "everydayDialog", "class.table", true);
        }
        // Si no, se colocan mas alumnos en la clase y se pone directamente el nodo del profesor
        else {
            let tr = {
                x: 160,
                y: this.CANVAS_HEIGHT * 0.51,
                scale: this.scale * 1.4
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar3').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row1Chairs.depth);

            tr = {
                x: 680,
                y: this.CANVAS_HEIGHT * 0.55,
                scale: this.scale * 1.4
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar2').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row1Chairs.depth);

            tr = {
                x: 1150,
                y: this.CANVAS_HEIGHT * 0.55,
                scale: this.scale * 1.4
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar4').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row1Chairs.depth);


            tr = {
                x: 280,
                y: this.CANVAS_HEIGHT * 0.54,
                scale: this.scale * 1
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar8').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row2Chairs.depth);

            tr = {
                x: 720,
                y: this.CANVAS_HEIGHT * 0.54,
                scale: this.scale * 1
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar10').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row2Chairs.depth);

            tr = {
                x: 1060,
                y: this.CANVAS_HEIGHT * 0.54,
                scale: this.scale * 1.1
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar11').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row2Chairs.depth);


            tr = {
                x: 1560,
                y: this.CANVAS_HEIGHT * 0.52,
                scale: this.scale * 0.9
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar7').setOrigin(0, 0).setScale(-tr.scale, tr.scale).setDepth(this.row3Chairs.depth);

            tr = {
                x: 1200,
                y: this.CANVAS_HEIGHT * 0.52,
                scale: this.scale * 0.8
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar12').setOrigin(0, 0).setScale(-tr.scale, tr.scale).setDepth(this.row3Chairs.depth);


            tr = {
                x: 510,
                y: this.CANVAS_HEIGHT * 0.49,
                scale: this.scale * 0.76
            };
            this.add.image(tr.x, tr.y, this.atlasName, 'frontChar9').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row4Chairs.depth);


            let nodes = this.cache.json.get('everydayDialog');
            let teacherNode = super.readNodes(nodes, "everydayDialog", "class.late", true);
            setTimeout(() => {
                this.dialogManager.setNode(teacherNode);               
            }, 50);
        }


        // Evento llamado cuando terminan los dialogos y empieza la clase
        this.dispatcher.addOnce("startClass", this, (obj) => {
            let sceneName = 'TextOnlyScene';
            let nextScene = 'ClassBackBreakDay4';

            // Se obtiene el texto de la escena de transicion del archivo de traducciones 
            let text = this.i18next.t("day4.startClass", { ns: "transitionScenes", returnObjects: true });
            if (this.gameManager.getValue("passwordExchanged")) {
                text = this.i18next.t("day4.endDay", { ns: "transitionScenes", returnObjects: true });
                nextScene = 'PlaygroundAfternoonDay4';
            }

            let params = {
                text: text,
                onComplete: () => {
                    this.gameManager.changeScene(nextScene);
                },
                onCompleteDelay: 500
            };

            // Se cambia a la escena de transicion
            this.gameManager.changeScene(sceneName, params);
        });
    }
}

class ClassBackBreakDay4 extends ClassBackBase {
    constructor() {
        super('ClassBackBreakDay4');
    }

    create(params) {
        super.create(params);

        this.corridor = "CorridorBreakDay4";

        // Cambia la hora del movil
        this.phoneManager.setDayInfo("startBreak");

        // Personajes
        let tr = {
            x: this.rightBound * 0.305,
            y: this.CANVAS_HEIGHT * 0.59,
            scale: this.scale * 0.33
        };
        this.add.image(tr.x, tr.y, this.atlasName, 'backChar11').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row1Chairs.depth - 1);

        tr = {
            x: this.rightBound * 0.44,
            y: this.CANVAS_HEIGHT * 0.58,
            scale: this.scale * 0.37
        };
        this.add.image(tr.x, tr.y, this.atlasName, 'backChar15').setOrigin(0, 0).setScale(tr.scale).setDepth(this.row1Chairs.depth - 1);

        // Se desactiva el telefono y se muestra el dialogo de que ha desaparecido
        this.phoneManager.activate(false);
        let nodes = this.cache.json.get('classBackBreakDay4');
        let node = super.readNodes(nodes, "day4\\classBackBreakDay4", "noPhone", true);
        setTimeout(() => {
            this.dialogManager.setNode(node);
        }, 100);

    }
}

class CorridorBreakDay4 extends CorridorBase {
    constructor() {
        super('CorridorBreakDay4');
    }

    create(params) {
        super.create(params);

        this.stairs = "StairsBreakDay4";
        this.class = "PlaygroundAfternoonDay4";
        this.classChangeParams = {
            camPos: "right"
        };
        
        // Cambia la hora del movil
        this.phoneManager.setDayInfo("midBreak");
        

        let tr = {
            x: 250,
            y: this.CANVAS_HEIGHT * 0.75,
            scale: 0.087
        };
        let maria = new Character(this, "Maria", tr, this.portraitTr, () => {
            this.dialogManager.setNode(mariaNode);
        });
        maria.setAnimation("IdleBase", true);
        this.portraits.set("Maria", maria.getPortrait());
        
        let nodes = this.cache.json.get('corridorBreakDay4');
        let mariaNode = super.readNodes(nodes, "day4\\corridorBreakDay4", "maria", true);

        
        // Se activa el acceso al bano opuesto
        if (this.gameManager.getUserInfo().gender === "male") {
            this.girlsRestroomNode = super.readNodes(nodes, "day4\\corridorBreakDay4", "restroom", true);
        } 
        else {
            this.boysRestroomNode = super.readNodes(nodes, "day4\\corridorBreakDay4", "restroom", true);
        }

        this.dispatcher.add("enterRestroom", this, (obj) => {
            let params = {
                camPos: "right",
                corridor: this
            };
            if (this.gameManager.getUserInfo().gender === "male") {
                this.gameManager.changeScene(this.girlsRestroom, params, true);
            } 
            else {
                this.gameManager.changeScene(this.boysRestroom, params, true);
            }
        });
        
        

        nodes = this.cache.json.get('everydayDialog');
        this.classNode = super.readNodes(nodes, "everydayDialog", "corridor.class", true);
        
        
        
    }

    
}

class StairsBreakDay4 extends StairsBase {
    constructor() {
        super('StairsBreakDay4');
    }

    create(params) {
        super.create(params);

        this.playground = "PlaygroundBreakDay4";
        this.corridor = "CorridorBreakDay4";

        // Cambia la hora del movil
        this.phoneManager.setDayInfo("endBreak");


        let tr = {
            x: 70,
            y: this.CANVAS_HEIGHT * 0.85,
            scale: 0.13
        };
        let guille = new Character(this, "Guille", tr, this.portraitTr, () => {
            this.dialogManager.setNode(guilleAlisonNode);
        });
        guille.setScale(-tr.scale, tr.scale);
        guille.setAnimation("IdleBase", true);
        this.portraits.set("Guille", guille.getPortrait());

        tr = {
            x: 230,
            y: this.CANVAS_HEIGHT * 0.85,
            scale: 0.12
        };
        let alison = new Character(this, "Alison", tr, this.portraitTr, () => {
            this.dialogManager.setNode(guilleAlisonNode);
        });
        alison.setAnimation("IdleBase", true);
        this.portraits.set("Alison", alison.getPortrait());
        
        let nodes = this.cache.json.get('stairsBreakDay4');
        let guilleAlisonNode = super.readNodes(nodes, "day4\\stairsBreakDay4", "guilleAlison", true);
        

        // Prepara las tandas de opciones. Solo se hace una vez, 
        // y quita de las opciones aquellas que no se puedan elegir
        this.dispatcher.addOnce("prepareChoicesGuilleAlison", this, (obj) => {
            this.dialogManager.activateOptions(false, () => {
                let node = this.dialogManager.currNode;

                // Si no se encuentra el telefono, se quita la opcion de preguntar quien lo ha dejado en el bano
                if (!this.gameManager.getValue("phoneFound")) {
                    node.choices.splice(0, 1);
                    node.next.splice(0, 1);
                }
                // Si no, se quita la opcion de preguntar si saben donde esta el movil
                else {
                    node.choices.splice(1, 1);
                    node.next.splice(1, 1);
                }
                

                this.dialogManager.setTalking(false);
                this.dialogManager.setNode(node);
            }, 0, true);

        });
    }
}

class PlaygroundBreakDay4 extends PlaygroundBase {
    constructor() {
        super('PlaygroundBreakDay4');
    }

    create(params) {
        super.create(params);

        this.home = "";
        this.stairs = "StairsBreakDay4";

        // Se abren las puertas 
        super.openDoors();
        this.doorNode = null;

        // Personajes
        let tr = {
            x: this.rightBound * 0.05,
            y: this.CANVAS_HEIGHT * 1.02,
            scale: 0.08
        };
        let ana = new Character(this, "Ana", tr, this.portraitTr, () => {
            this.dialogManager.setNode(ana_alexNode);
        });
        ana.setScale(-tr.scale, tr.scale);
        ana.setAnimation("IdleBase", true);
        this.portraits.set("Ana", ana.getPortrait());

        tr = {
            x: this.rightBound * 0.1,
            y: this.CANVAS_HEIGHT * 1.02,
            scale: 0.09
        };
        let alex = new Character(this, "Alex_front", tr, this.portraitTr, () => {
            this.dialogManager.setNode(ana_alexNode);
        });
        alex.setScale(-tr.scale, tr.scale);
        alex.setAnimation("IdleBase", true);
        this.portraits.set("Alex", alex.getPortrait());
        

        let nodes = this.cache.json.get('playgroundBreakDay4');
        let ana_alexNode = super.readNodes(nodes, "day4\\playgroundBreakDay4", "alex_ana", true);
                
        nodes = this.cache.json.get('everydayDialog');
        this.homeNode = super.readNodes(nodes, "everydayDialog", "playground.homeBreak", true);


        // Prepara las tandas de opciones. Solo se hace una vez, 
        // y quita de las opciones aquellas que no se puedan elegir
        this.dispatcher.addOnce("prepareChoicesAlexAna", this, (obj) => {
            this.dialogManager.activateOptions(false, () => {
                let node = this.dialogManager.currNode;

                // Si no se encuentra el telefono, se quita la opcion de preguntar quien lo ha dejado en el bano
                if (!this.gameManager.getValue("phoneFound")) {
                    node.choices.splice(0, 1);
                    node.next.splice(0, 1);
                }
                // Si no, se quita la opcion de preguntar si saben donde esta el movil
                else {
                    node.choices.splice(1, 1);
                    node.next.splice(1, 1);
                }

                this.dialogManager.setTalking(false);
                this.dialogManager.setNode(node);
            }, 0, true);

        });
    }
}

class PlaygroundAfternoonDay4 extends PlaygroundBase {
    constructor() {
        super('PlaygroundAfternoonDay4');
    }

    create(params) {
        super.create(params);

        this.home = "LivingroomAfternoonDay4";

        // Cambia la hora del movil
        this.phoneManager.setDayInfo("endClass");
        
        let nodes = this.cache.json.get('everydayDialog');
        this.doorNode = super.readNodes(nodes, "everydayDialog","playground.doorAfternoon", true);

        // Si no se han intercambiado contrasenas, sale el dialogo de la nota
        if (!this.gameManager.getValue("passwordExchanged")) {
            setTimeout(() => {
                nodes = this.cache.json.get('playgroundAfternoonDay4');
                let node = super.readNodes(nodes, "day4\\playgroundAfternoonDay4", "note", true);
                this.dialogManager.setNode(node);
            }, 100);

        }
    }
}

class LivingroomAfternoonDay4 extends LivingroomBase {
    constructor() {
        super('LivingroomAfternoonDay4');
    }

    create(params) {
        super.create(params);

        this.bedroom = "BedroomAfternoonDay4";
        this.playground = "";

        // Cambia la hora del movil
        this.phoneManager.setDayInfo("returnHome");

        // Personajes
        let tr = {
            x: this.rightBound * 0.45,
            y: this.CANVAS_HEIGHT * 0.735,
            scale: 0.14
        };
        let mom = new Character(this, "mom", tr, this.portraitTr, () => {
            this.dialogManager.setNode(momNode);
        });
        mom.setAnimation("IdleBase", true);
        this.portraits.set("mom", mom.getPortrait());

        tr = {
            x: this.rightBound * 0.4,
            y: this.CANVAS_HEIGHT * 0.72,
            scale: 0.15
        };
        let dad = new Character(this, "dad", tr, this.portraitTr, () => {
            this.dialogManager.setNode(dadNode);
        });
        dad.setAnimation("IdleBase", true);
        this.portraits.set("dad", dad.getPortrait());

        let nodes = this.cache.json.get('livingroomAfternoonDay4');
        let momNode = super.readNodes(nodes, "day4\\livingroomAfternoonDay4", "mom", true);
        let dadNode = super.readNodes(nodes, "day4\\livingroomAfternoonDay4", "dad", true);

        nodes = this.cache.json.get('everydayDialog');
        this.doorNode = super.readNodes(nodes, "everydayDialog", "livingroom.doorAfternoon", true);

        // Si se ha perdido y encontrado el telefono, sale el dialogo de cambiar la bateria
        if (!this.gameManager.getValue("passwordExchanged") && this.gameManager.getValue("phoneFound")) {
            nodes = this.cache.json.get('livingroomAfternoonDay4');
            let node = super.readNodes(nodes, "day4\\livingroomAfternoonDay4", "noPhone", true);
            this.dialogManager.setNode(node);

            this.dispatcher.addOnce("turnPhone", this, (obj) => {
                this.phoneManager.activate(true);

                let chatName = this.i18next.t("textMessages.chat2", { ns: "phoneInfo", returnObjects: true });
                let phoneNode = super.readNodes(nodes, "day4\\livingroomAfternoonDay4", "classChat", true);
                this.phoneManager.phone.setChatNode(chatName, phoneNode);

                chatName = this.i18next.t("textMessages.chat3", { ns: "phoneInfo", returnObjects: true });
                this.phoneManager.phone.addChat(chatName, "Maria");
                phoneNode = super.readNodes(nodes, "day4\\livingroomAfternoonDay4", "mariaChat", true);
                this.phoneManager.phone.setChatNode(chatName, phoneNode);
            });
        }


        // Prepara las tandas de opciones. Solo se hace una vez, 
        // y quita de las opciones aquellas que no se puedan elegir
        this.dispatcher.addOnce("prepareChoices1", this, (obj) => {
            this.dialogManager.activateOptions(false, () => {
                let node = this.dialogManager.currNode;
                
                // Si se ha hablado de gastarle la broma a Maria
                if (this.gameManager.getValue("askedPrank")) {
                    // Si se gasta la broma, quita la opcion de que han intentado chantajear al jugador
                    if (this.gameManager.getValue("pranked")) {
                        node.choices.splice(1, 1);
                        node.next.splice(1, 1);    
                    }
                    // Si no se gasta la broma, quita la opcion de que han chantajeado al jugador
                    else {
                        node.choices.splice(2, 1);
                        node.next.splice(2, 1);
                    }
                }
                // Si no, quita las dos opciones para hablar sobre la broma a Maria
                else {
                    node.choices.splice(1, 2);
                    node.next.splice(1, 2);    
                }

                this.dialogManager.setTalking(false);
                this.dialogManager.setNode(node);
            }, 0, true);
            
        });

        this.dispatcher.addOnce("prepareChoices2", this, (obj) => {
            this.dialogManager.activateOptions(false, () => {
                let node = this.dialogManager.currNode;
                
                // Si se ha perdido el movil (no se han intercambiado las contrasenas)
                if (!this.gameManager.getValue("passwordExchanged")) {
                    // Se quita la opcion de hablar sobre Alison
                    node.choices.splice(2, 1);
                    node.next.splice(2, 1);
                    
                    // Si se recupera el movil, se quita la opcion de no haber encontrado el movil
                    if (this.gameManager.getValue("phoneFound")) {
                        node.choices.splice(0, 1);
                        node.next.splice(0, 1);
                        
                    }
                    // Si no, se quita la opcion de que alguien le ha quitado el movil al jugador
                    else {
                        node.choices.splice(1, 1);
                        node.next.splice(1, 1);
                    }
                }
                // Si no, quita las dos opciones para hablar sobre el movil
                else {
                    node.choices.splice(0, 2);
                    node.next.splice(0, 2);    
                }

                this.dialogManager.setTalking(false);
                this.dialogManager.setNode(node);
            }, 0, true);
            
        });
    }

}

class BedroomAfternoonDay4 extends BedroomBase {
    constructor() {
        super('BedroomAfternoonDay4');
    }

    create(params) {
        super.create(params);

        this.livingroom = "LivingroomAfternoonDay4";


        if (this.gameManager.hasValue("passwordExchanged")) {
            let passwordExchanged = this.gameManager.getValue("passwordExchanged");
            if (passwordExchanged) {
                // Crear la informacion correspondiente en el ordenador
                this.socialNetwork.createDailyPosts(4);
            }
        }

        let nodes = this.cache.json.get('bedroomAfternoonDay4');

        // Dialogos del interior del armario y la cama
        this.wardrobe1Node = super.readNodes(nodes, "day4\\bedroomAfternoonDay4", "wardrobe1", true);
        this.wardrobe2Node = super.readNodes(nodes, "day4\\bedroomAfternoonDay4", "wardrobe2", true);
        this.bedNode = super.readNodes(nodes, "day4\\bedroomAfternoonDay4", "bed", true);

        // Mochila
        nodes = this.cache.json.get('everydayDialog');
        let bagNode = super.readNodes(nodes, "everydayDialog", "bedroom.bagAfternoon", true);
        let bag = this.add.image(3050 * this.scale, 625 * this.scale, this.atlasName, 'bag').setOrigin(0.5, 0).setScale(this.scale * 0.8).setDepth(3);
        bag.flipX = true;
        bag.setInteractive({ useHandCursor: true });
        bag.on('pointerdown', () => {
            this.gameManager.interacted("bag", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .send();
            this.dialogManager.setNode(bagNode);
        });


        // Ordenador (el mismo nodo que el de por la manana, pero sin el dialogo del jugador)
        let node = super.readNodes(nodes, "everydayDialog", "bedroom.pc", true);
        node = node.next[0];
        this.pcNode = node;

        // Ropa
        this.add.image(920 * this.scale, 1257 * this.scale + 5, this.atlasName, 'clothes3').setOrigin(0, 0).setScale(this.scale * 0.85).setDepth(this.chair.depth + 1);


        // Evento llamado cuando se elimina la publicacion con el numero de telefono. Anade el chat de Alex y envia un mensaje
        this.dispatcher.addOnce("addMessageToAlex", this, (obj) => {
            nodes = this.cache.json.get('bedroomAfternoonDay4');
            let chatName = this.i18next.t("textMessages.chat4", { ns: "phoneInfo", returnObjects: true });
            this.phoneManager.phone.addChat(chatName, "Alex");
            let phoneNode = super.readNodes(nodes, "day4\\bedroomAfternoonDay4", "phone", true);
            this.phoneManager.phone.setChatNode(chatName, phoneNode);
        });
    }
}

class StairsMorningDay5 extends StairsBase {
    constructor() {
        super('StairsMorningDay5');
    }

    create(params) {
        super.create(params);

        this.playground = "PlaygroundMorningDay5";
        this.corridor = "CorridorMorningDay5";

        let nodes = this.cache.json.get('everydayDialog');
        this.playgroundNode = super.readNodes(nodes, "everydayDialog", "stairs.downstairs", true);


        let tr = {
            x: this.rightBound * 0.75,
            y: this.CANVAS_HEIGHT * 0.81,
            scale: 0.12
        };
        let jose = new Character(this, "Jose", tr, this.portraitTr, () => {
            this.dialogManager.setNode(joseNode);
        });
        jose.setAnimation("IdleBase", true);
        this.portraits.set("Jose", jose.getPortrait());

        nodes = this.cache.json.get('stairsMorningDay5');
        let joseNode = super.readNodes(nodes, "day5\\stairsMorningDay5", "jose", true);
        
        // Se muestra el dialogo de Jose directamente
        setTimeout(() => {
            this.dialogManager.setNode(joseNode);
        }, 100);
    }
}

class ReportablePhoto extends Phaser.GameObjects.Container {
    /**
     * Foto denunciable que se mueve de forma aleatoria por el mapa cada vez que se pasa el cursor por encima de ella
     * y que despues de haber pasado un numero de veces concreto el cursor, se ejecuta una funcion
     * @param {Phaser.Scene} scene - escena a la que pertenece  
     * @param {Number} scale - escala de la foto 
     * @param {String} frame - imagen que se utiliza en la foto
     * @param {Number} speed - velocidad a la que se desplaza la foto
     * @param {Number} minTouches 
     * @param {Number} maxTouches
     *      El numero minimo de veces que hay que pasar el cursor por encima de la foto para que se ejecute la funcion es
     *      un valor aleatorio [minTouches, maxTouches] 
     * @param {Function} onTouched - funcion que se ejecuta cuando se ha pasado el cursor un numero de veces concreto
     * @param {Object} pos - posicion inicial de la foto (opciona, sino se coge una aleatoria) 
     * @param {Boolean} startMoving - tiene dos funcionamientos iniciales (true si comienza moviendose o false si hay que pasar el cursor por encima) 
     */
    constructor(scene, scale, frame, speed, minTouches, maxTouches, onTouched, pos, startMoving) {
        super(scene, 0, 0);

        const CANVAS_WIDTH = this.scene.sys.game.canvas.width;
        const CANVAS_HEIGHT = this.scene.sys.game.canvas.height;

        this.scene.add.existing(this);

        let gameManager = GameManager.getInstance();

        this.setScale(scale);
        // Poder tener preUpdate
        this.addToUpdateList();

        // Minima distancia de separacion a la que el punto aleatorio debe encontrarse para evitar que la foto se desplace una distancia muy pequena
        this.randomPointThreshold = 300;
        // Maximo numero de intentos de buscar un punto aleatorio (evitar que se produzca un bucle infinito)
        this.maxAttempts = 15;
        // Distancia a la que debe encontrarse del target para que se considere que ha llegado a la posicion destino
        this.movThreshold = 50;
        
        // Numero de toques necesarios para que se ejecute la funcion
        // (minimo incluido, maximo incluido)
        this.nTouches = Phaser.Math.Between(minTouches, maxTouches);
        this.minTouches = minTouches;
        this.maxTouches = maxTouches;
        this.onTouched = onTouched;
        // Si se esta moviendo o se tiene que clciar
        this.allowMov = false;
        // Velocidad a la que se mueve
        this.speed = speed;

        // Foto
        this.frame = frame;
        this.image = this.scene.add.image(0, 0, 'photos', frame);
        this.add(this.image);

        // Block
        let blockImg = this.scene.add.image(0, 0, 'computerElements', 'block');
        blockImg.y -= this.image.displayHeight / 4;
        blockImg.setScale(1.8);
        this.add(blockImg);

        // Texto
        let padding = 3;
        let textStyle = { ...gameManager.textConfig };
        textStyle.fontFamily = 'gidolinya-regular';
        textStyle.fontSize = '84px';
        textStyle.fontBold = 'bold';
        textStyle.color = '#FF0000';
        textStyle.align = 'center';
        textStyle.wordWrap = {
            width: this.image.displayWidth - padding * 2,
            useAdvancedWrap: true
        };
        let textTranslation = gameManager.i18next.t('imageText', { ns: 'day4\\nightmareDay4' });
        let text = this.scene.add.text(0, 0, textTranslation, textStyle);
        text.setOrigin(0.5);
        text.y += text.displayHeight / 4;
        this.add(text);

        let width = this.image.displayWidth * scale;
        let height = this.image.displayHeight * scale;
        // Limites en los que puede aparecer un punto random (se considera tanto el tam del canvas como el de la propia foto)
        this.boundaries = {
            left: width / 2,
            right: CANVAS_WIDTH - width / 2,
            top: height / 2,
            bottom: CANVAS_HEIGHT - height / 2
        };

        // Setear la posicion inicial
        this.currentPos = new Phaser.Math.Vector2();
        if (!pos) {
            this.currentPos = this.getRandomPoint(false);
        }
        else {
            this.currentPos.set(pos.x, pos.y);
        }
        this.setPosition(this.currentPos.x, this.currentPos.y);
        // Objetivo
        this.target = {
            point: new Phaser.Math.Vector2(),           // punto destino
            currentDir: new Phaser.Math.Vector2(),      // direccion en cada frame (para poder calcular la distancia al punto destino)
            normDir: new Phaser.Math.Vector2()          // direccion normalizado (para ir moviendo la foto)
        };

        // Comienza moviendose o hay que pasar el cursor por encima
        if (startMoving) {
            this.move();
        }
        else {
            this.allowTouch();
        }
    }

    preUpdate(t, dt) {
        if (this.allowMov) {
            // Direccion hasta el objetivo
            this.target.currentDir.copy(this.target.point);
            this.target.currentDir.subtract(this.currentPos);

            // Se comprueba si la distancia es menor que el umbral
            if (this.target.currentDir.length() > this.movThreshold) {
                // Si no es menor, sigue moviendose
                this.currentPos.x = this.currentPos.x + this.target.normDir.x * this.speed * dt;
                this.currentPos.y = this.currentPos.y + this.target.normDir.y * this.speed * dt;
            }
            else {
                // Si es menor...
                // Se coloca en la posicion destino exacta
                this.currentPos.copy(this.target.point);
                // Deja de mover y ahora hay que pasar el cursor por encima
                this.allowTouch();
            }
            // Cambiar la pos de la foto
            this.setPosition(this.currentPos.x, this.currentPos.y);
        }
    }

    /**
     * Deja de moverse y ahora hay qeu pasar el cursor por encima
     */
    allowTouch() {
        // Vuevle a ser interactuable
        this.image.setInteractive({ useHandCursor: true });
        this.allowMov = false;

        // Evento cuando se pasa el cursor por encima
        this.image.once('pointerover', () => {
            // Pasa a moverse
            this.move();
            // Se reduce el numero de toques
            --this.nTouches;
            if (this.nTouches <= 0) {
                this.nTouches = Phaser.Math.Between(this.minTouches, this.maxTouches);
                if (this.onTouched) {
                    this.onTouched();
                }
            }
        });
    }

    move() {
        // Deja de ser interactuable
        this.image.removeInteractive();
        // Se calcula un nuevo punto destino
        this.target.point = this.getRandomPoint(true);
        this.target.currentDir.copy(this.target.point);
        this.target.currentDir.subtract(this.currentPos);
        this.target.normDir.copy(this.target.currentDir);
        this.target.normDir.normalize();
        this.allowMov = true;
    }

    /**
     * Obtener un punto aleatorio dentro de los limites
     * @param {Boolean} limit - true si es necesario que el punto este a la distancia minima oportuna, false en caso contrario 
     * @returns 
     */
    getRandomPoint(limit) {
        // Punto aleatorio
        let x = Phaser.Math.FloatBetween(this.boundaries.left, this.boundaries.right);
        let y = Phaser.Math.FloatBetween(this.boundaries.top, this.boundaries.bottom);
        let point = new Phaser.Math.Vector2(x, y);

        // Es necesario que el punto aleatorio este a la distancia minima oportuna de la distancia actual
        if (limit) {
            let direction = new Phaser.Math.Vector2();
            // copy -> copia el vector dado en el propio vector
            direction.copy(point);
            // subtract -> propio vector - vector dado
            // Entonces, en este caso seria: point - currentPos
            direction.subtract(this.currentPos);
            let attempts = 0;
            // Se comprueba si el punto aleatorio calcualdo es valido. Si no lo es, se sigue buscando otro
            while (direction.length() < this.randomPointThreshold && attempts < this.maxAttempts) {
                // (minimo incluido, maximo excluido)
                let x = Phaser.Math.FloatBetween(this.boundaries.left, this.boundaries.right);
                let y = Phaser.Math.FloatBetween(this.boundaries.top, this.boundaries.bottom);
                point.set(x, y);

                direction.copy(point);
                direction.subtract(this.currentPos);

                ++attempts;
            }
        }

        return point;
    }

    /**
     * Desactivar la funcionalidad de la foto (movimiento e interactividad)
     */
    stop() {
        this.allowMov = false;
        this.image.removeInteractive();
    }
}

class NightmareDay4 extends NightmareMinigame {
    /**
     * Pesadilla que aparece el dia 3
     * El minijuego consiste en imagenes que aparecen y que hay que tratar de pasar el cursor por encima de ellas para que desaparezcan
     * Sin embargo, es imposible hacerlas desaparecer y solo van a terminar apareciendo mas
     * El minijuego termina despues de cierto tiempo
     */
    constructor() {
        super(4, false);
    }

    create(params) {
        super.create(params);

        // Array para guardar todas las fotos y pararlas cuando haya pasado el tiempo oportuno
        this.photos = [];
        // Duracion del minijuego (18 segundos)
        this.nightmareDuration = 18000;
        this.elapsedTime = 0;
        // Si el minijuego ha empezado o no (para que comience a correr el contador)
        this.activatedMinigame = false;

        // Parametros de las fotos
        this.photosParams = {
            scale: 0.54,
            speed: 5,
            minTouches: 5,
            maxTouches: 8
        };
        // Parametros del terremoto que ocurre cuando se duplica una foto
        this.shakeParams = {
            duration: 95,
            intensity: 0.075
        };

        // Imagenes que pueden aparecer
        this.sprites = ['photoDog'];
        let userInfo = this.gameManager.getUserInfo();
        // Cambia en funcion del genero del personaje
        if (userInfo.gender == "male") {
            this.sprites.push('photoForeheadBoy', 'photoNumberBoy');
        }
        else if (userInfo.gender == "female") {
            this.sprites.push('photoForeheadGirl', 'photoNumberGirl');
        }
        // Cambia en funcion de si el personaje se el personaje se ha quitado el chicle del pantalon en el dia 2 o no
        if (this.gameManager.hasValue("gumWashed")) {
            let gumWashed = this.gameManager.getValue("gumWashed");
            if (gumWashed) {
                this.sprites.push('photoGumWashed');
            }
            else {
                this.sprites.push('photoGum');
            }
        }

        // Saber si hay un terremoto ya ejecutandose para que no se ejecuten varios a la vez
        this.shakeCompleted = true;
        this.cameras.main.on('camerashakecomplete', () => {
            this.shakeCompleted = true;
        });
    }

    /**
     * Crear una foto y hacer que la funcion que se ejecuta al pulsarla un numero determinado de clics
     * sea crear una foto desde su misma posicion que se mueve (como si se duplicara)
     */
    createPhoto(photosParams, startMoving, pos) {
        // Se coge una imagen aleatoria
        let randomSprite = Phaser.Math.Between(0, this.sprites.length - 1);
        // Se crea la foto segun los parametros
        let photo = new ReportablePhoto(this, photosParams.scale, this.sprites[randomSprite], photosParams.speed,
            photosParams.minTouches, photosParams.maxTouches, () => {
                xapiTracker.gameObject("photo_" + photo.frame, xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .interacted()
                            .send();
                // Cuando se ha pulsado un numero determinado de clics...
                // Se produce un terremoto
                if (this.shakeCompleted) {
                    this.shakeCompleted = false;
                    this.cameras.main.shake(this.shakeParams.duration, this.shakeParams.intensity);
                }
                // Se crea una nueva foto desde su misma posicion
                this.createPhoto(photosParams, true, { x: photo.x, y: photo.y });
            }, pos, startMoving);
        this.photos.push(photo);
    }

    update(t, dt) {
        super.update(t, dt);

        // Tiemmpo que dura el minijuego
        if (this.activatedMinigame) {
            this.elapsedTime += dt;
            if (this.elapsedTime > this.nightmareDuration) {
                this.elapsedTime = 0;
                this.onMinigameFinishes();
            }
        }
    }

    onMinigameStarts() {
        // Se crea la foto inicial, que empieza todo el minijuego
        this.createPhoto(this.photosParams, false);
        this.activatedMinigame = true;
    }

    onMinigameFinishes() {
        super.onMinigameFinishes();
        // Se paran todas las fotos
        this.photos.forEach((photo) => {
            photo.stop();
        });
        this.activatedMinigame = false;
    }
}

class BedroomMorningDay5 extends BedroomBase {
    constructor() {
        super('BedroomMorningDay5');
    }

    create(params) {
        super.create(params);

        this.livingroom = "LivingroomMorningDay5";

        let nodes = this.cache.json.get('bedroomMorningDay5');

        // Dialogos del interior del armario y la cama
        this.wardrobe1Node = super.readNodes(nodes, "day5\\bedroomMorningDay5", "wardrobe1", true);
        this.wardrobe2Node = super.readNodes(nodes, "day5\\bedroomMorningDay5", "wardrobe2", true);
        this.bedNode = super.readNodes(nodes, "day5\\bedroomMorningDay5", "bed", true);
        this.pcNode = super.readNodes(nodes, "day5\\bedroomMorningDay5", "pc", true);
        
        // Mochila
        let bagNode = super.readNodes(nodes, "day5\\bedroomMorningDay5", "bag", true);
        let bag =  this.add.image(3050 * this.scale, 625 * this.scale, this.atlasName, 'bag').setOrigin(0.5, 0).setScale(this.scale * 0.8).setDepth(3);
        bag.flipX = true;
        bag.setInteractive({ useHandCursor: true });
        bag.on('pointerdown', () => {
            this.gameManager.interacted("bag", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .withResultExtension("bagPicked", true)
                            .send();
            this.dialogManager.setNode(bagNode);
        });

        // Ropa
        this.add.image(920 * this.scale, 1257 * this.scale + 5, this.atlasName, 'clothes3').setOrigin(0, 0).setScale(this.scale * 0.85).setDepth(this.chair.depth + 1);


        // Evento que se llama al coger la mochila. Hace que la mochila desaparezca con 
        // una animacion (la variable de coger la mochila la cambia el propio evento)
        this.dispatcher.addOnce("pickBag", this, (obj) => {
            bag.disableInteractive();
            this.tweens.add({
                targets: bag,
                alpha: { from: 1, to: 0 },
                duration: 100,
                repeat: 0,
            });
        });

    }
}

class LivingroomMorningDay5 extends LivingroomBase {
    constructor() {
        super('LivingroomMorningDay5');
    }

    create(params) {
        super.create(params);

        this.bedroom = "BedroomMorningDay5";
        this.playground = "PlaygroundMorningDay5";
    }
}

class PlaygroundMorningDay5 extends PlaygroundBase {
    constructor() {
        super('PlaygroundMorningDay5');
    }

    create(params) {
        super.create(params);

        this.home = "";
        this.stairs = "StairsMorningDay5";
        
        let tr = {
            x: this.rightBound * 0.4,
            y: this.CANVAS_HEIGHT * 0.89,
            scale: 0.055
        };
        let alison = new Character(this, "Alison", tr, this.portraitTr, () => {
            this.dialogManager.setNode(alisonNode);
        });
        alison.setAnimation("IdleBase", true);
        this.portraits.set("Alison", alison.getPortrait());

        tr = {
            x: this.rightBound * 0.37,
            y: this.CANVAS_HEIGHT * 0.87,
            scale: 0.055
        };
        let ana = new Character(this, "Ana", tr, this.portraitTr, () => {
            this.dialogManager.setNode(anaNode);
        });
        ana.setAnimation("IdleBase", true);
        this.portraits.set("Ana", ana.getPortrait());

        let nodes = this.cache.json.get('playgroundMorningDay5');
        let alisonNode = super.readNodes(nodes, "day5\\playgroundMorningDay5", "alison", true);
        let anaNode = super.readNodes(nodes, "day5\\playgroundMorningDay5", "ana", true);
        
        nodes = this.cache.json.get('everydayDialog');
        this.homeNode = super.readNodes(nodes, "everydayDialog", "playground.homeMorning", true);

        // Se muestra el dialogo de Ana directamente
        setTimeout(() => {
            this.dialogManager.setNode(anaNode);
        }, 100);

        // Evento llamado cuando suena la campana
        this.dispatcher.addOnce("openDoors", this, (obj) => {
            // Cambia la hora del movil
            this.phoneManager.setDayInfo("classStart");

            // Se quita el dialogo que aparece al hacer click en las puertas y se abren
            this.doorNode = null;
            super.openDoors();
        });
    }
}

class CorridorMorningDay5 extends CorridorBase {
    constructor() {
        super('CorridorMorningDay5');
    }

    create(params) {
        super.create(params);

        this.stairs = "StairsMorningDay5";
        this.class = "ClassFrontMorningDay5";
        
        let tr = {
            x: this.rightBound * 0.49,
            y: this.CANVAS_HEIGHT * 0.7,
            scale: 0.065
        };
        let alex = new Character(this, "Alex_front", tr, this.portraitTr, () => {
            this.dialogManager.setNode(alexNode);
        });
        alex.setScale(-tr.scale, tr.scale);
        alex.setAnimation("IdleBase", true);
        this.portraits.set("Alex", alex.getPortrait());

        tr = {
            x: this.rightBound * 0.2,
            y: this.CANVAS_HEIGHT * 0.72,
            scale: 0.075
        };
        let guille = new Character(this, "Guille", tr, this.portraitTr, () => {
            this.dialogManager.setNode(guilleNode);
        });
        guille.setScale(-tr.scale, tr.scale);
        guille.setAnimation("IdleBase", true);
        this.portraits.set("Guille", guille.getPortrait());

        let nodes = this.cache.json.get('corridorMorningDay5');
        let alexNode = super.readNodes(nodes, "day5\\corridorMorningDay5", "alex", true);
        let guilleNode = super.readNodes(nodes, "day5\\corridorMorningDay5", "guille", true);
        
        // Se muestra el dialogo de Jose directamente
        setTimeout(() => {
            this.dialogManager.setNode(alexNode);
        }, 100);
    }
}

class ClassFrontMorningDay5 extends ClassFrontBase {
    constructor() {
        super('ClassFrontMorningDay5');
    }

    create(params) {
        super.create(params);

        let teacher = this.add.image(this.portraitTr.x, this.portraitTr.y + 20, 'teacherChar').setOrigin(0.5, 1).setScale(this.portraitTr.scale);
        this.portraits.set("teacher", teacher);

        // Se pone el nodo de dialogo al interactuar con las mesas
        let nodes = this.cache.json.get('everydayDialog');
        this.tablesNode = super.readNodes(nodes, "everydayDialog", "class.table", true);


        // Evento llamado cuando terminan los dialogos y empieza la clase
        this.dispatcher.addOnce("startClass", this, (obj) => {
            let sceneName = 'TextOnlyScene';

            // Se obtiene el texto de la escena de transicion del archivo de traducciones 
            let text = this.i18next.t("day5.startClass", { ns: "transitionScenes", returnObjects: true });

            let params = {
                text: text,
                onComplete: () => {
                    this.gameManager.changeScene("ClassBackAfternoonDay5");
                },
                onCompleteDelay: 500
            };

            // Se cambia a la escena de transicion
            this.gameManager.changeScene(sceneName, params);
        });
    }
}

class ClassBackAfternoonDay5 extends ClassBackBase {
    constructor() {
        super('ClassBackAfternoonDay5');
    }

    create(params) {
        super.create(params);

        this.corridor = "CorridorAfternoonDay5";

        // Cambia la hora del movil
        this.phoneManager.setDayInfo("afternoon.endClass");

        let nodes = this.cache.json.get('classCorridorAfternoonDay5');
        let node = super.readNodes(nodes, "day5\\classCorridorAfternoonDay5", "player_stairs", true);
        setTimeout( () => {
            this.dialogManager.setNode(node);
        }, 100);

    }
}

class CorridorAfternoonDay5 extends CorridorBase {
    constructor() {
        super('CorridorAfternoonDay5');
    }

    create(params) {
        super.create(params);

        this.stairs = "StairsAfternoonDay5";
        this.class = "";

        if (this.gameManager.getUserInfo().gender === "male") {
            this.boysRestroom = "RestroomAfternoonDay5";
            this.girlsRestroom = "OppositeRestroom";
        }
        else {
            this.girlsRestroom = "RestroomAfternoonDay5";
            this.boysRestroom = "OppositeRestroom";
        }

        // Cambia la hora del movil
        this.phoneManager.setDayInfo("afternoon.corridor");
        
        let nodes = this.cache.json.get('classCorridorAfternoonDay5');
        this.classNode = super.readNodes(nodes, "day5\\classCorridorAfternoonDay5", "class", true);

        // Cuando se vuelve al pasillo, aparece Alex en la puerta
        this.dispatcher.addOnce("returnToCorridor", this, (obj) => {
            let tr = {
                x: this.rightBound * 0.3,
                y: this.CANVAS_HEIGHT * 0.625,
                scale: 0.043
            };
            let alex = new Character(this, "Alex_front", tr, this.portraitTr, () => {
                this.dialogManager.setNode(this.stairsNode);
            });
            alex.setAnimation("IdleBase", true);
            this.portraits.set("Alex", alex.getPortrait());

            this.stairsNode = super.readNodes(nodes, "day5\\classCorridorAfternoonDay5", "alex_corridor", true);
        });

        
    }

    
}

class StairsAfternoonDay5 extends StairsBase {
    constructor() {
        super('StairsAfternoonDay5');
    }

    create(params) {
        super.create(params);

        this.playground = "";
        this.corridor = "CorridorAfternoonDay5";

        let tr = {
            x: this.rightBound * 0.61,
            y: this.CANVAS_HEIGHT * 0.545,
            scale: 0.095
        };
        let alex = new Character(this, "Alex_front", tr, this.portraitTr, () => {
            this.dialogManager.setNode(alexNode);
        });
        alex.setScale(-tr.scale, tr.scale);
        alex.setAnimation("IdleBase", true);
        this.portraits.set("Alex", alex.getPortrait());

        let nodes = this.cache.json.get('classCorridorAfternoonDay5');
        let alexNode = super.readNodes(nodes, "day5\\classCorridorAfternoonDay5", "alex_stairs", true);
        
        // Se muestra el dialogo de Alex directamente
        setTimeout(() => {
            this.dialogManager.setNode(alexNode);
        }, 100);

        // Cuando termina el dialogo, se vuelve al pasillo
        this.dispatcher.addOnce("returnToCorridor", this, (obj) => {
            let params = {
                camPos: "left"
            };
            this.gameManager.changeScene(this.corridor, params, true);
        });
    }
    
}

class RestroomAfternoonDay5 extends RestroomBase {
    constructor() {
        super("RestroomAfternoonDay5");
    }

    create(params) {
        super.create(params);

        // Puerta al pasillo
        this.doorNode = null;
        let doorPos = {
            x: 1003 * this.scale,
            y: 168 * this.scale
        };
        let doorClosed = this.add.image(doorPos.x, doorPos.y, this.atlasName, 'restroomDoorClosed').setOrigin(0, 0).setScale(this.scale);
        doorClosed.setInteractive({ useHandCursor: true });
        doorClosed.on('pointerdown', () => {
            this.gameManager.interacted("restroomDoorclosed", xapiTracker.GAMEOBJECTTYPE.ITEM)
                            .send();
            this.dialogManager.setNode(doorNode);
        });

        // Profesor
        let tr = {
            x: 1295 * this.scale,
            y: 1370 * this.scale,
            scale: 0.16
        };
        let teacher = this.add.image(tr.x, tr.y, 'teacherChar').setOrigin(0.5, 1).setScale(tr.scale);
        let teacherPortrait = this.add.image(this.portraitTr.x, this.portraitTr.y + 20, 'teacherChar').setOrigin(0.5, 1).setScale(this.portraitTr.scale);
        this.portraits.set("teacher", teacherPortrait);
        teacher.visible = false;

        let nodes = this.cache.json.get('restroomAfternoonDay5');
        let doorNode = super.readNodes(nodes, "day5\\restroomAfternoonDay5", "door_enter", true);
        let enterNode = super.readNodes(nodes, "day5\\restroomAfternoonDay5", "enter", true);

        let BLACKOUT_TIMER = 15 * 1000;

        let black = this.add.rectangle(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT, 0x000, 1).setOrigin(0, 0).setScrollFactor(0).setDepth(this.stall3.depth + 1);
        black.visible = false;


        // Se muestra el dialogo de nada mas entrar directamente
        setTimeout(() => {
            this.dialogManager.setNode(enterNode);
        }, 100);


        this.dispatcher.addOnce("lightsOff", this, (obj) => {
            black.visible = true;

            // Se desactiva el icono del telefono para que no se pueda sacar durante esta escena
            this.phoneManager.activate(false);
        });

        this.dispatcher.addOnce("startTimer", this, (obj) => {
            // Forma geometrica para poder interactuar con los lavabos
            let graphics = this.add.graphics(0, 0);
            let sinkPolygon = new Phaser.Geom.Polygon([
                0, 80,
                240, 140,
                240, 430,
                450, 430,
                0, 830
            ]);
            // graphics.lineStyle(5, 0xFF00FF, 1.0).fillStyle(0xFFF, 1.0).fillPoints(sinkPolygon.points, true);
            graphics.generateTexture('sink', this.rightBound, this.CANVAS_HEIGHT);
            let sink = this.add.image(0, 0, 'sink').setOrigin(0, 0).setDepth(200);
            graphics.destroy();

            // Para las areas interactuables con forma de poligono, hay que hacerlas primero interactivas
            // y luego cambiar el cursor manualmente, ya que si no, toda la textura se vuelve interactuable
            sink.setInteractive(sinkPolygon, Phaser.Geom.Polygon.Contains);
            sink.input.cursor = 'pointer';
            sink.on('pointerdown', () => {
                this.gameManager.interacted("sink", xapiTracker.GAMEOBJECTTYPE.ITEM)
                                .send();
                this.dialogManager.setNode(sinkNode);
            });


            // Forma geometrica para poder interactuar con el suelo
            graphics = this.add.graphics(0, 0);
            let floorPolygon = new Phaser.Geom.Polygon([
                820, 670,
                870, 860,
                1390, 860,
                1180, 670
            ]);
            // graphics.lineStyle(5, 0xFF00FF, 1.0).fillStyle(0xFFF, 1.0).fillPoints(floorPolygon.points, true);
            graphics.generateTexture('floor', this.rightBound, this.CANVAS_HEIGHT);
            let floor = this.add.image(0, 0, 'floor').setOrigin(0, 0).setDepth(200);
            graphics.destroy();

            // Para las areas interactuables con forma de poligono, hay que hacerlas primero interactivas
            // y luego cambiar el cursor manualmente, ya que si no, toda la textura se vuelve interactuable
            floor.setInteractive(floorPolygon, Phaser.Geom.Polygon.Contains);
            floor.input.cursor = 'pointer';
            floor.on('pointerdown', () => {
                this.gameManager.interacted("floor", xapiTracker.GAMEOBJECTTYPE.ITEM)
                                .send();
                this.dialogManager.setNode(floorNode);
            });

            doorNode = super.readNodes(nodes, "day5\\restroomAfternoonDay5", "door_locked", true);
            let sinkNode = super.readNodes(nodes, "day5\\restroomAfternoonDay5", "sink", true);
            let floorNode = super.readNodes(nodes, "day5\\restroomAfternoonDay5", "floor", true);

            // Anade un temporizador durante el que el jugador puede interactuar con los elementos del fondo.
            // Cuando acabe el temporizador, volveran las luces, aparecera el profesor y comenzara su dialogo 
            setTimeout(() => {
                black.visible = false;
                this.dialogManager.textbox.activate(false, () => {
                    this.dialogManager.setNode(null);
                    let lightOnNode = super.readNodes(nodes, "day5\\restroomAfternoonDay5", "lightsOn", true);
                    this.dialogManager.setNode(lightOnNode);

                    doorNode = null;
                    sink.disableInteractive();
                    floor.disableInteractive();
                });
            }, BLACKOUT_TIMER);
        });


        // Evento que se llama cuando el profesor entra en el bano. Hace que la imagen del profesor sea visible 
        this.dispatcher.addOnce("enterTeacher", this, (obj) => {
            teacher.visible = true;
        });

        this.dispatcher.addOnce("goHome", this, (obj) => {
            let sceneName = 'TextOnlyScene';

            // Se obtiene el texto de la escena de transicion del archivo de traducciones 
            let text = this.i18next.t("day5.endDay", { ns: "transitionScenes", returnObjects: true });

            let params = {
                text: text,
                onComplete: () => {
                    this.gameManager.changeScene("NightmareDay5");
                },
                onCompleteDelay: 500
            };

            // Se cambia a la escena de transicion
            this.gameManager.changeScene(sceneName, params);

        });
    }
}

class NightmareDay5 extends NightmareBase {
    /**
     * Pesadilla que aparece el dia 5
     * Se trata de un monologo a modo de final, que varia dependiendo de las elecciones del jugador
     * Hay 3 finales posibles
     */
    constructor() {
        super(5);
    }

    create(params) {
        super.create(params);

        // Se oscure el fondo
        this.bg.setTint(Phaser.Display.Color.GetColor(51, 51, 51));

        // Colores que va a ir tomando el portal
        this.colors = [0x2B47FF, 0x29B8FF, 0x41DDB0, 0x24B6FF];
        this.elapsedTime = 0;
        // Tiempo maximo de vida de las particula
        this.maxTime = 3000;
        // En funcion del tiempo de vida maximo y el numero de colores, se calcula cada cuanto cambiar el color de las particulas
        this.timeToChangeColor = this.maxTime / this.colors.length;

        for (let i = 0; i < this.colors.length; ++i) {
            // Se convierten todos los colores a enteros
            this.colors[i] = Phaser.Display.Color.ValueToColor(this.colors[i]);
        }

        // Se interpola entre el color anterior a lastIndex y el que corresponde con lastIndex
        this.lastIndex = 1;
        // Colores seleccionados
        this.selectedColors = {
            first: this.colors[this.lastIndex - 1],
            second: this.colors[this.lastIndex]
        };

        // Se crea el portal, el cual esta formado por sistemas de particulas
        let portal = this.add.container(this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2.75);
        portal.setScale(0.85);

        // Fondo del portal
        this.bgEmitter = this.add.particles(0, 0, 'defaultParticle', {
            alpha: { start: 1, end: 0 },
            angle: { min: 0, max: 360 },
            blendMode: Phaser.BlendModes.SCREEN,        // los pixeles se invierten, se multiplican y luego, se vuelve a invertir (dibujo mas claro)
            frequency: 50,                              // cada cuanto tiempo se produce una emision de particulas
            lifespan: { min: 2000, max: this.maxTime }, // vida de cada particulas
            maxAliveParticles: 500,
            quantity: 5,                                // cuantas particulas se crean en cada emision
            scale: 0.35,
            speed: 100
        });
        this.bgEmitter.setParticleTint(this.selectedColors.first.color);
        portal.add(this.bgEmitter);

        // Centro del portal
        let centerEmitter = this.add.particles(0, 0, 'defaultParticle', {
            alpha: { start: 1, end: 0 },
            angle: { min: 0, max: 360 },
            blendMode: Phaser.BlendModes.NORMAL,
            lifespan: 1500,
            maxAliveParticles: 250,
            scale: 0.3,
            speed: 60,
            tint: this.colors[0].color
        });
        portal.add(centerEmitter);

        // IMPORTANTE: CAMBIAR LA CONFIGURACION ANTES DE LEER Y SETEAR EL NODO PARA QUE SE AJUSTE EL TEXTO CORRECTAMENTE      
        let dialogTextBox = this.dialogManager.textbox;
        let fontFamily = 'caladea-regular';
        dialogTextBox.normalTextConfig.fontFamily = fontFamily;
        dialogTextBox.normalTextConfig.fontSize = '30px';
        dialogTextBox.nameTextConfig.fontFamily = fontFamily;

        let node = this.readNodes("");

        // Se hace un fade in de la camara y cuando termina, se inicia el dialogo
        this.cameras.main.fadeIn(500, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, (cam, effect) => {
            setTimeout(() => {
                this.dialogManager.setNode(node);
            }, 500);
        });

        // Ha terminado el monologo del portal
        this.dispatcher.addOnce("endGame", this, () => {
            // Se hace un fade out de la camara y cuando termina, se cambia a la escena de fin
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, (cam, effect) => {
                setTimeout(() => {
                    let sceneName = 'TextOnlyScene';

                    // Se obtiene el texto de la escena de transicion del archivo de traducciones 
                    let text = this.i18next.t("day5.end", { ns: "transitionScenes" });

                    let textConfig = { ...this.gameManager.textConfig };
                    textConfig.fontFamily = 'kimberley';
                    textConfig.fontSize = '200px';
                    textConfig.align = 'center';

                    let params = {
                        text: text,
                        textConfig: textConfig,

                        onComplete: () => {
                            this.gameManager.progressedGame();
                            this.gameManager.startCreditsScene(true);
                        },
                        onCompleteDelay: 250
                    };

                    // Se cambia a la escena de transicion
                    this.gameManager.changeScene(sceneName, params);
                }, 500);
            });
        });
    }

    update(t, dt) {
        // Se van cambiando el color del fondo del portal entre los escogidos y los que se encuentran en medio
        this.elapsedTime += dt;

        this.elapsedTime = Math.min(this.elapsedTime, this.timeToChangeColor);

        // Se calcula el color intermedio en funcion del tiempo que tiene que pasar para cambiar de color y el tiempo que ha pasado
        let col = Phaser.Display.Color.Interpolate.ColorWithColor(this.selectedColors.first, this.selectedColors.second, this.timeToChangeColor, this.elapsedTime);
        col = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
        // Se cambia el color del fondo al color intermedio calculado anteriormente
        this.bgEmitter.setParticleTint(col);

        if (this.elapsedTime >= this.timeToChangeColor) {
            // Se cambian los colores entre los que se interpolan
            this.elapsedTime = 0;

            this.selectedColors.first = this.selectedColors.second;
            ++this.lastIndex;
            if (this.lastIndex >= this.colors.length) {
                this.lastIndex = 0;
            }
            this.selectedColors.second = this.colors[this.lastIndex];
        }
    }
}

class LoginScreen extends Phaser.GameObjects.Group {
    /**
     * Pantalla de login de la red social
     * @param {Pahser.scene} computerScene - escena del ordenador
     * @extends Phaser.GameObjects.Group - se utiliza un grupo porque permite modificar todos los objetos facilmente,
     *                                      pero sin que el renderizado sea en conjunto (array extendido)
     */
    constructor(computerScene) {
        super(computerScene);

        let screenName = "loginScreen";

        // Fondo de login del ordenador
        let loginBg = this.scene.add.image(0.23 * this.scene.CANVAS_WIDTH / 5, 4.1 * this.scene.CANVAS_HEIGHT / 5, 'loginBg');
        loginBg.setOrigin(0, 1).setScale(0.61);
        loginBg.displayWidth += 20;
        this.add(loginBg);

        // Logo de la red social
        let socialNetLogo = this.scene.add.image(2.67 * this.scene.CANVAS_WIDTH / 4, this.scene.CANVAS_HEIGHT / 7, 'computerElements', 'socialNetLogo');
        socialNetLogo.setOrigin(0.5, 0).setScale(1.1);
        this.add(socialNetLogo);

        // Texto que acompana al logo
        let subtitleTextStyle = { ...this.scene.gameManager.textConfig };
        subtitleTextStyle.fontFamily = 'AUdimat-regular';
        subtitleTextStyle.fontSize = '27px';
        let subtitleTranslation = this.scene.i18next.t(screenName + ".subtitleText", { ns: this.scene.namespace });
        let subtitleText = this.scene.add.text(socialNetLogo.x, socialNetLogo.y + socialNetLogo.displayHeight + 10, subtitleTranslation, subtitleTextStyle);
        subtitleText.setOrigin(0.5, 0).setScale(1.1);
        this.add(subtitleText);

        // Caja de texto para introducir el usuario
        let textInputScale = 0.57;
        let userTranslation = this.scene.i18next.t(screenName + ".userInput", { ns: this.scene.namespace, returnObjects: true });
        this.userInput = this.createTextInput(2.5 * this.scene.CANVAS_WIDTH / 4, subtitleText.y + subtitleText.displayHeight + 80, textInputScale, userTranslation.sideText, "User ");
        // Caja de texto para introducir la contrasena
        let passwordTranslation = this.scene.i18next.t(screenName + ".passwordInput", { ns: this.scene.namespace, returnObjects: true });
        this.passwordInput = this.createTextInput(2.5 * this.scene.CANVAS_WIDTH / 4, subtitleText.y + subtitleText.displayHeight + 160, textInputScale, passwordTranslation.sideText, "Pass ");

        this.scene.events.on('shutdown', () => {
            this.userInput.removeHiddenInput();
            this.passwordInput.removeHiddenInput();
        });

        // Texto para informar que los datos introducidos son incorrectos
        let errorTextStyle = { ...this.scene.gameManager.textConfig };
        errorTextStyle.fontFamily = 'AUdimat-regular';
        errorTextStyle.fontSize = '22px';
        errorTextStyle.color = '#ff0000';
        let errorTranslation = this.scene.i18next.t(screenName + ".errorText", { ns: this.scene.namespace });
        this.errorText = this.scene.add.text(4.22 * this.scene.CANVAS_WIDTH / 5, subtitleText.y + subtitleText.displayHeight + 221, errorTranslation, errorTextStyle);
        this.errorText.setVisible(false).setOrigin(1, 0.5);
        this.add(this.errorText);

        let enterTranslation = this.scene.i18next.t(screenName + ".enterButton", { ns: this.scene.namespace });
        // Boton para acceder a la red social
        let enterButton = new Button(this.scene, 3.81 * this.scene.CANVAS_WIDTH / 5, this.errorText.y + 55, 0.55,
            () => {
                // Se comprueba que los datos introducidos son correctos
                if (this.handleErrors(this.userInput, this.passwordInput)) {
                    xapiTracker.gameObject("onComputer", xapiTracker.GAMEOBJECTTYPE.GAMEOBJECT)
                                .interacted()
                                .send();
                    this.scene.logIntoSocialNet();
                }
                else {
                    xapiTracker.gameObject("errorWhenIntroducedCredentialsonComputer", xapiTracker.GAMEOBJECTTYPE.GAMEOBJECT)
                                .interacted()
                                .send();
                    this.errorText.setVisible(true);
                }
            },
            this.scene.gameManager.textBox.fillName, { R: 255, G: 255, B: 255 }, { R: 240, G: 240, B: 240 }, { R: 200, G: 200, B: 200 },
            enterTranslation, { font: 'AUdimat-regular', size: 57, style: 'normal', color: '#323232' }, this.scene.gameManager.textBox.edgeName,
            {
                area: new Phaser.Geom.Rectangle(this.scene.gameManager.textBox.offset, this.scene.gameManager.textBox.offset, this.scene.gameManager.textBox.width, this.scene.gameManager.textBox.height),
                callback: Phaser.Geom.Rectangle.Contains
            }
        );
        this.add(enterButton);
    }

    /**
     * Comprobar si el usuario y la contrasena introducidos son correctos
     * @param {TextInput} userInput - caja de texto donde introducir el usuario 
     * @param {TextInput} passwordInput - caja de texto donde introducir la contrasena
     * @returns true en caso de que si se puede acceder, false en caso contrario
     */
    handleErrors(userInput, passwordInput) {
        let userInfo = this.scene.gameManager.getUserInfo();
        if (!userInput.isValid()) {
            return false;
        }
        if (!passwordInput.isValid()) {
            return false;
        }
        if (userInput.getText() === userInfo.username &&
            passwordInput.getText() === userInfo.password) {
            return true;
        }
        else {
            return false;
        }
    }

    /**
     * Crear una caja de texto con un texto informativo a la izquierda
     */
    createTextInput(x, y, scale, sideText, defaultText) {
        let container = this.scene.add.container(x, y);

        let style = { ...this.scene.gameManager.textConfig };
        style.fontFamily = 'adventpro-regular';
        style.fontSize = '55px';

        // Texto que aparece a la izquierda
        let text = this.scene.add.text(-100, 0, sideText, style);
        text.setOrigin(1, 0.5);
        container.add(text);

        // Text input
        let textInput = new TextInput(this.scene, 0, 0, 1, defaultText, 23, { R: 200, G: 200, B: 200 },
            this.scene.gameManager.inputBox.fillName, this.scene.gameManager.inputBox.edgeName, 'AUdimat-regular',
            {
                area: new Phaser.Geom.Rectangle(this.scene.gameManager.inputBox.offset, this.scene.gameManager.inputBox.offset,
                    this.scene.gameManager.inputBox.width, this.scene.gameManager.inputBox.height),
                callback: Phaser.Geom.Rectangle.Contains
            });
        container.add(textInput);

        container.setScale(scale);

        this.add(container);

        return textInput;
    }

    start() {
        // Se hace todo visible (ya que esta escena estaba invisible completamente)
        this.setVisible(true);
        // Se hace invisible el texto de error
        this.errorText.setVisible(false);
        // Se resetean los cuadros de input
        this.userInput.reset();
        this.passwordInput.reset();
    }
}

class ListViewHit extends Phaser.GameObjects.Zone {
    /**
     * Collide que se puede usar en los elementos que se colocan en una listview
     * Se trata como un objeto aparte y no se hace dentro del propio objeto para que
     * sea mas sencillo manipularlo y modificarlo
     * Nota: se hace en posiciones globales
     * Importante: se tiene que colocar en la escena y no dentro de ningun otro elemento
     * @param {Phaser.scene} scene
     * @param {Object} renderObject - origen(0.5, 0)
     */
    constructor(scene, renderObject) {
        super(scene, 0, 0);

        this.scene.add.existing(this);

        // Importante: la imagen debe tener origen (0.5, 0) para que se ajuste bien este collider
        // y el elemento en conjunto se coloque correctamente en la listview
        renderObject.setOrigin(0.5, 0);
        this.base = renderObject;

        this.setOrigin(0);
        this.setInteractive();
        // La interaccion con los objetos esta por encima del scrolling
        this.setDepth(2);

        this.resetToBoundingRect();
    }

    /**
     * Devuelve el rectangulo que coincide con la imagen
     * @returns rectangulo de la imagen
     */
    getBoundingRect() {
        // rectangulo del propio elemento
        let matrix = this.base.getWorldTransformMatrix();
        let x = matrix.tx - this.base.width / 2 * matrix.scaleX;
        let y = matrix.ty - this.base.height / 2 * matrix.scaleY;
        // el offset en y es para ponerlo origen(0.5, 0)
        return new Phaser.Geom.Rectangle(x, y + (this.base.height * matrix.scaleY) / 2,
            this.base.width * matrix.scaleX, this.base.height * matrix.scaleY);
    }

    /**
     * Se cambia la zona para que coincide con el area de la iamgen
     */
    resetToBoundingRect() {
        let rect = this.getBoundingRect();
        this.setPosition(rect.x, rect.y);
        this.setSize(rect.width, rect.height);
        if (this.scene.sys.game.debug) {
            this.scene.input.enableDebug(this, '0x000000');
        }
    }

    /**
     * Calcular el area de colision disponible de acuerdo a los limites de los diferentes listviews
     * @param {Array} boundingRects - todos los rectangulos que limitan el collider
     *                                  (limites de los diferentes list views a los que pertenece)
     */
    intersect(boundingRects) {
        if (boundingRects.length > 0) {
            let rect = this.getBoundingRect();

            let intersection = new Phaser.Geom.Rectangle();

            // interseccion entre el rectangulo restante y los limites de cada uno de los listviews a los que pertenece
            boundingRects.forEach((boundingRect) => {
                Phaser.Geom.Intersects.GetRectangleIntersection(rect, boundingRect, intersection);
                rect = intersection;

                intersection = new Phaser.Geom.Rectangle();
            });

            // Se reajusta la zona de acuerdo a la interseccion
            this.setPosition(rect.x, rect.y);
            this.setSize(rect.width, rect.height);

            // Cada vez que se cambia la zona, hay que volver a llamar al enableDebug
            // para que el area de colision se pinte correctamente
            if (this.scene.sys.game.debug) {
                this.scene.input.enableDebug(this, '0x000000');
            }
        }
    }
}

class ListViewButton extends Phaser.GameObjects.Container {
    /**
     * Boton con un fondo escalable y con texto que utiliza como collider un ListViewHit
     * Por lo tanto, es un boton que se puede usar en una listview
     * @param {Phaser.scene} scene 
     * @param {Number} x - posicion x 
     * @param {Number} y - posicion y
     * @param {Number} scale - escala del boton entero
     * @param {Function} fn - funcion que se ejecuta al pulsar el boton 
     * @param {String} img - imagen para el fondo. Ademas, el collider tiene el tam de esta imagen
     * @param {Vector} imgScaleVec - escala del fondo
     * @param {Color} normalCol - color del fondo cuando no se esta interactuando con el boton
     * @param {Color} highlightedCol - color del fondo cuando se pasa el raton por encima 
     * @param {Color} pressedCol - color del fondo cuando se presiona el boton
     * @param {String} text - texto (opcional)
     * @param {Object} fontParams - configuracion del texto (opcional)
     */
    constructor(scene, x, y, scale, fn, img, imgScaleVec, normalCol, highlightedCol, pressedCol, text, fontParams) {
        super(scene, x, y);

        this.scene.add.existing(this);

        // Importante: tener todos los cambios de posicion y escala que afecten a la imagen hechos antes
        // de crear el ListViewHit para que el area de colision corresponda con el de la imagen correctamente

        this.setScale(scale);

        let gameManager = GameManager.getInstance();

        // Fondo
        // (importante que su origen sea 0.5, 0 para que el area de colision se ajuste correctamente)
        // La imagen pertenece a un atlas
        let image = null;
        if (img.hasOwnProperty('atlas')) {
            image = this.scene.add.image(0, 0, img.atlas, img.frame);
        }
        else {
            image = this.scene.add.image(0, 0, img);
        }
        image.setOrigin(0.5, 0).setScale(imgScaleVec.x, imgScaleVec.y);
        this.add(image);

        let nCol = Phaser.Display.Color.GetColor(normalCol.R, normalCol.G, normalCol.B);
        nCol = Phaser.Display.Color.IntegerToRGB(nCol);
        let hCol = Phaser.Display.Color.GetColor(highlightedCol.R, highlightedCol.G, highlightedCol.B);
        hCol = Phaser.Display.Color.IntegerToRGB(hCol);
        let pCol = Phaser.Display.Color.GetColor(pressedCol.R, pressedCol.G, pressedCol.B);
        pCol = Phaser.Display.Color.IntegerToRGB(pCol);

        // Texto
        if (text) {
            let style = { ...gameManager.textConfig };
            style.fontFamily = fontParams.font;
            style.fontSize = fontParams.size + 'px';
            style.fontStyle = fontParams.style;
            style.color = fontParams.color;

            // No importa el origen puesto que no tiene que ver con el collider
            // Se ajusta para que se coloque en el centro del fondo
            let buttonText = this.scene.add.text(0, image.displayHeight / 2, text, style);
            buttonText.setOrigin(0.5);
            this.add(buttonText);
        }

        this.w = image.displayWidth * imgScaleVec.x * scale;
        // Por si se usara directamente en la listview
        this.h = image.displayHeight * imgScaleVec.y * scale;

        // Collider
        this.hit = new ListViewHit(this.scene, image);

        // Animaciones
        let tintFadeTime = 25;

        this.hit.on('pointerover', () => {
            this.scene.tweens.addCounter({
                targets: [image],
                from: 0,
                to: 100,
                onUpdate: (tween) => {
                    const value = tween.getValue();
                    let col = Phaser.Display.Color.Interpolate.ColorWithColor(nCol, hCol, 100, value);
                    let colInt = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
                    image.setTint(colInt);
                },
                duration: tintFadeTime,
                repeat: 0,
            });
        });

        this.hit.on('pointerout', () => {
            this.scene.tweens.addCounter({
                targets: [image],
                from: 0,
                to: 100,
                onUpdate: (tween) => {
                    const value = tween.getValue();
                    let col = Phaser.Display.Color.Interpolate.ColorWithColor(hCol, nCol, 100, value);
                    let colInt = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
                    image.setTint(colInt);
                },
                duration: tintFadeTime,
                repeat: 0,
            });
        });

        this.hit.on('pointerdown', () => {
            this.hit.disableInteractive();
            let down = this.scene.tweens.addCounter({
                targets: [image],
                from: 0,
                to: 100,
                onUpdate: (tween) => {
                    const value = tween.getValue();
                    let col = Phaser.Display.Color.Interpolate.ColorWithColor(hCol, pCol, 100, value);
                    let colInt = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
                    image.setTint(colInt);
                },
                duration: tintFadeTime,
                repeat: 0,
                yoyo: true,
            });
            down.on('complete', () => {
                this.hit.setInteractive();
                fn();
            });
        });
    }

    /**
     * Cambiar la visiblidad del objeto
     * Nota: se sobrescribe el metodo para que tb cambie la visiblidad de las areas de colision,
     * que pertenecen a la escena
     * @param {Boolean} visible - visible o invisible 
     */
    setVisible(visible) {
        super.setVisible(visible);
        this.hit.setVisible(visible);
    }

    /**
     * Destruir al objeto
     * Nota: se sobrescribe el metodo para que tb se destruyan las areas de colision,
     * que pertenecen a la escena
     */
    destroy() {
        super.destroy();
        this.hit.destroy();
    }
}

class FriendRequest extends Phaser.GameObjects.Container {
    /**
     * Panel con la solicitud de amistad de un personaje
     * Esta pensando para ser un item de una listview
     * @param {Phaser.scene} scene - escena
     * @param {Number} x - posicion x (si se usa como item de una listview, no se va a usar)
     * @param {Number} y - posicion y (si se usa como item de una listview, no se va a usar)
     * @param {Number} scale - escala
     * @param {String} avatar - icono del personaje
     * @param {String} name - nombre del personaje
     * @param {String} bio - texto que aparece cuando se acepta la solicitud de amistad
     * @param {Function} defaultRefuseFn - funcion que se reproduce al denegar la solicitud si no hay un nodo seleccionado
     * @param {Function} acceptFn - funcion que se reproduce al aceptar la solicitud 
     * @param {Function} blockFn - funcion que se reproduce al tratar de bloquear una solicitud aceptada
     */
    constructor(scene, x, y, scale, avatar, name, bio, defaultRefuseFn, acceptFn, blockFn) {
        super(scene, x, y);

        this.scene.add.existing(this);

        // Indica si la solicitud ha sido aceptada o no
        this.isAccepted = false;
        // Nodo que reproduce el dialogmanager al tratar de rechazar la solicitud de amistad
        // Si no hay ninguno seleccionado, se ejecuta la funcion refuseFn
        this.refuseNode = null;

        let gameManager = GameManager.getInstance();
        let i18next = gameManager.i18next;
        let dialogManager = gameManager.UIManager.dialogManager;

        this.setScale(scale);

        // Botones cuyas areas de colision son listViewHit
        this.hitButtons = [];

        // Fondos
        let bgScale = {
            x: 1.1,
            y: 0.8
        };
        // Fondo cuando se recibe la solicitud
        this.newFriendBg = this.scene.add.image(0, 0, 'computerElements', 'newFriendBg');
        this.newFriendBg.setScale(bgScale.x, bgScale.y).setOrigin(0.5, 0);
        this.add(this.newFriendBg);

        // Tams del container
        this.w = this.newFriendBg.displayWidth * scale;     // se usa para calcular el ancho de la listivew
        this.h = this.newFriendBg.displayHeight * scale;    // se usa para colocar los items

        // Fondo cuando se acepta la solicitud
        this.oldFriendBg = this.scene.add.image(0, 0, 'computerElements', 'oldFriendBg');
        this.oldFriendBg.setScale(bgScale.x, bgScale.y).setOrigin(0.5, 0);
        this.oldFriendBg.setVisible(false);
        this.add(this.oldFriendBg);

        // Nombre del usuario
        let nameTextPos = {
            x: -185,
            y: 47
        };
        let nameTextStyle = { ...gameManager.textConfig };
        nameTextStyle.fontFamily = 'AUdimat-regular';
        nameTextStyle.fontSize = '37px';
        nameTextStyle.color = '#323232';
        let nameText = this.scene.add.text(nameTextPos.x, nameTextPos.y, name, nameTextStyle);
        nameText.setOrigin(0, 0.5);
        this.add(nameText);

        // Imagen con el avatar de la persona
        let avatarTrans = {
            x: -257,
            y: 75,
            scale: 0.9
        };
        let avatarIcon = this.scene.add.image(avatarTrans.x, avatarTrans.y, 'avatars', avatar);
        avatarIcon.setScale(avatarTrans.scale);
        this.add(avatarIcon);

        // Descripcion del usuario
        let bioTextStyle = { ...gameManager.textConfig };
        bioTextStyle.fontFamily = 'AUdimat-regular';
        bioTextStyle.fontSize = '23px';
        bioTextStyle.color = '#323232';
        bioTextStyle.align = 'justify';
        let wrapWidth = this.newFriendBg.displayWidth - avatarIcon.displayWidth * 2;
        bioTextStyle.wordWrap = {
            width: this.newFriendBg.displayWidth - avatarIcon.displayWidth * 2,
            useAdvancedWrap: true
        };
        this.bioText = this.scene.add.text(nameText.x, nameText.y + 23, bio, bioTextStyle);
        this.bioText.setVisible(false);
        this.bioText.setOrigin(0);
        this.add(this.bioText);

        if (this.scene.sys.game.debug) {
            let wrapWidthArea = this.scene.add.rectangle(this.bioText.x, this.bioText.y, wrapWidth, this.bioText.displayHeight, '#000000');
            wrapWidthArea.setOrigin(0);
            wrapWidthArea.setAlpha(0.5);
            this.add(wrapWidthArea);
        }

        // Boton para bloquear al usuario
        let blockButtonTrans = {
            x: 287,
            y: 17,
            scale: 0.73
        };
        this.blockButton = new ListViewButton(this.scene, blockButtonTrans.x, blockButtonTrans.y, blockButtonTrans.scale, () => {
            blockFn();
        }, { atlas: 'computerElements', frame: 'block' }, { x: 1, y: 1 }, { R: 255, G: 255, B: 255 }, { R: 200, G: 200, B: 200 }, { R: 150, G: 150, B: 150 });
        this.blockButton.setVisible(false);
        this.addListViewButton(this.blockButton);

        let size = 1.2;
        let fontSize = 22;
        let buttonsTranslations = i18next.t('friendRequestButtons', { ns: "computer\\computerInfo", returnObjects: true });
        // Boton para aceptar la peticion de amistad
        this.acceptButton = new ListViewButton(this.scene, 208, 97, size, () => {
            this.setOldFriendRequest(true);
            acceptFn();
        }, { atlas: 'computerElements', frame: 'buttonAcceptBg' }, { x: 1, y: 1 }, { R: 255, G: 255, B: 255 }, { R: 235, G: 235, B: 235 }, { R: 200, G: 200, B: 200 },
            buttonsTranslations.acceptText, { font: 'AUdimat-regular', size: fontSize, style: 'normal', color: '#ffffff' });
        this.addListViewButton(this.acceptButton);

        // Boton para aceptar la peticion de amistad
        this.refuseButton = new ListViewButton(this.scene, this.acceptButton.x - this.acceptButton.w, this.acceptButton.y, size, () => {
            if (this.refuseNode !== null) {
                dialogManager.setNode(this.refuseNode);
            }
            else {
                defaultRefuseFn();
            }
        }, { atlas: 'computerElements', frame: 'buttonBg' }, { x: 2, y: 0.38 }, { R: 255, G: 255, B: 255 }, { R: 235, G: 235, B: 235 }, { R: 200, G: 200, B: 200 },
            buttonsTranslations.denyText, { font: 'AUdimat-regular', size: fontSize, style: 'normal', color: '#42778E' });
        this.addListViewButton(this.refuseButton);
    }

    /**
     * Establecer si la solicitud esta aceptada o pendiente de revisar
     * @param {Boolean} enable - true si esta aceptada, false en caso contrario  
     */
    setOldFriendRequest(enable) {
        this.newFriendBg.setVisible(!enable);
        this.oldFriendBg.setVisible(enable);
        this.bioText.setVisible(enable);
        this.blockButton.setVisible(enable);
        this.acceptButton.setVisible(!enable);
        this.refuseButton.setVisible(!enable);
        this.isAccepted = enable;
    }

    /**
     * Aplicar el estado a la solicitud que verdaderamente tiene
     * Nota: se necesita este metodo porque cada vez que se accede a la red social
     * la pantalla de solicitudes se hace visible complemetamente. Entonces, se muestran 
     * todos los elementos y no solos los que corresponden con su estado
     */
    applyState() {
        this.setOldFriendRequest(this.isAccepted);
    }

    /**
     * Establecer el nodo que se reproduce cuando se rechaza la solicitud
     * Si no hay ningun nodo, se ejecuta la funcion por defecto
     */
    setRefuseNode(node) {
        this.refuseNode = node;
    }

    /**
     * Agregar el boton a la estructuras de datos pertienentes
     * @param {ListViewButton} button 
     */
    addListViewButton(button) {
        this.add(button);
        this.hitButtons.push(button);
        // El boton se agrega a un contenedor luego de crearse, por lo tanto,
        // su pos global cambia
        // Hay que llamar al siguiente metodo para que el collider vuelva a coincidr
        // con la imagen del boton
        button.hit.resetToBoundingRect();
    }

    /**
     * Obtener las listViewHits de este objeto
     */
    getHits() {
        let hits = [];
        this.hitButtons.forEach((button) => {
            hits.push(button.hit);
        });
        return hits;
    }

    /**
     * Destruir al objeto
     * Nota: se necesita sobrescribir este metodo para poder borrar tambien
     * las areas de colision, que pertenecen a la escena
     */
    destroy() {
        super.destroy();
        this.hitButtons.forEach((button) => {
            button.destroy();
        });
    }
}

class VerticalListView extends Phaser.GameObjects.Container {
    /**
     * Clase que permite crear una lista con elementos scrolleables. Se puede incluir cualquier
     * tipo de elementos renderizable, incluso otra propia listview
     * A TENER EN CUENTA:
     * - El "origen" de los elementos debe ser (0.5, 0)
     * - Cada elemento tiene que tener la propiedad .h, que es la altura real del elemento cuando se va a incluir en la listview
     * - Si se quiere que uno de los elementos sea interactuable hay que usar un hitListElement para el area de colision
     * - Llamar a init() despues de haber creado la listview y haber metido los items iniciales. 
     *      Si hay listviews anidadas con llamar al init() de la mayor es suficente
     * @param {Phaser.scene} scene 
     * @param {Number} x 
     * @param {Number} y 
     * @param {Number} scale 
     * @param {Number} padding - separacion entre los diferentes elementos de la listivew 
     * @param {Object} boundaries - limites de la listview (tanto para interactuar como para renderizar) 
     * @param {Object} background - fondo y su componente alfa (opcional)
     * @param {Boolean} autocull - hacer que un los elementos que se salgan de los borden se vuelvan invisibles.
     *                              No supone un cambio visual ni funcional, pero si mejora el rendimiento (opcional)
     */
    constructor(scene, x, y, scale, padding, boundaries, background, autocull = true, endPadding = 0, focusLastItem = false) {
        super(scene, x, y);

        this.scene.add.existing(this);

        // Poder usar el preupdate
        this.addToUpdateList();

        this.setScale(scale);

        // bg (es mera decoracion)
        if (background) {
            let bg = null;
            if (background.hasOwnProperty('atlas')) {
                bg = this.scene.add.image(0, 0, background.atlas, background.sprite);
            }
            else {
                bg = this.scene.add.image(0, 0, background.sprite);
            }
            bg.setOrigin(0.5, 0).setAlpha(background.alpha);
            bg.displayWidth = boundaries.width;
            bg.displayHeight = boundaries.height;
            this.add(bg);
        }

        // Limites de la listview
        this.boundedZone = this.scene.add.zone(0, 0, boundaries.width, boundaries.height);
        this.boundedZone.setOrigin(0.5, 0);
        this.boundedZone.setInteractive({ draggable: true });
        // El scrolling esta por encima de cualquier asset
        // De esta forma, se va a poder scrollear sobre la propia listiview
        this.boundedZone.setDepth(1);
        if (this.scene.sys.game.debug) {
            this.scene.input.enableDebug(this.boundedZone, '0x000000');
        }
        this.add(this.boundedZone);
        // Final de los limites de la listview
        this.boundedZone.end = this.boundedZone.y + this.boundedZone.displayHeight;

        // Mascara
        // IMPORTANTE: tiene que ser un elemento de la escena, no puede estar dentro de ningun lado
        this.rectangleMask = this.scene.add.rectangle(0, 0)
            .setAlpha(0).setOrigin(0).setFillStyle('0x000000');

        // ESTRUCTURAS DE DATOS
        // Si se encuentra dentro de otra listview
        this.parentListView = null;
        // Items que son listviews (poder hacer recursion)
        this.childrenListViews = new Set();
        // Ultimo elem (poder colocar al sig correctamente)
        this.lastItem = null;
        // Items
        // Se usa principalmente para eliminar objetos por indice facilmente
        // y para que cuando se elimina un objeto se recoloquen los siguientes facilmente
        this.items = [];
        // (item, hits) --> solo items con areas de colision
        // Nota: los hits no tienen porque ser exactamente los del propio item
        // Por ejemplo, si hay un contenedor con dos cubos, el item podria ser
        // el propio contenedor y los hits, las areas de colision de cada cubo
        this.itemsHits = new Map();
        // (item, listviews) --> listviews que puede tener un item
        // Se usa principalmente para gestionar correctamente la eliminacion de items
        // Nota: las listviews no tienen porque se exactamente el propio item
        // Por ejemplo, is hay un contenedor con dos listviews, el item podria ser
        // el propio contenedor y luego, se pasarian las dos listviews
        this.itemsListViews = new Map();
        // Container con los diferentes items 
        // Se usa para moverlo todo de golpe facilmente
        // Importante: se tiene que crear el ultimo
        this.itemsCont = this.scene.add.container(0, 0);
        this.add(this.itemsCont);

        // PARAMETROS
        // Distancia entre los diferentes items de la lista
        this.padding = padding;
        this.endPadding = endPadding;
        // Distancia que se deja al final de la lista
        this.autocull = autocull;
        // Cuando se anade un item al final de la lista, enfocarlo
        this.focusLastItem = focusLastItem;

        // Tams de la lista
        this.w = boundaries.w * scale;
        // Alto de la listview  por si se usa como un item dentro de otra listview
        this.h = boundaries.height * scale;

        // Deslizar la lista
        let previousDrag = 0;
        this.currentDrag = 0;

        // Deslizamiento con inercia una vez acabado el drag
        this.isBeingDragged = false;
        this.movingSpeed = 0;
        this.lastSavedPosition = new Phaser.Geom.Point(this.itemsCont.x, this.itemsCont.y);
        this.friction = 0.99;
        this.speedMul = 0.7;
        this.minDistance = 1.8;

        this.updateMask();

        this.boundedZone.on('dragenter', (pointer, x, y) => {
            this.isBeingDragged = true;
        });

        this.boundedZone.on('drag', (pointer, x, y) => {
            if (previousDrag === 0) {
                // Si se setea inicialmente previousDrag en dragstart, el valor es incorrecto
                previousDrag = y;
            }
            else {
                if (this.lastItem !== null) {
                    // Final de la lista en cuanto a tam (cambia conforme se van agregando mas objetos)
                    // .h --> tam del item (propiedad personalizada)
                    let listEnd = this.itemsCont.y + this.lastItem.y + this.lastItem.h;

                    // calcular la diferencia
                    let currentDrag = y;
                    this.dragDiff = currentDrag - previousDrag;
                    previousDrag = currentDrag;

                    // MOVIMIENTO   
                    // se sale por ambos lados
                    if (this.itemsCont.y < this.boundedZone.y &&  // se sale por arriba
                        listEnd > this.boundedZone.end - this.endPadding) {         // se sale por abajo
                        this.itemsCont.y += this.dragDiff;
                        this.cropItems();
                    }
                    // Se sale solo por abajo (solo se puede mover hacia arriba)
                    else if (listEnd > this.boundedZone.end - this.endPadding) {
                        if (this.dragDiff < 0) {  // mov hacia arriba
                            this.itemsCont.y += this.dragDiff;
                            this.cropItems();
                        }
                    }
                    // Se sale solo por arriba (solo se puede mover hacia abajo)
                    else if (this.itemsCont.y < this.boundedZone.y) {
                        if (this.dragDiff > 0) {  // mov hacia abajo
                            this.itemsCont.y += this.dragDiff;
                            this.cropItems();
                        }
                    }
                }
            }
        });

        this.boundedZone.on('dragend', (pointer, x, y) => {
            previousDrag = 0;
            this.isBeingDragged = false;
            // (se podria quitar)
            this.movingSpeed = 0;
        });
    }

    setParentListview(listview) {
        if (this.parentListView === null) {
            this.parentListView = listview;
        }
    }

    /**
     * Calcular el rectangulo definido por los limites de la listview en coordenadas globales
     * (sirve tanto para ir recalcundo la mascara como el area de colision de cada uno de los items)
     * @returns rectangulo que representa los limites de la listview
     */
    getBoundingRect() {
        // limites en coordenadas globales
        let matrix = this.boundedZone.getWorldTransformMatrix();
        let posX = matrix.tx - this.boundedZone.width / 2 * matrix.scaleX;
        let posY = matrix.ty - this.boundedZone.height / 2 * matrix.scaleY;
        // el offset en y es para ponerlo en origen(0.5, 0)
        return new Phaser.Geom.Rectangle(posX, posY + (this.boundedZone.height * matrix.scaleY) / 2,
            this.boundedZone.width * matrix.scaleX, this.boundedZone.height * matrix.scaleY);
    }

    /**
     * Obtener todos los limites del listview actual y de todos los padres
     * Se utiliza a la hora de recalcular los colliders de los items
     * @returns limites del listview actual y padres
     */
    getCurrentBoundingRectAndAbove() {
        let rects = [];
        rects.push(this.getBoundingRect());

        if (this.parentListView !== null) {
            rects = rects.concat(this.parentListView.getCurrentBoundingRectAndAbove());
        }

        return rects;
    }

    /**
     * Actualizar la mascara de renderizado
     */
    updateMask() {
        // se hallar a partir del rectangulo que define los limites
        let rect = this.getBoundingRect();
        // Nota: usar estas funciones y no setear los valores directamente
        this.rectangleMask.setPosition(rect.x, rect.y);
        this.rectangleMask.setSize(rect.width, rect.height);
        // bitmapmask --> alfa
        // geomtrymask --> interseccion
        let mask = this.rectangleMask.createGeometryMask();
        this.itemsCont.setMask(mask);
    }

    /**
     * Actualizar la mascara de renderizado de todass las listviews hijas y subhijas
     */
    updateChildrenMask() {
        this.childrenListViews.forEach((child) => {
            child.updateMask();
            child.updateChildrenMask();
        });
    }

    /**
     * Hacer un item y los colliders vinculados visibles o no
     * Se utiliza para el culling
     * Nota: si algo es setVisible(false) tp es interactuable
     * @param {Object} item 
     * @param {Boolean} visible 
     */
    makeItemVisible(item, visible) {
        item.setVisible(visible);
        if (this.itemsHits.has(item)) {
            let hits = this.itemsHits.get(item);
            hits.forEach((hit) => {
                hit.setVisible(visible);
            });
        }
    }

    init() {
        this.updateMask();
        this.cropItems();
    }

    /**
     * Recortar los items en cuanto a renderizado y areas de colision para que se
     * ajusten a los limites de las listviews
     */
    cropItems() {
        // hay que tener en cuenta la listview actual y las de orden superior
        let rects = this.getCurrentBoundingRectAndAbove();

        // Propio objeto
        if (this.autocull) {
            // se hace el culling
            this.cull(rects);
        }
        else {
            // no se hace culling, por lo tanto, solo se calculan las nuevas areas de colision
            // items con colliders
            this.itemsHits.forEach((hits, item) => {
                // colliders
                hits.forEach((hit) => {
                    hit.intersect(rects);
                });
            });
        }

        // AJUSTAR COLISIONES DE LOS HIJOS
        // en cada hijo hay que tener en cuenta los limites propios de su
        // listview y de sus antecesores
        // Nota: para los hijos no tiene sentido hacer culling puesto que sus items
        // no se han movido y es imposible que se salgan de los limities
        this.cropChildrenHits(rects);

        // AJUSTAR RENDERIZADO DE LOS HIJOS
        // solo se necesita actualizar la de los hijos porque el listview
        // actual no se ha movido
        this.updateChildrenMask();
    }

    /**
     * Culling: supone una mejora de rendimiento ya que al volver invisibles los items
     * que se encuentran fuera de los limites, se evita calcular todo el rato las intersecciones
     * con la mascara y con el area interactuable (boundedZone)
     */
    cull(boundingRects) {
        this.items.forEach((item) => {
            let itemStart = this.itemsCont.y + item.y;
            let itemEnd = itemStart + item.h;

            // Se sale el item completo por abajo
            if (itemStart > this.boundedZone.end) {
                this.makeItemVisible(item, false);
            }
            // Se sale el item completo por arriba
            else if (itemEnd < this.boundedZone.y) {
                this.makeItemVisible(item, false);
            }
            else {
                this.makeItemVisible(item, true);

                // Recortar colliders de los diferentes items
                if (this.itemsHits.has(item)) {
                    let hits = this.itemsHits.get(item);
                    hits.forEach((hit) => {
                        hit.intersect(boundingRects);
                    });
                }
            }
        });
    }

    /**
     * Recortar los colliders de los items de las listviews hijas
     * @param {Array} boudingRects - limites de las listviews anteriores 
     */
    cropChildrenHits(boudingRects) {
        let rects = [...boudingRects];
        // Listviews hijas
        this.childrenListViews.forEach((child) => {
            // Se agrega el limite de la list view hija actual
            rects.push(child.getBoundingRect());
            // Se recalcula el collider de los items
            child.itemsHits.forEach((hits, item) => {
                hits.forEach((hit) => {
                    hit.intersect(rects);
                });
            });
            // Mismo proceso para sus hijos
            child.cropChildrenHits(rects);
            // Se quita los limites de la listview hija actual puesto
            // que se va a pasar al sig hijo
            rects.pop();
        });
    }

    /**
     * Deslizamiento con inercia
     */
    preUpdate(t, dt) {
        if (this.isBeingDragged) {
            // Se necesita la posicion del contenedor en el frame anterior
            this.lastSavedPosition.x = this.itemsCont.x;
            this.lastSavedPosition.y = this.itemsCont.y;
        }
        else {
            if (this.movingSpeed > 1) {
                // Se desliza hacia abajo
                if (this.dragDiff > 0) {
                    // Se va a poder mover hasta que entre todo el panel
                    if (this.itemsCont.y < this.boundedZone.y) {
                        this.itemsCont.y += this.movingSpeed;
                        this.cropItems();
                    }
                    else {
                        // Si ha entrado todo el panel, ya no puede haber mas deslizamiento
                        this.movingSpeed = 0;
                    }
                }
                // Se desliza hacia arriba
                else if (this.dragDiff < 0) {
                    let listEnd = this.itemsCont.y + this.lastItem.y + this.lastItem.h;
                    // Se va a poder mover hasta que entre todo el panel
                    if (listEnd > this.boundedZone.end - this.endPadding) {
                        this.itemsCont.y -= this.movingSpeed;
                        this.cropItems();
                    }
                    else {
                        // Si ha entrado todo el panel, ya no puede haber mas deslizamiento
                        this.movingSpeed = 0;
                    }
                }
                // Se va reduciendo la velocidad
                this.movingSpeed *= this.friction;
                this.lastSavedPosition.x = this.itemsCont.x;
                this.lastSavedPosition.y = this.itemsCont.y;
            }
            else {
                // Distancia del ultimo drag
                let distance = Phaser.Math.Distance.Between(this.lastSavedPosition.x, this.lastSavedPosition.y,
                    this.itemsCont.x, this.itemsCont.y);
                // si el drag ha sido de mas de cierta distancia, se desliza
                if (distance > this.minDistance) {
                    this.movingSpeed = distance * this.speedMul;
                }
            }
        }
    }

    /**
     * Agregar un elemento al final del listview
     * Nota: el elemento queda alineado en el medio de la listview
     * Importante: definir la propiedad .h, que es la altura completa del elemento
     * @param {Object} item - origen(0.5, 0)
     * @param {Array} hits - hits que tiene el item (y sus elementos) (opcional)
     * @param {Array} listviews - listviews que tiene el item (y sus elementos) (opcional)
     *                              Nota: el propio item podria ser una listview
     */
    addLastItem(item, hits, listviews) {
        if (item.hasOwnProperty('h')) {
            // ?. --> si la funcion no existe, no se llama
            item.setOrigin?.(0.5, 0);
            this.itemsCont.add(item);
            // Colocar el item
            // El primero se coloca al borde los limities
            item.x = 0;
            item.y = 0;
            if (this.lastItem !== null) {
                item.y = this.lastItem.y + this.lastItem.h + this.padding;
            }

            this.items.push(item);
            this.lastItem = item;

            // Colocar la listview para que enfoque al ultimo item
            if (this.focusLastItem) {
                this.itemsCont.y = this.boundedZone.end - this.endPadding - (this.lastItem.y + this.lastItem.h);
                this.lastSavedPosition.x = this.itemsCont.x;
                this.lastSavedPosition.y = this.itemsCont.y;
            }

            this.addItemElems(item, hits, listviews);
        }
    }

    /**
     * Agregar un elemento al principio de la listview
     * Nota: el elemento queda alineado en el medio de la listview
     * @param {Object} item - origen(0.5, 0)
     * @param {Array} hits - hits que tiene el item (y sus elementos) (opcional)
     * @param {Array} listviews - listviews que tiene el item (y sus elementos) (opcional)
     *                              Nota: el propio item podria ser una listview
     */
    addFirstItem(item, hits, listviews) {
        if (item.hasOwnProperty('h')) {
            // ?. --> si la funcion no existe, no se llama
            item.setOrigin?.(0.5, 0);
            this.itemsCont.add(item);
            // Colocar el item
            // El primero se coloca al borde los limities
            item.x = 0;
            item.y = 0;
            if (this.lastItem !== null) {
                // Se recolocan todos los items
                for (let i = 0; i < this.items.length; ++i) {
                    this.items[i].y += item.y + item.h + this.padding;
                }
            }
            else {
                this.lastItem = item;
            }

            this.items.unshift(item);

            this.addItemElems(item, hits, listviews);
        }
    }

    /**
     * Agregar un las colisiones y las listviews de un item a las estructuras de datos de la clase
     */
    addItemElems(item, hits, listviews) {
        // Este items tiene listviews
        if (listviews) {
            listviews.forEach((listview) => {
                // Se agrega a la lista de list views
                this.childrenListViews.add(listview);
                // Se establece el padre de cada listview
                listview.setParentListview(this);
            });
            // Se guarda en el mapa
            this.itemsListViews.set(item, listviews);
        }

        // Este item tiene colliders
        if (hits) {
            this.itemsHits.set(item, hits);
        }

        this.cropItems();
    }

    /**
     * Eliminar los elementos que estan en la escena (mascara y colisiones)
     * y los de todos sus listviews hijas
     */
    destroyMaskAndHits() {
        // Este if es para evitar que se produza un error si el propio item
        // es de por si una list view porque ya se habra destruido y se tratara
        // de destruir dos veces

        // Destruir la mascara de renderizado
        if (this.rectangleMask !== null) {
            this.rectangleMask.destroy();
            this.rectangleMask = null;
        }

        // Destruir las areas de colision
        this.itemsHits.forEach((hits, item) => {
            hits.forEach((hit) => {
                hit.destroy();
                hit = null;
            });
        });
        this.itemsHits.clear();
    }

    destroy() {
        this.destroyMaskAndHits();
        this.parentListView = null;
        this.lastItem = null;
        this.items.forEach((item) => {
            // Evitar que si el propio item es una listview se elimine dos veces y se produzca error
            if (!this.childrenListViews.has(item)) {
                item.destroy();
            }
        });
        // Eliminar listviews hijas
        this.items = [];    // hacer clear del array
        this.childrenListViews.forEach((child) => {
            child.destroy();
        });
        this.childrenListViews.clear();
        super.destroy();
    }

    /**
     * Eliminar un item de la listview por indice
     * @param {Number} index - indice del item en la listview
     */
    removeByIndex(index) {
        if (index >= 0 && index < this.items.length) {
            let item = this.items[index];
            // Se recolocan todos los items que se encuentran detras
            for (let i = index + 1; i < this.items.length; ++i) {
                this.items[i].y = this.items[i].y - item.h - this.padding;
            }

            if (this.itemsHits.has(item)) {
                // Se destruyen las areas
                let hits = this.itemsHits.get(item);
                hits.forEach((hit) => {
                    hit.destroy();
                });
                this.itemsHits.delete(item);
            }

            if (this.itemsListViews.has(item)) {
                // Se destruyen las listviews hijas
                let listviews = this.itemsListViews.get(item);
                listviews.forEach((listview) => {
                    if (this.childrenListViews.has(listview)) {
                        this.childrenListViews.delete(listview);
                    }
                    listview.destroy();
                });
                this.itemsListViews.delete(item);
            }

            // Eliminar el item del array (funciona como un remove)
            this.items.splice(index, 1);    // 1 --> solo una ocurrencia

            item.destroy();

            // Establecer ultimo elemento
            if (this.items.length > 0) {
                this.lastItem = this.items[this.items.length - 1];
            }
            else {
                this.lastItem = null;
            }

            this.cropItems();
        }
    }

    removeItem(item) {
        let index = this.items.indexOf(item);
        if (index > -1) {
            this.removeByIndex(index);
        }
    }

    /**
     * Hacer la mascara y las areas de colision visibles o invisibles
     * Aunque se cambie la visibilidad del container, la de estos elementos no cambia
     * porque pertenecen a la escena
     * @param {Boolean} visible - visible o invisible 
     */
    setVisibleMaskHits(visible) {
        //this.rectangleMask.setVisible(visible);
        this.itemsHits.forEach((hits, item) => {
            hits.forEach((hit) => {
                hit.setVisible(visible);
            });
        });
    }

    setVisibleAux(visible) {
        // No hace falta hacer invisible uno por uno cada item
        // porque como estan en el container, si el container se
        // hace invisible, ellos tb se vuelven invisibles
        super.setVisible(visible);
        // Se para el deslizamiento
        this.movingSpeed = 0;
        // (No deberia hacer falta, sin embargo, si no se hace, la zona no se vuelve invisible)
        this.boundedZone.setVisible(visible);
        this.setVisibleMaskHits(visible);
        // Se hacen invisible todos las listiviews hijas
        // (para que se puedan hacer su mascara y sus areas de colision invisibles)
        this.childrenListViews.forEach((child => {
            child.setVisibleAux(visible);
        }));
    }

    setVisible(visible) {
        this.setVisibleAux(visible);
        if (visible) {
            // Luego de volver a hacer la listview visible de nuevo hay que ajustar los collider
            // porque se han hecho visibles y estan completos, pero es probable que en verdad tengan
            // que estar recortados
            this.cropItems();
        }
    }
}

class FriendsTab extends Phaser.GameObjects.Group {
    /**
     * Pestana donde aparecen las peticiones de amistad de la red social
     * @param {SocialNetworkScreen} socialNetScreen - pantalal de la red social
     */
    constructor(socialNetScreen) {
        super(socialNetScreen.scene);

        // Pantalla de la red social
        this.socialNetScreen = socialNetScreen;

        // Numero de amigos
        this.nFriends = 0;
        this.nFriendsTranslation = this.scene.i18next.t(this.socialNetScreen.screenName + ".friendsNumberText", { ns: this.scene.namespace });
        // Numero de peticiones de amistad sin revisar
        this.nPendingRequests = 0;
        this.nPendingRequestsTranslation = this.scene.i18next.t(this.socialNetScreen.screenName + ".pendingRequestsText", { ns: this.scene.namespace });

        // Peticiones de amistad existentes (todas menos las eliminadas)
        // Se usa para actualizar el estado de las peticiones facilmente
        this.existingRequests = new Set();

        // Texto con el numero de amigos
        let friendsTextStyle = { ...this.scene.gameManager.textConfig };
        friendsTextStyle.fontFamily = 'AUdimat-regular';
        friendsTextStyle.fontSize = '30px';
        friendsTextStyle.color = '#3558C1';
        let offsetY = this.scene.CANVAS_HEIGHT / 6;
        this.friendsText = this.scene.add.text(1.2 * this.scene.CANVAS_WIDTH / 4, offsetY, "", friendsTextStyle);
        // Se establece este origen para que a la hora de cambiar el valor, no se mueva todo el texto, solo el numero
        this.friendsText.setOrigin(0, 0.5);
        // Se actualiza el valor
        this.setFriends();
        this.add(this.friendsText);

        // Texto con el numero de peticiones de amistad pendientes
        let friendReqTextStyle = friendsTextStyle;
        friendReqTextStyle.color = '#FFA400';
        this.friendRequestsText = this.scene.add.text(3 * this.scene.CANVAS_WIDTH / 5, offsetY, "", friendReqTextStyle);
        // Se establece este origen para que a la hora de cambiar el valor, no se mueva todo el texto, solo el numero
        this.friendRequestsText.setOrigin(0, 0.5);
        // Se actualiza el valor
        this.setFriendRequests();
        this.add(this.friendRequestsText);

        // Se crea una peticion de amistad que se va a destruir de inmediato para poder calcular el ancho de la listview
        let aux = new FriendRequest(this.scene, 0, 0, 1);
        // IMPORTANTE: NO SE PUEDE ACTIVAR EL CULLING PORQUE COMO HAY COLLIDERS QUE EN CIERTO MOMENTO SE VAN A DEJAR DE MOSTRAR PARA SIEMPRE,
        // SI EL CULLING ESTUVIERA ACTIVADO LOS VOLVERIA A HACER VISIBLES
        this.listView = new VerticalListView(this.scene, 2.2 * this.scene.CANVAS_WIDTH / 4, 1.1 * this.scene.CANVAS_HEIGHT / 5, 1, 0, { width: aux.w, height: 467 }, null, false);
        this.add(this.listView);
        // Se hace el init despues de insertar la listview en un contenedor para que todos los colliders esten correctamente ajustados
        this.listView.init();
        aux.destroy();

        // Se crea la notificacion que aparece si se trata de bloquear una solicitud de amistad aceptada
        this.blockNot = this.createBlockNotification(3 * this.scene.CANVAS_WIDTH / 5, 1.8 * this.scene.CANVAS_HEIGHT / 4, 25);
    }

    /**
     * Texto con animacion que aparece para informar que no se puede bloquear a un amigo
     */
    createBlockNotification(x, y, fontSize) {
        // Indicar si la animacion ha acabado o no
        this.blockNotTween = null;

        let textStyle = { ...this.scene.gameManager.textConfig };
        textStyle.fontFamily = 'AUdimat-regular';
        textStyle.fontStyle = 'bold';
        textStyle.fontSize = fontSize + 'px';
        textStyle.backgroundColor = 'rgba(255, 0, 0, 0.85)';
        textStyle.padding = {
            left: 20,
            top: 35
        };
        let textTranslation = this.scene.i18next.t(this.socialNetScreen.screenName + ".blockNot", { ns: this.scene.namespace });
        let text = this.scene.add.text(x, y, textTranslation, textStyle);
        text.setScale(0).setOrigin(0.5);

        this.add(text);

        return text;
    }

    /**
     * Actualizar el texto con el numero de amigos
     */
    setFriends() {
        this.friendsText.setText(this.nFriendsTranslation + ": " + this.nFriends);
    }

    /**
     * Aumentar el numero de amigos
     */
    increaseFriends() {
        ++this.nFriends;
        this.setFriends();
    }

    /**
     * Actualizar el texto con el numero de peticiones sin revisar
     */
    setFriendRequests() {
        this.friendRequestsText.setText(this.nPendingRequestsTranslation + ": " + this.nPendingRequests);
    }

    /**
     * Aumentar le numero de peticiones sin revisar
     */
    increaseFriendRequests() {
        ++this.nPendingRequests;
        this.setFriendRequests();
        this.socialNetScreen.changeFriendRequestNotState();
    }

    /**
     * Disminuir el numero de peticiones sin revisar
     */
    decreaseFriendRequests() {
        --this.nPendingRequests;
        this.setFriendRequests();
        this.socialNetScreen.changeFriendRequestNotState();
    }

    /**
     * Comprobar si quedan solicitud de amistad pendientes de revisar
     * (para mostrar la notificacion)
     */
    emptyPendingRequests() {
        return this.nPendingRequests <= 0;
    }

    interacted(id) {
        try {
            xapiTracker.gameObject(id, xapiTracker.GAMEOBJECTTYPE.ITEM)
                        .interacted()
                        .send();
        } catch(e) {
            console.debug(e);
        }
    }

    /**
     * Agregar una peticiones de amistad
     * @param {String} character - personaje 
     * @param {DialogNode} node - node que se muestra cuando se clica en denegar la solicitud
     * @returns {FriendRequest}
     */
    addFriendRequest(character, node) {
        // Obtener la info del personaje
        let avatar = character;
        let name = this.scene.i18next.t(character, { ns: "names" });
        let bio = this.scene.i18next.t(character + ".bio", { ns: "computer\\requests" });

        let friendRequest = new FriendRequest(this.scene, 0, 0, 1, avatar, name, bio,
            // Rechazar
            () => {
                this.interacted(`Deny_${character}_request`);
                this.socialNetScreen.eraseFriend(character);
                this.refuseFriendRequest(friendRequest);
            },
            // Aceptar
            () => {
                // Cuando se acepta la solicitud, todos los posts pendientes aparecen en el tablon
                this.socialNetScreen.addPendingPosts(character);
                this.interacted(`Accepted_${character}_request`);
                // Se actualiza la UI
                this.decreaseFriendRequests();
                this.increaseFriends();
            },
            // Bloquear
            () => {
                this.interacted(`Block_${character}_request`);
                // Se muestra un mensaje indicando que no esta permitido bloquear
                // Solo se muestra si el tween no se esta ya mostrando
                if (!this.blockNotTween) {
                    this.blockNotTween = this.scene.tweens.add({
                        targets: this.blockNot,
                        scale: 1,
                        yoyo: true,
                        duration: 200,
                        hold: 1500,      // tiempo que se pausa el tween hasta que se realiza el yoyo
                        repeat: 0,
                    });
                    this.blockNotTween.on('complete', () => {
                        this.blockNotTween = null;
                    });
                }
            });

        friendRequest.setRefuseNode(node);

        // Se agrega la peticion de amistad tanto a la listview como a la lista de peticiones
        this.listView.addLastItem(friendRequest, friendRequest.getHits());
        this.existingRequests.add(friendRequest);

        // Aumenta el numero de peticiones
        this.increaseFriendRequests();

        return friendRequest;
    }

    /**
     * Eliminar una peticion de amistad
     * @param {FriendRequest} friendRequest 
     */
    refuseFriendRequest(friendRequest) {
        if (this.existingRequests.has(friendRequest)) {
            // Se elimina de la listivew
            this.listView.removeItem(friendRequest);

            this.existingRequests.delete(friendRequest);

            // Se disminuye el numero de peticiones
            this.decreaseFriendRequests();
        }
    }

    start() {
        // Se hace completamente visible
        this.setVisible(true);
        // Las peticiones de amistad tienen que mostrar el estado actual
        this.existingRequests.forEach((friend) => {
            friend.applyState();
        });
    }

    setVisible(visible) {
        super.setVisible(visible);
        // Nota: hay que sobrescribir el metodo para poder cambiar la visibilidad de la listview correctamente
        this.listView.setVisible(visible);
    }
}

class MessageBox extends Phaser.GameObjects.Container {
    /**
     * Contenedor para las burbujas de mensajes
     * @extends Phaser.GameObjects.Container
     * @param {Phaser.Scene} scene - escena a la que pertenece (UIManager)
     * @param {String} text - texto a escribir en el mensaje
     * @param {String} character - personaje que escribe el mensaje
     * @param {Number} type - tipo de mensaje (0 = mensaje de chat, 1 = comentario de la red social)
     * @param {Number} maxWidth - anchura maxima que puede tener la burbuja de dialogo
     * 
     */
    constructor(scene, msgText, character, name, type, maxWidth) {
        super(scene, 0, 0);

        // Configuracion de margenes
        let BOX_PADDING = 10;
        let TEXT_PADDING = 20;

        // Configuracion de la burbuja de texto (por defecto, la del jugador)
        let img = "myBubble";
        let leftWidth = 25;
        let rightWidth = 53;
        let topHeight = 25;
        let bottomHeigth = 44;
        let heightMultiplier = 3;
        let charName = "";

        // Configuracion de la burbuja de texto si es un mensaje de chat y el personaje 
        // que escribe no es el jugador O si es un comentario de la red social
        if ((character !== "player" && character && type === 0) || type === 1) {
            if (type === 0) {
                img = "othersBubble";
                leftWidth = 50;
                rightWidth = 65;
                topHeight = 25;
                bottomHeigth = 44;
            }
            else {
                img = "commentBubble";
                leftWidth = 50;
                rightWidth = 65;
                topHeight = 25;
                bottomHeigth = 36;
            }

            heightMultiplier = 3.5;
            charName = name;
        }


        // Configuracion de texto para la el texto del mensaje
        let textConfig = { ...scene.gameManager.textConfig };
        textConfig.fontFamily = 'roboto-regular';
        textConfig.fontStyle = 'bold';
        textConfig.fontSize = 15 + 'px';
        textConfig.color = '#000';
        textConfig.wordWrap = {
            width: maxWidth - (BOX_PADDING * 2 + TEXT_PADDING * 3),
            useAdvancedWrap: true
        };

        // Configuracion de texto para el nombre del contacto
        let nameTextConfig = { ...textConfig };
        nameTextConfig.color = '#5333bb';

        // Crea el texto y el nombre
        let text = this.scene.add.text(0, - TEXT_PADDING / 3, msgText, textConfig).setOrigin(0, 0.5);
        let nameText = this.scene.add.text(0, - TEXT_PADDING / 3, charName, nameTextConfig).setOrigin(0, 0.5);

        // Crea la imagen de la burbuja de texto para obtener su ancho y calcula el ancho que deberia tener la caja
        // (el ancho de lo que ocupe mas espacio entre el nombre, el texto, o la propia caja)
        let boxImg = scene.add.image(0, 0, img);
        let boxWidth = Math.max(text.displayWidth + TEXT_PADDING * 3, nameText.displayWidth + TEXT_PADDING * 3, boxImg.displayWidth);
        boxImg.destroy();

        // Crea la burbuja como un nineslice para que se redimensione de acuerdo al tamano del texto
        let box = scene.add.nineslice(
            0, 0, img, "", boxWidth, text.displayHeight + TEXT_PADDING * heightMultiplier, leftWidth, rightWidth, topHeight, bottomHeigth
        ).setOrigin(0.5, 0.5);

        // Mueve la burbuja a la izquierda o a la derecha dependiendo de quien es la burbuja de texto
        if (type === 0 && (character === "player" || !character)) {
            box.x = box.x + (maxWidth / 2) - (box.displayWidth / 2) - BOX_PADDING;
            text.x = box.x - box.displayWidth / 2 + TEXT_PADDING;
        }
        else {
            box.x = box.x - (maxWidth / 2) + (box.displayWidth / 2) + BOX_PADDING;
            text.x = box.x - box.displayWidth / 2 + TEXT_PADDING * 2;
            text.y += TEXT_PADDING / 2;
        }

        // Mueve hacia abajo el mensaje (ya que posteriormente se anadira a una listView cuyos objetos
        // tienen que tener el origen en 0.5, 0 y el origen del no se puede cambiar)
        nameText.x = text.x;
        nameText.y = text.y + TEXT_PADDING * 1.5;
        box.y += box.displayHeight / 2 + BOX_PADDING;
        text.y += box.displayHeight / 2 + BOX_PADDING;

        this.add(text);
        this.add(nameText);
        this.add(box);
        this.bringToTop(text);
        this.bringToTop(nameText);

        this.h = box.displayHeight + BOX_PADDING;

        scene.add.existing(this);
    }
}

class Post extends Phaser.GameObjects.Container {
    /**
     * Post que ha subido un personaje
     * Esta pensando para ser un item de una listview
     * @param {Phaser.scene} scene 
     * @param {Number} x - posicion x (si se agrega a una listview, no sirve para nada)
     * @param {Number} y - posicion y (si se agrega a una listview, no sirve para nada)
     * @param {Number} scale - escala
     * @param {String} avatar - icono del personaje
     * @param {String} name - nombre del personaje
     * @param {String} photo - foto que sube el personaje
     * @param {String} description - descripcion que aparece al lado de la foto
     */
    constructor(scene, x, y, scale, avatar, name, photo, description) {
        super(scene, x, y);
        this.avatar = avatar;
        this.name = name;
        this.photo = photo;

        this.scene.add.existing(this);

        let gameManager = GameManager.getInstance();
        let i18next = gameManager.i18next;
        this.dialogManager = gameManager.UIManager.dialogManager;

        this.setScale(scale);

        // Nodo del dialogo que reproduce el dialogmanager al clicar en el boton para responder al post
        this.commentNode = null;

        // Se almacenan todos los elementos para luego poder centrarlos
        let elements = [];

        // Numero de comentarios que hay
        this.nMessages = 0;

        // Imagen con el avatar del personaje
        let avatarIcon = this.scene.add.image(-150, 0, 'avatars', avatar);
        elements.push(avatarIcon);
        avatarIcon.setOrigin(0.5, 0).setScale(0.5);
        this.add(avatarIcon);

        // Nombre del personaje
        let nameTextStyle = { ...gameManager.textConfig };
        nameTextStyle.fontStyle = 'bold';
        nameTextStyle.fontSize = '25px';
        nameTextStyle.color = '#323232';
        let nameText = this.scene.add.text(avatarIcon.x + avatarIcon.displayWidth / 2 + 20, avatarIcon.y + avatarIcon.displayHeight / 2, name, nameTextStyle);
        nameText.setOrigin(0, 0.5);
        elements.push(nameText);
        this.add(nameText);

        // Background donde aparece la foto
        let photoBg = this.scene.add.image(0, avatarIcon.y + avatarIcon.displayHeight + 10, 'computerElements', 'photosBg');
        photoBg.setOrigin(0.5, 0).setScale(0.8);
        elements.push(photoBg);
        this.add(photoBg);

        // Foto
        let offset = 20;
        let photoPost = this.scene.add.image(photoBg.x - photoBg.displayWidth / 2 + offset, photoBg.y + offset, 'photos', photo);
        photoPost.setOrigin(0).setScale(0.77);
        elements.push(photoPost);
        this.add(photoPost);

        // Descripcion que aparece debajo de la foto
        let descripTextStyle = { ...gameManager.textConfig };
        descripTextStyle.fontFamily = 'AUdimat-regular';
        descripTextStyle.fontSize = '20px';
        descripTextStyle.color = '#323232';
        descripTextStyle.wordWrap = {
            width: photoPost.displayWidth,
            useAdvancedWrap: true
        };
        let descriptText = this.scene.add.text(photoPost.x, photoPost.y + photoPost.displayHeight + 10, description, descripTextStyle);
        elements.push(descriptText);
        this.add(descriptText);

        // Boton para comentar en el post
        offset = 10;
        this.commentButton = new ListViewButton(this.scene, photoBg.x + photoBg.displayWidth / 2 - offset, photoBg.y + offset, 0.65, () => {
            xapiTracker.gameObject(`comment_button_${this.name}_${this.photo}`)
                        .interacted()
                        .send();
            if (this.commentNode !== null) {
                this.dialogManager.setNode(this.commentNode);
            }
        }, { atlas: 'computerElements', frame: 'addComment' }, { x: 1, y: 1 }, { R: 255, G: 255, B: 255 }, { R: 200, G: 200, B: 200 }, { R: 150, G: 150, B: 150 });
        this.commentButton.x -= this.commentButton.w / 2;
        elements.push(this.commentButton);
        this.add(this.commentButton);

        // Listview con los comentarios, que aparece a la derecha de la foto
        this.chatWidth = 200;
        this.listView = new VerticalListView(this.scene, photoBg.x + photoBg.displayWidth / 2 + this.chatWidth / 2, photoBg.y, 1, 10,
            { width: this.chatWidth, height: photoBg.displayHeight }, { atlas: 'computerElements', sprite: 'buttonBg', alpha: 0.5 }, true, 0, true);
        elements.push(this.listView);
        this.add(this.listView);

        // Texto con el numero de comentarios
        let nMessagesTextStyle = { ...gameManager.textConfig };
        nMessagesTextStyle.fontFamily = 'AUdimat-regular';
        nMessagesTextStyle.fontSize = '23px';
        nMessagesTextStyle.color = '#323232';
        this.nMessagesTranslation = i18next.t("commentsNumberText", { ns: "computer\\computerInfo" });
        this.nMessagesText = this.scene.add.text(this.listView.x, this.listView.y - 25, "", nMessagesTextStyle);
        this.nMessagesText.setOrigin(0.5);
        this.setMessagesNum();
        elements.push(this.nMessagesText);
        this.add(this.nMessagesText);

        // Tams del container
        this.w = (photoBg.displayWidth + this.chatWidth) * scale;                   // se usa para el ancho de la listivew
        let aux = photoBg.y - (avatarIcon.y + avatarIcon.displayHeight);
        this.h = (avatarIcon.displayHeight + photoBg.displayHeight + aux) * scale;  // se usa para colocar los items en la listview correctamente

        // Se reajustan todos los elementos del container para que este centrado
        // Posicion del centro actual --> el 0,y esta en el medio de la imagen del fondo
        let oldCenter = photoBg.displayWidth / 2;
        // Posicion del nuevo centro --> tiene que estar ubicado en el medio del ancho
        let newCenter = (photoBg.displayWidth + this.chatWidth) / 2;
        // Se calcula la diferencia (lo que tienen que moverse los elementos para colocarse en el nuevo centro)
        let diff = oldCenter - newCenter;
        elements.forEach((element) => {
            // Se recoloca cada elemento
            element.x += diff;
        });

        // Se reajusta el collider para que se coloque en la nueva pos del boton
        this.commentButton.hit.resetToBoundingRect();
        // Se inicializa la listview para que todas sus areas se ajusten a la nueva pos
        // Nota: las nuevas pos son las de meterlos en el container
        this.listView.init();
    }

    /**
     * Anadir un mensaje
     * @param {String} text 
     * @param {String} character 
     * @param {String} name 
     */
    addMessage(text, character, name) {
        let msg = new MessageBox(this.scene, text, character, name, 1, this.chatWidth);
        this.increaseMessagesNum();
        // Se anade al final
        this.listView.addLastItem(msg);
    }

    /**
     * Se estable el nodo que se muestra cuando se clica el icono de comentar
     */
    setCommentNode(node) {
        this.commentNode = node;
    }

    /**
     * Se establece el nodo con los comentarios que ya tenia la publicacion
     * Como son comentarios que van a aparecer desde el principio, inmediatamente se llama al dialogManager
     */
    setOldCommentsNode(node) {
        this.dialogManager.setNode(node);
    }

    increaseMessagesNum() {
        ++this.nMessages;
        this.setMessagesNum();
    }

    setMessagesNum() {
        this.nMessagesText.setText(this.nMessages + " " + this.nMessagesTranslation);
    }

    setVisible(visible) {
        super.setVisible(visible);
        this.listView.setVisible(visible);
        this.commentButton.setVisible(visible);
    }

    destroy() {
        super.destroy();
        this.listView.destroy();
        this.commentButton.destroy();
    }
}

class FeedTab extends Phaser.GameObjects.Group {
    /**
     * Pestana donde aparecen los posts de los amigos del personaje
     * @param {SocialNetworkScreen} socialNetScreen - pantalla de la red social 
     */
    constructor(socialNetScreen) {
        super(socialNetScreen.scene);

        this.socialNetScreen = socialNetScreen;

        // Mensaje informativo que aparece arriba
        let infoTextStyle = { ...this.scene.gameManager.textConfig };
        infoTextStyle.fontFamily = 'AUdimat-regular';
        infoTextStyle.backgroundColor = 'rgba(66, 119, 142, 1)';
        infoTextStyle.padding = {
            left: 40,
            top: 7
        };
        this.infoTranslation = this.scene.i18next.t(this.socialNetScreen.screenName + ".informationText", { ns: this.scene.namespace });
        let infoText = this.scene.add.text(3.05 * this.scene.CANVAS_WIDTH / 5, this.scene.CANVAS_HEIGHT / 8,
            this.infoTranslation, infoTextStyle);
        infoText.setOrigin(0.5, 0);
        this.add(infoText);

        // Se crea un post que se va a destruir de inmediato para poder calcular el ancho de la listview
        let aux = new Post(this.scene, 0, 0, 1);
        this.listView = new VerticalListView(this.scene, 3.045 * this.scene.CANVAS_WIDTH / 5, this.scene.CANVAS_HEIGHT / 5, 1, 45,
            { width: aux.w * 1.32, height: 482 }, null, true, 50);
        aux.destroy();
        this.add(this.listView);
    }

    /**
     * Se crea un post pero no se agrega al tablon
     * Se hace de esta manera porque el jugador solo va a poder ver los posts de los usuarios que sean sus amigos
     * Sin embargo, un usuario puede haber subido un post antes de que el jugador lo acepte como amigo y hasta que el
     * jugador no lo acepte como amigo no va a poder verlo
     * @param {String} character - personaje 
     * @param {String} photo - texto que acompana a la foto
     * @param {String} description - descripcion del personaje
     * @param {DialogNode} commentNode - nodo que se muestra cuando se clica en el icono de comentar
     * @returns {Post}
     */
    createPost(character, photo, description, commentNode) {
        // Obtener la info del personaje
        let avatar = character;
        if (character === "player") {
            avatar = this.scene.userInfo.gender;
        }
        let name = this.scene.i18next.t(character, { ns: "names" });

        let post = new Post(this.scene, this.listView.w / 2, 0, 1, avatar, name, photo, description);
        post.setCommentNode(commentNode);

        post.setVisible(false);
        return post;
    }

    /**
     * Agregar un post creado a la listview
     * Se hace con los posts que habia guardados cuando se acepta una solicitud de amistad
     * y con los siguientes posts que llegan
     * @param {Post} post 
     */
    addPostToList(post) {
        // Los posts se van anadiendo al principio
        this.listView.addFirstItem(post, [post.commentButton.hit], [post.listView]);
        // Se hace invisible porque cuando se acepta una solicitud de amistad se anaden todos los posts pendientes
        // a la listview y esta al recolocarlos va a volver los colliders visibles. Sin embargo, se sigue
        // en la pestana de solicitudes de amistad y deberian ser invisibles
        this.listView.setVisible(false);
    }

    /**
     * Eliminar un post
     * @param {Post} post 
     */
    erasePost(post) {
        this.listView.removeItem(post);
    }

    setVisible(visible) {
        super.setVisible(visible);
        // Nota: hay que sobrescribir el metodo para poder cambiar la visibilidad de la listview correctamente
        this.listView.setVisible(visible);
    }
}

class SocialNetworkScreen extends Phaser.GameObjects.Group {
    /**
     * Pantalla de la red social, donde consultar los amigos y sus posts
     * @param {Phaser.scene} computerScene - escena del ordenador
     * @extends Phaser.GameObjects.Group 
     */
    constructor(computerScene) {
        super(computerScene);

        // Archivo json con los posts de cada persona
        this.posts = this.scene.cache.json.get('posts');
        this.requests = this.scene.cache.json.get('requests');

        // Nodo del dialog manager que se reproduce cuando se clica en el boton de subir una publicacion
        this.ownPostNode = this.readPostsNodes('player.upload');

        // Administrar todo lo relacionado con los amigos
        // Solicitud de amistad, posts que van a aparecer si se acepta la solicitud...
        this.friends = new Map();

        this.screenName = 'socialNetScreen';

        let dialogManager = this.scene.gameManager.UIManager.dialogManager;

        // Fondo de login del ordenador
        let mainViewBg = this.scene.add.image(0.23 * this.scene.CANVAS_WIDTH / 5, 4.1 * this.scene.CANVAS_HEIGHT / 5, 'computerMainView');
        mainViewBg.setOrigin(0, 1).setScale(0.61);
        mainViewBg.displayWidth += 20;
        this.add(mainViewBg);

        // Pestana donde aparecen los posts
        this.feedTab = new FeedTab(this);
        this.add(this.feedTab);
        // Pestana donde aparecen los amigos
        this.friendsTab = new FriendsTab(this);
        this.add(this.friendsTab);

        // Botones para intercalar entre las diferentes pestanas
        let tabTrans = {
            x: 1.07 * this.scene.CANVAS_WIDTH / 7,
            y: 1.75 * this.scene.CANVAS_HEIGHT / 4,
            scale: 0.9
        };
        let tabTextsTranslation = this.scene.i18next.t(this.screenName + ".tabTexts", { ns: this.scene.namespace, returnObjects: true });
        // Amigos
        let tab = this.createTab(tabTrans.x, tabTrans.y, tabTrans.scale, 'bubbleIcon', tabTextsTranslation.feed, () => {
            this.accessFeedTab();
        });

        // Posts
        tab = this.createTab(tabTrans.x, tab.y + tab.h, tabTrans.scale, 'friendsIcon', tabTextsTranslation.friends, () => {
            this.accessFriendsTab();
        });
        // Subir una foto
        // Nota: durante todo el juego no se puede subir ninguna foto. Al clicar este boton solo aparece un dialogo
        this.createTab(tabTrans.x, tab.y + tab.h, tabTrans.scale, 'photosIcon', tabTextsTranslation.upload, () => {
            // Nodo con el dialogo
            if (this.ownPostNode) {
                dialogManager.setNode(this.ownPostNode);
            }
        });

        // Crer la foto de perfil junto con el nombe de usuario del personaje
        this.createProfilePhoto(tabTrans.x, 0.93 * this.scene.CANVAS_HEIGHT / 4, 0.71);

        // Crear el mensaje que aparece cuando hay invitaciones de amistad pendientes
        this.friendRequestNot = this.createFriendRequestNotificacion(3 * this.scene.CANVAS_WIDTH / 5, 4.5 * this.scene.CANVAS_HEIGHT / 6, 0.9);
        this.friendRequestNot.setVisible(false);

        // Cuando se elimina una solicitud de amistad por medio de un nodo
        this.scene.dispatcher.add("eraseFriendRequest", this, (friendReqInfo) => {
            // Si existe el personaje
            if (this.friends.has(friendReqInfo.character)) {
                let friendInfo = this.friends.get(friendReqInfo.character);
                if (friendInfo.request) {
                    this.friendsTab.refuseFriendRequest(friendInfo.request);
                    // Tiene que ir despues
                    this.eraseFriend(friendReqInfo.character);
                }
            }
        }, true);

        // Cuando se elimina un post por medio de un nodo
        this.scene.dispatcher.add("erasePost", this, (postInfo) => {
            // Si existe el personaje
            if (this.friends.has(postInfo.character)) {
                let friendInfo = this.friends.get(postInfo.character);
                if (friendInfo.posts.has(postInfo.postName)) {
                    let post = friendInfo.posts.get(postInfo.postName);
                    this.feedTab.erasePost(post);
                    // Tiene que ir despues
                    this.erasePost(postInfo.character, postInfo.postName);
                }
            }
        }, true);
    }

    readPostsNodes(objectName) {
        return this.scene.readNodes(this.posts, 'computer\\posts', objectName, true);
    }

    readRequestsNodes(objectName) {
        return this.scene.readNodes(this.requests, 'computer\\requests', objectName, true);
    }

    ///////////////////////////////////////
    ///////// Elementos de la UI //////////
    //////////////////////////////////////

    /**
     * Crear la foto de perfil del jugador con el nombre de usuario
     */
    createProfilePhoto(x, y, scale) {
        let container = this.scene.add.container(x, y);

        // Foto de perfil del jugador (varia en funcion del genero)
        let genderPfp = null;
        if (this.scene.userInfo.gender === 'male') {
            genderPfp = 'profilePhotoM';
        }
        else if (this.scene.userInfo.gender === 'female') {
            genderPfp = 'profilePhotoF';
        }
        if (genderPfp) {
            let pfp = this.scene.add.image(0, 0, 'computerElements', genderPfp);
            container.add(pfp);

            // Texto con el nombre del jugador
            let nameTextStyle = { ...this.scene.gameManager.textConfig };
            nameTextStyle.fontFamily = 'AUdimat-regular';
            nameTextStyle.fontSize = '35px';
            nameTextStyle.color = '#323232';
            let nameText = this.scene.add.text(-pfp.displayHeight / 2 + 3, pfp.y + pfp.displayHeight / 2 + 28, this.scene.userInfo.username, nameTextStyle);
            nameText.setOrigin(0, 0.5);
            container.add(nameText);
        }

        container.setScale(scale);
        this.add(container);
    }

    /**
     * Crear la notificacion que se muestra para indicar si hay solicitudes de amistad sin revisar
     */
    createFriendRequestNotificacion(x, y, scale) {
        let container = this.scene.add.container(x, y);
        // Background
        let buttonBg = this.scene.add.image(0, 0, 'computerElements', 'buttonBg');
        buttonBg.setScale(6, 0.68);
        container.add(buttonBg);

        // Texto que aparece en el centro
        let style = { ...this.scene.gameManager.textConfig };
        style.fontFamily = 'AUdimat-regular';
        style.fontSize = '28px';
        style.color = '#ff0000';
        let friendRequestNotTrans = this.scene.i18next.t(this.screenName + ".friendRequestNot", { ns: this.scene.namespace });
        let text = this.scene.add.text(0, 0, friendRequestNotTrans, style);
        text.setOrigin(0.5);
        container.add(text);

        let iconScale = 0.65;
        let iconOffset = 265;
        // Carita que aparece a la izquierda
        let leftIcon = this.scene.add.image(-iconOffset, 0, 'computerElements', 'friendsIcon');
        leftIcon.setTint(Phaser.Display.Color.GetColor(255, 0, 0));
        leftIcon.setScale(iconScale);
        container.add(leftIcon);

        // Carita que aparece a la derecha
        let rightIcon = this.scene.add.image(iconOffset, 0, 'computerElements', 'friendsIcon');
        rightIcon.setTint(Phaser.Display.Color.GetColor(255, 0, 0));
        rightIcon.setScale(iconScale);
        container.add(rightIcon);

        container.setScale(scale);
        this.add(container);

        return container;
    }

    /**
     * Cambiar la visiblidad de la notificacion de la solicitud de amistad
     * en funcion de si quedan solicitudes de amistad sin revisar pendientes o no
     */
    changeFriendRequestNotState() {
        this.friendRequestNot.setVisible(false);
        if (!this.friendsTab.emptyPendingRequests()) {
            this.friendRequestNot.setVisible(true);
        }
    }

    /**
     * Crear icono para intercalar entre las diferentes pestanas/opciones de la red social
     */
    createTab(x, y, scale, icon, text, fn) {
        let container = this.scene.add.container(x, y);

        // Fondo
        let buttonBg = this.scene.add.image(0, 0, 'computerElements', 'buttonBg');
        buttonBg.setScale(2, 1);
        let nCol = Phaser.Display.Color.GetColor(255, 255, 255);
        nCol = Phaser.Display.Color.IntegerToRGB(nCol);
        let hCol = Phaser.Display.Color.GetColor(240, 240, 240);
        hCol = Phaser.Display.Color.IntegerToRGB(hCol);
        let pCol = Phaser.Display.Color.GetColor(200, 200, 200);
        pCol = Phaser.Display.Color.IntegerToRGB(pCol);
        buttonBg.setInteractive();

        let tintFadeTime = 25;

        // Animaciones del boton
        buttonBg.on('pointerover', () => {
            this.scene.tweens.addCounter({
                targets: [buttonBg],
                from: 0,
                to: 100,
                onUpdate: (tween) => {
                    const value = tween.getValue();
                    let col = Phaser.Display.Color.Interpolate.ColorWithColor(nCol, hCol, 100, value);
                    let colInt = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
                    buttonBg.setTint(colInt);
                },
                duration: tintFadeTime,
                repeat: 0,
            });
        });

        buttonBg.on('pointerout', () => {
            this.scene.tweens.addCounter({
                targets: [buttonBg],
                from: 0,
                to: 100,
                onUpdate: (tween) => {
                    const value = tween.getValue();
                    let col = Phaser.Display.Color.Interpolate.ColorWithColor(hCol, nCol, 100, value);
                    let colInt = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
                    buttonBg.setTint(colInt);
                },
                duration: tintFadeTime,
                repeat: 0,
            });
        });

        buttonBg.on('pointerdown', () => {
            buttonBg.disableInteractive();
            let down = this.scene.tweens.addCounter({
                targets: [buttonBg],
                from: 0,
                to: 100,
                onUpdate: (tween) => {
                    const value = tween.getValue();
                    let col = Phaser.Display.Color.Interpolate.ColorWithColor(hCol, pCol, 100, value);
                    let colInt = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
                    buttonBg.setTint(colInt);
                },
                duration: tintFadeTime,
                repeat: 0,
                yoyo: true,
            });
            down.on('complete', () => {
                buttonBg.setInteractive();
                fn();
            });
        });
        container.add(buttonBg);

        // Icono de la izquierda
        let offset = -5;
        let iconImg = this.scene.add.image(offset, 0, 'computerElements', icon);
        iconImg.setScale(0.85);
        iconImg.setOrigin(1, 0.5);
        container.add(iconImg);

        // Texto de la derecha
        let style = { ...this.scene.gameManager.textConfig };
        style.fontFamily = 'AUdimat-regular';
        style.fontSize = '27px';
        style.color = '#323232';
        offset += 8.5;
        let sideText = this.scene.add.text(offset, 0, text, style);
        sideText.setOrigin(0, 0.5);
        container.add(sideText);

        container.setScale(scale);
        this.add(container);

        this.scene.adjustFontSizeToObjectWidth(sideText, buttonBg, 0.45, { max: 40 });

        // Se establece una propiedad que corresponde con la altura del contenedor para que los tres iconos
        // de las pestanas se puedan colocar correctamente
        container.h = buttonBg.displayHeight * scale;

        return container;
    }

    ///////////////////////////////////////
    ///// Funciones de la red social //////
    //////////////////////////////////////

    /**
     * Traatar de crear la informacion de un personaje en el caso de que no exista
     * @param {String} character - personaje del que se va a crear la informacion
     */
    tryToCreateFriendInfo(character) {
        if (!this.friends.has(character)) {
            let friendInfo = {
                request: null,
                posts: new Map(),
                pendingPosts: []
            };
            this.friends.set(character, friendInfo);
        }
    }

    // SOLICITUDES DE AMISTAD //
    /**
     * Agregar las solicitudeds de amistad de un dia concreto especificadas en un .json
     * @param {Number} day - dia 
     */
    addDailyRequests(day) {
        let users = this.requests['day' + day];
        users.forEach((user) => {
            this.addFriendRequest(user);
        });
    }

    /**
     * PUBLICO
     * Agregar una solicitud de amistad de un personaje
     * @param {String} character 
     */
    addFriendRequest(character) {
        // Se trata de crear su info
        this.tryToCreateFriendInfo(character);

        // Nodo que se muestra al clicar en el boton para denegar la solicitud
        let node = null;
        if (this.requests[character]) {
            if (this.requests[character]['deny']) {
                node = this.readRequestsNodes(character + '.deny');
            }
        }

        // Se anade la solicitud
        let friendRequest = this.friendsTab.addFriendRequest(character, node);

        let friendInfo = this.friends.get(character);
        friendInfo.request = friendRequest;
    }

    /**
     * Se utiliza cuando se deniega una solicitud de amistad para limpiar la
     * estructura que almacena la informacion de todos los usuarios que son posibles amigos
     * @param {String} character 
     */
    eraseFriend(character) {
        if (this.friends.has(character)) {
            let friendInfo = this.friends.get(character);
            // Se eliminan todos los posts que el usuario tenian subidos,
            // aunque no se habian mostrado porque el jugador no acepto la solicitud
            friendInfo.posts.forEach((post, name) => {
                post.destroy();
            });
            this.friends.delete(character);
        }
    }

    // ANADIR/ELIMINAR PUBLICACION //
    /**
     * PUBLICO
     * Crear los posts de un dia concreto especficados en un .json
     * @param {Number} day - dia 
     */
    createDailyPosts(day) {
        let usersPosts = this.posts['day' + day];
        for (let user in usersPosts) {
            let postNames = usersPosts[user];
            postNames.forEach((postName) => {
                this.createPost(user, postName);
            });
        }
    }

    /**
     * PUBLICO
     * Se anade un post
     * @param {String} character - personaje
     * @param {String} postName - nombre del post
     *                              Nota: los posts se crean en un json
     */
    createPost(character, postName) {
        // Se trata de crear la info del personaje si no existe
        // Nota: de esta manera se pueden anadir publicaciones antes hacer anadido la solicitud de amistad
        this.tryToCreateFriendInfo(character);

        // Informacion del post
        let friendInfo = this.friends.get(character);
        if (!friendInfo.posts.has(postName)) {
            // Acceder a la publicacion
            let postInfo = {
                object: this.posts[character][postName],
                fullName: character + '.' + postName
            };

            let photo = postInfo.object.photo;
            // La foto que se sube varia en funcion del genero del jugador
            let check = typeof photo === 'string' || photo instanceof String;
            if (!check) {
                photo = postInfo.object.photo[this.scene.userInfo.gender];
            }

            // Si se requiere haber aceptado una soliticitud de amistad o no para que aparezca la publicacion
            let friendshipRequired = postInfo.object.friendshipRequired;

            // Descripcion que aparece junto a la foto
            let userInfo = this.scene.userInfo;
            let description = this.scene.i18next.t(postInfo.fullName + '.description', { ns: "computer\\posts", name: userInfo.name, context: userInfo.gender });

            // Nodo que se muestra cuando se clica en el icono de comentar
            let commentNode = this.readPostsNodes(postInfo.fullName + '.comment');

            // Se crea el post
            let post = this.feedTab.createPost(character, photo, description, commentNode);

            // Se anade a la lista de posts del usuario
            friendInfo.posts.set(postName, post);

            // Nodo con los comentarios que ya tiene la publicacion cuando aparece
            let oldCommentsNode = this.readPostsNodes(postInfo.fullName + '.oldComments');
            post.setOldCommentsNode(oldCommentsNode);

            // Se comprueba si el jugador ha aceptado la solicitud
            // y, entonces se puede anadir el post al tablon
            this.tryToAddPost(character, post, friendshipRequired);
        }
    }

    /**
     * Tratar de mostrar un post en el tablon
     * @param {String} character - personaje al que pertenece el post
     * @param {Post} post - post a anadir
     * @param {Boolean} friendShipRequired - si es necesario que el personaje que sube el post sea tu amigo
     *                                          (tp es necesario siquiera que haya enviado una solicitud de amistad)
     */
    tryToAddPost(character, post, friendShipRequired) {
        let pendingPost = true;

        if (this.friends.has(character)) {
            let friendInfo = this.friends.get(character);
            // Si existe la solicitud de amistad
            if (friendInfo.request) {
                // Si se ha aceptado
                if (friendInfo.request.isAccepted) {
                    // Se anade directamente a la listview
                    pendingPost = false;
                    this.feedTab.addPostToList(post);
                }
            }

            // Se muestra directamente la publicacion (personaje u otro personaje)
            // Nota: aunque un personaje haya enviado una solicitud de amistad, puede
            // seguir mostrando publicacion directas
            if (character == "player" || (friendShipRequired !== undefined && friendShipRequired === false)) {
                // Se ana directamente a la listview
                pendingPost = false;
                this.feedTab.addPostToList(post);
            }

            // El personaje ha subido una publicacion, pero no se va a mostrar
            // hasta que se acepte la solicitud de amistad
            if (pendingPost) {
                friendInfo.pendingPosts.push(post);
            }
        }
    }

    /**
     * Una vez aceptada la solicitud de amistad, anadir todos los posts pendientes al tablon
     * @param {String} character - personaje 
     */
    addPendingPosts(character) {
        let friendInfo = this.friends.get(character);
        // Los posts pendientes que no se han anadido son los que habia hasta el momento en el map
        friendInfo.pendingPosts.forEach((post, name) => {
            this.feedTab.addPostToList(post);
        });
        friendInfo.pendingPosts = [];
    }

    /**
     * Eliminar un post (independientemente de si se ha aceptado la solicitud de amistad o no)
     * @param {String} character - personaje
     * @param {String} postName - post
     */
    erasePost(character, postName) {
        // Si existe el personaje
        if (this.friends.has(character)) {
            let friendInfo = this.friends.get(character);
            // Si existe ese post
            if (friendInfo.posts.has(postName)) {
                // Entonces, se anade a la listview
                friendInfo.posts.delete(postName);
            }
        }
    }

    // COMENTAR PUBLICACION //

    /**
     * PUBLICO (DESDE EL DIALOG MANAGER)
     * Anadir comentario a una publicacion (tiene que existir la publicacion previamente)
     * @param {String} user - personaje que ha subido la publicacion
     * @param {String} postName - nombre de la publicacion 
     * @param {String} character - personaje que responde la publicacion
     * @param {String} name - nombre del personaje que responde la publicacion
     * @param {String} text - texto con el comentario
     */
    addCommentToPost(user, postName, character, name, text) {
        // Existe el usuario
        if (this.friends.has(user)) {
            let friendInfo = this.friends.get(user);
            // Existe el post
            if (friendInfo.posts.has(postName)) {
                friendInfo.posts.get(postName).addMessage(text, character, name);
            }
        }
    }

    ///////////////////////////////////////
    //////////// Transiciones /////////////
    //////////////////////////////////////

    start() {
        // Al igual que en la pestana de login, como esta totalmente invisible,
        // se vuelve completamente invisible
        this.setVisible(true);
        // Se si hay peticiones de amistad pendiente o no para saber si activar la notificacion o no
        this.changeFriendRequestNotState();
        // Se accede a la pestana con los posts
        this.accessFeedTab();
    }

    /**
     * Cambiar a la pestana donde aparecen las solicitudes de amistad
     */
    accessFriendsTab() {
        xapiTracker.gameObject("ShowComputerFriends", xapiTracker.GAMEOBJECTTYPE.GAMEOBJECT)
                    .interacted()
                    .send();
        this.feedTab.setVisible(false);
        this.friendsTab.start();
    }

    /**
     * Cambiar a la pestana donde aparecen los posts de los amigos
     */
    accessFeedTab() {
        xapiTracker.gameObject("ShowComputerPublications", xapiTracker.GAMEOBJECTTYPE.GAMEOBJECT)
                    .interacted()
                    .send();
        this.friendsTab.setVisible(false);
        this.feedTab.setVisible(true);
    }

    ///////////////////////////////////////
    ////////////// Overrides /////////////
    //////////////////////////////////////

    setVisible(visible) {
        // El setVisible de un grupo solo pone el parametro visible a false de los items del grupo,
        // pero no llama al setVisible de cada uno de los items
        // Sin embargo, en este caso es necesario hacer override del setVisible para poder
        // hacer invisibles las listviews
        super.setVisible(visible);
        this.feedTab.setVisible(visible);
        this.friendsTab.setVisible(visible);
    }
}

class ComputerScene extends BaseScene {
    /**
     * Ordenador que se usa dentro del juego para consultar la red social
     * Nota: esta escena existe durante todo el juego, aunque se va durmiendo y despertando
     * en funcion de si se necesita usar o no
     * @extends Phaser.Scene
     */
    constructor() {
        super('ComputerScene');
    }

    create() {
        super.create();

        this.userInfo = this.gameManager.userInfo;
        this.namespace = "computer\\computerInfo";

        // No se puede hacer scroll
        this.rightBound = this.CANVAS_WIDTH;

        // Opcione por defecto que se usan para ajustar el tam de la fuente a un ancho determinado
        this.defaultSizeConfig = {
            increament: 1.1,        // cuanto se va incrementando cada vez
            decreasement: 0.9,      // cuanto se va reduciendo cada vez
            max: 60.0,
            min: 15.0               // minimo de tam de fuente permitido
        };

        // Mesa
        let bg = this.add.image(this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2, 'basePC');
        let scale = this.CANVAS_WIDTH / bg.width;
        bg.setScale(scale);

        // Color base del fondo de pantalla del ordenador
        this.add.rectangle(this.CANVAS_WIDTH / 2, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT / 1.2, 0x000000).setOrigin(0.5, 0);

        // Se crean en este punto para que las pantallas esten por encima del fondo del ordenador,
        // pero por debajo del marco
        this.socialNetScreen = new SocialNetworkScreen(this);
        this.socialNetScreen.setVisible(false);
        this.loginScreen = new LoginScreen(this);

        // Boton de apagar de la esquina inferior izquierda
        this.powerOffButton = new Button(this, 103.5, this.CANVAS_HEIGHT - 197, 0.31,
            () => {
                this.gameManager.leaveComputer();
            },
            'powerOff', { R: 255, G: 255, B: 255 }, { R: 200, G: 200, B: 200 }, { R: 150, G: 150, B: 150 }
        );

        // Boton de cerrar el ordenador de la esquina superior derecha
        this.closeButton = new Button(this, this.CANVAS_WIDTH - 99, 54, 0.82,
            () => {
                this.gameManager.leaveComputer();
            },
            { atlas: 'computerElements', frame: 'closerBrowser' }, { R: 255, G: 255, B: 255 }, { R: 200, G: 200, B: 200 }, { R: 150, G: 150, B: 150 },
        );
        // El boton de cerrar esta formado por tres botones
        // Se calcula el tam de uno (cruz) para que el area de colision sea el adecuado
        let oneButtonWidth = this.closeButton.fillImg.displayWidth / 3;
        this.closeButton.setHitArea({
            area: new Phaser.Geom.Rectangle(2 * oneButtonWidth, 0, oneButtonWidth, this.closeButton.fillImg.displayHeight),
            callback: Phaser.Geom.Rectangle.Contains
        });

        // Pantalla del ordenador con el tam del canvas
        let screen = this.add.image(this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2, 'PCscreen');
        screen.setDisplaySize(this.CANVAS_WIDTH, this.CANVAS_HEIGHT);

        // Posit con el usuario y contrasena del jugador
        let postitCont = this.add.container(1.3 * this.CANVAS_WIDTH / 4, this.CANVAS_HEIGHT - 100);
        let postitBg = this.add.image(0, 0, 'computerElements', 'postit');
        postitCont.add(postitBg);

        let postitTextInfoStyle = { ...this.gameManager.textConfig };
        postitTextInfoStyle.fontFamily = 'dadha';
        postitTextInfoStyle.fontSize = '60px';
        postitTextInfoStyle.color = '#323232';

        let postitTextStyle = { ...postitTextInfoStyle };
        postitTextStyle.fontSize = '52px';

        // Informacion del personaje en el postit
        let postitTextsPos = {
            x: 180,
            offsetX: 15,
            firstTextY: -65,
            secondTextY: 95,
            offsetY: 75
        };
        // Nombre de usuario del personaje
        let yourUserTranslation = this.i18next.t("yourUserText", { ns: this.namespace });
        let yourUserText = this.add.text(-postitTextsPos.x, postitTextsPos.firstTextY, yourUserTranslation, postitTextInfoStyle);
        yourUserText.setOrigin(0, 0.5);
        postitCont.add(yourUserText);

        let userText = this.add.text(postitTextsPos.x + postitTextsPos.offsetX,
            postitTextsPos.firstTextY + postitTextsPos.offsetY, this.userInfo.username, postitTextStyle);
        userText.setOrigin(1, 0.5);
        postitCont.add(userText);

        // Contraseña del personaje
        let yourPasswordTranslation = this.i18next.t("yourPasswordText", { ns: this.namespace });
        let yourPasswordText = this.add.text(-postitTextsPos.x,
            postitTextsPos.secondTextY, yourPasswordTranslation, postitTextInfoStyle);
        yourPasswordText.setOrigin(0, 0.5);
        postitCont.add(yourPasswordText);

        let passwordText = this.add.text(postitTextsPos.x + postitTextsPos.offsetX,
            postitTextsPos.secondTextY + postitTextsPos.offsetY, this.userInfo.password, postitTextStyle);
        passwordText.setOrigin(1, 0.5);
        postitCont.add(passwordText);

        postitCont.setScale(0.37);

        // Nota: llamarlo despues de que el texto y el fondo se hayan metido en todos los contenedores oportunos y hayan
        // sufrido todas las transformaciones para que se puedan calcular correctamente los tamanos
        let proportion = 0.8;
        this.adjustFontSizeToObjectWidth(yourUserText, postitBg, proportion);
        this.adjustFontSizeToObjectWidth(yourPasswordText, postitBg, proportion);
    }

    /**
     * Iniciar el ordenador
     * Nota: se llama justo antes de realizar el cambio a esta escena
     */
    start() {
        // Se resetean los colores de los botones al por defecto porque si se sale del ordenador
        // y luego se vuelve entrar, como los tweens de cambio de color al pasar el raton por encima
        // estaban activados, se sigue manteniendo ese color
        this.powerOffButton.reset();
        this.closeButton.reset();
        // Se inicia la pantalla de login
        this.socialNetScreen.setVisible(false);
        this.loginScreen.start();
    }

    /**
     * Metodo para iniciar la red social despues de la pantalla de login
     * Nota: es la pantalla de login el que lo llama
     */
    logIntoSocialNet() {
        this.loginScreen.setVisible(false);
        this.socialNetScreen.start();
    }

    /**
     * Ajustar el texto al ancho de un objeto teniendo tambien en cuenta unos tamanos de fuentes limites
     * Para ello se modifica el tam de la fuente del texto
     * Nota: se calcula todo en posiciones globales por si el texto y el objeto pertenecen a sistemas de coordenadas
     * Por lo tanto, es importante que este metodo se llame cuando texto y objeto han sufrido todas las transformaciones
     * oportunas para que se hagan los calculos correctamente
     * @param {Text} text - texto que se ajusta
     * @param {Object} object - objecto (ancho)
     * @param {Number} proportion - parte del ancho que se tiene en cuenta (opcional)
     * @param {Object} sizeLimits - tamanos de fuentes limites (opcional, sino se cogen los por defecto)
     */
    adjustFontSizeToObjectWidth(text, object, proportion = 1, sizeLimits) {
        // Se comprueba si se han proporcionado tams de fuentes limites
        let min = this.defaultSizeConfig.min;
        let max = this.defaultSizeConfig.max;
        if (sizeLimits) {
            if (sizeLimits.min) {
                min = sizeLimits.min;
            }
            if (sizeLimits.max) {
                max = sizeLimits.max;
            }
        }

        // Matriz del texto
        let textMatrix = text.getWorldTransformMatrix();

        // Matriz del objeto
        let objectMatrix = object.getWorldTransformMatrix();
        // Ancho que debe ocupar el objeto
        let limitWidth = object.width * proportion * objectMatrix.scaleX;

        // Si esta el debug activado, se muestra el area que debe ocupar el texto
        if (this.sys.game.debug) {
            // Posicion del texto, pero tams del objeto
            let limitWidthArea = this.add.rectangle(textMatrix.tx, textMatrix.ty, limitWidth, text.height * textMatrix.scaleY, '#000000');
            limitWidthArea.setOrigin(text.originX, text.originY);
            limitWidthArea.setAlpha(0.25);
        }

        // Se obtiene el tam del texto actual
        let fontSize = text.style.fontSize;
        fontSize = fontSize.slice(0, fontSize.length - 2);
        fontSize = Number(fontSize);

        let endSize = fontSize;

        // Ancho actual del texto
        let textWidth = text.width * textMatrix.scaleX;

        // Si el tam del texto es mayor que el ancho permitido...
        if (textWidth > limitWidth) {
            // Se va reduciendo el tam
            while (text.width * textMatrix.scaleX > limitWidth && fontSize > min) {
                fontSize = Math.floor(fontSize * this.defaultSizeConfig.decreasement);
                text.setFontSize(fontSize);
            }
            endSize = fontSize;
        }
        // Si el tam del texto es menor que el ancho permitido...
        else {
            // Se va aumentando el tam

            // Nota: hay que guardar el previo que es el que aun no se ha salido del ancho del objeto
            let previousFontSize = fontSize;
            while (text.width * textMatrix.scaleX < limitWidth && previousFontSize < max) {
                previousFontSize = fontSize;
                fontSize = Math.ceil(fontSize * this.defaultSizeConfig.increament);
                text.setFontSize(fontSize);
            }
            endSize = previousFontSize;
        }

        // Se comprueba si el tam encontrado esta dentro del permitido...
        // Es menor que el permitido
        if (endSize < min) {
            text.setFontSize(min);
        }
        else {
            // Es mayor que el permitido
            if (endSize > max) {
                text.setFontSize(max);
            }
            // Es correcto
            else {
                text.setFontSize(endSize);
            }
        }
    }
}

class DialogObject {
    /**
    * Clase base para los elementos de dialogo, con metodos 
    * para activar/desactivar el objeto y la configuracion por
    * defecto para el texto de los elementos de dialogo 
    * @param {Phaser.Scene} scene - escena a la que pertenece
    */
    constructor(scene) {
        this.scene = scene;

        // Configuracion de las animaciones
        this.animConfig = {
            fadeTime: 150,
            fadeEase: 'linear'
        };
    }

    /**
    * Activa o desactiva los objetos indicados
    * @param {Boolean} active - si se va a activar el objeto
    * @param {Array} objects - array de objetos a activar/desactivar
    * @param {Function} onComplete - funcion a la que llamar cuando acabe la animacion
    * @param {Number} delay - tiempo en ms que tarda en llamarse a onComplete
    */
    activate(active, objects, onComplete = { }, delay = 0) {
        let fade;
        
        // Si se va a activar
        if (active) {
            // Fuerza las opacidades de todos los objetos a 0
            objects.forEach((obj) => {
                obj.alpha = 0;
            });

            // Hace la animacion de fade in para todos los objetos
            fade = this.scene.tweens.add({
                targets: objects,
                alpha: { from: 0, to: 1 },
                ease: this.animConfig.fadeEase,
                duration: this.animConfig.fadeTime,
                repeat: 0,
            });
        }
        // Si se va a desactivar
        else {
            // Fuerza las opacidades de todos los objetos a 1
            objects.forEach((obj) => {
                obj.alpha = 1;
            });

            // Hace la animacion de fade out para todos los objetos
            fade = this.scene.tweens.add({
                targets: objects,
                alpha: { from: 1, to: 0 },
                ease: this.animConfig.fadeEase,
                duration: this.animConfig.fadeTime,
                repeat: 0,
            });
        }

        // Si se ha hecho la animacion y onComplete es una funcion valida, la ejecuta
        if (fade && onComplete !== null && typeof onComplete === 'function') {
            fade.on('complete', () => {
                setTimeout(() => {
                    onComplete();
                }, delay);
            });

        }

    }
}

class TextBox extends DialogObject {
    /**
    * Caja de texto para los dialogos
    * @extends DialogObject
    * @param {Phaser.Scene} scene - escena a la que pertenece
    */
    constructor(scene, dialogManager) {
        super(scene);
        this.scene = scene;

        // Configuracion de la imagen de la caja de texto
        this.padding = 10;        // Espacio entre la caja y los bordes del canvas

        // Imagen de la caja
        this.box = scene.add.image(this.scene.CANVAS_WIDTH / 2, this.scene.CANVAS_HEIGHT - this.padding, 'dialogs', 'textbox').setOrigin(0.5, 1);
        let horizontalScale = (this.scene.CANVAS_WIDTH - this.padding * 2) / this.box.width;
        this.box.setScale(horizontalScale, 1);
        this.box.visible = true;

        this.box.setInteractive({ useHandCursor: true });
        this.box.on('pointerdown', () => {
            dialogManager.nextDialog();
        });

        // Imagen de la caja del nombre
        this.nameBox = scene.add.image(this.scene.CANVAS_WIDTH / 2, this.scene.CANVAS_HEIGHT - this.padding, 'dialogs', 'textboxName').setOrigin(0.5, 1);
        this.nameBox.setScale(horizontalScale, 1);
        this.nameBox.visible = true;

        this.height = 135;      // Alto que va a ocupar el texto
        // Depurar el tamano real de la caja de texto
        /*
        this.graphics = scene.add.graphics();
        this.graphics.fillStyle('black', 1);
        this.graphics.fillRect(230, this.scene.CANVAS_HEIGHT / 1.28, (this.scene.CANVAS_WIDTH - this.padding) / 1.53, this.height);
        */

        // Indica si el texto de la caja esta centrado o no
        this.centered = false;

        // Configuracion por defecto del texto de la caja
        this.defaultNormalTextConfig = { ...scene.gameManager.textConfig };
        this.defaultNormalTextConfig.fontStyle = 'bold';
        this.defaultNormalTextConfig.strokeThickness = 5;
        // Inicialmente la configuracion del texto de la caja es la de por defecto
        this.normalTextConfig = { ...this.defaultNormalTextConfig };

        // Configuracion por defecto del texto del nombre
        this.defaultNameTextConfig = { ...scene.gameManager.textConfig };
        this.defaultNameTextConfig.fontStyle = 'bold';
        this.defaultNameTextConfig.strokeThickness = 5;
        // Inicialmente la configuracion del texto del nombre la por defecto
        this.nameTextConfig = { ...this.defaultNameTextConfig };

        // Animacion del texto
        this.textDelay = 30;                                                        // Tiempo que tarda en aparecer cada letra en milisegundos
        this.currText = this.scene.add.text(0, 0, "", this.normalTextConfig);       // Texto escrito hasta el momento
        this.fulltext = "";                                                         // Texto completo a escribir
        this.fullTextSplit = null;                                                  // Texto completo a escribir separado por palabras
        this.letterCount = 0;                                                       // Numero de letras del texto completo escritas
        this.finished = false;                                                      // Si ha terminado de mostrar el texto o no

        this.nameText = this.scene.add.text(0, 0, "", this.nameTextConfig);
        this.canWrite = false;

        this.box.alpha = 0;
        this.nameBox.alpha = 0;
        this.currText.alpha = 0;
        this.nameText.alpha = 0;

        // Retrato del personaje que habla
        this.portrait = null;
        this.nonPortraitChar = false;
    }

    getTransform() {
        return {
            x: this.box.x,
            y: this.box.y,
            originX: this.box.originX,
            originY: this.box.originY,
            scaleX: this.box.scaleX,
            scaleY: this.box.scaleY
        }
    }


    /**
    * Cambia el texto de la caja
    * @param {String} text - texto a escribir
    * @param {Boolean} animate - si se va a animar el texto o no
    */
    setText(dialogInfo, animate) {
        // Limpia los eventos
        if (this.timedEvent) this.timedEvent.remove();

        // Reinicia el numero de letras escritas y se separa
        // cada caracter del texto completo en un array
        this.letterCount = 0;
        this.fullText = dialogInfo.text;
        this.fullTextSplit = dialogInfo.text.split('');

        // Si el texto es animado, el texto inicial esta vacio
        // si no, el texto inicial es el texto completo
        let tempText = dialogInfo.text;
        this.finished = true;
        if (animate) {
            tempText = '';
            this.finished = false;
        }

        // Se crea el texto que se va a escribir y el nombre del personaje
        this.changeText(tempText);
        this.changeName(dialogInfo.name);

        this.nonPortraitChar = false;
        if (!this.portrait) {
            this.nonPortraitChar = true;
        }

        if (animate) {
            // Se crea el evento 
            this.timedEvent = this.scene.time.addEvent({
                delay: this.textDelay,
                callback: this.animateText,
                callbackScope: this,
                loop: true
            });
        }
    }

    /**
    * Cambia el texto que se muestra por pantalla
    * @param {String} text - texto a escribir
    */
    changeText(text) {
        // Nota: no hay soporte para texto centrado con retrato
        
        // Arriba a la izquierda y con retrato
        let x = 230;
        let y = 660;
        let width = (this.scene.CANVAS_WIDTH - this.padding) / 1.53;

        // Centrado y sin retrato
        if (this.centered) {
            x = this.box.x;
            y = this.box.y - this.box.displayHeight / 2.25;
            width = (this.scene.CANVAS_WIDTH - this.padding * 2) / 1.30;
        }
        else {
            // Arriba a la izquierda y sin retrato
            // Se modifica la posicion y los margenes del texto porque no hace falta mostrar su retrato
            if (!this.portrait) {
                x = 110;
                width = (this.scene.CANVAS_WIDTH - this.padding) / 1.30;
            }
        }

        this.normalTextConfig.wordWrap = {
            width: width,
            useAdvancedWrap: true
        };

        // Crea el texto en la escena
        this.currText.x = x;
        this.currText.y = y;
        this.currText.setStyle(this.normalTextConfig);
        this.currText.setText(text);
    }

    /**
    * Cambia el texto del nombre del personaje hablando
    * @param {String} name - nombre del personaje
    */
    changeName(name) {
        let x = 290;
        let y = 622;

        // Crea el texto en la escena
        this.nameText.setOrigin(0.5, 0.5);
        this.nameText.x = x;
        this.nameText.y = y;

        // Cambia el texto del objeto
        this.nameText.setText(name);
        this.nameText.setStyle(this.nameTextConfig);
    }

    /**
    * Devuelve si el texto de la caja supera la altura maxima
    * @returns {boolean} - true si la caja supera la altura maxima, false en caso contrario
    */
    textTooBig() {
        return (this.currText.getBounds().height > this.height);
    }

    /**
    * Cambia el retrato del personaje hablando
    * IMPORTANTE: LLAMARLO ANTES QUE setText PARA QUE EL TEXTO SE COLOQUE CORRECTAMENTE EN FUNCION
    * DE SI HAY RETRATO O NO
    * @param {Phaser.Image} portrait - retrato personaje que habla
    */
    setPortrait(portrait) {
        // Si el personaje que va a hablar no tiene retrato, no se va a mostrar (null)
        this.portrait = null;
        if (portrait) {
            this.portrait = portrait;
        }
    }

    // Anima el texto para que vaya apareciendo caracter a caracter
    animateText() {
        if (this.canWrite) {
            // Actualiza el numero de letras
            this.letterCount++;

            // Cambia el texto a mostrar por el texto actual + el nuevo caracter a escribir
            this.currText.setText(this.currText.text + this.fullTextSplit[this.letterCount - 1]);

            // Si se ya se han escrito todos los caracteres, elimina el evento
            if (this.letterCount === this.fullTextSplit.length) {
                this.timedEvent.remove();
                this.finished = true;
            }
        }

    }

    // Muestra de golpe el dialogo completo
    forceFinish() {
        if (this.timedEvent) this.timedEvent.remove();
        this.finished = true;
        if (this.currText) this.currText.setText(this.fullText);
    }

    /**
    * Activa/desactiva el cuadro de texto y ejecuta la funcion o lambda que se le
    * pase como parametro una vez haya terminado la animacion y el retardo indicado
    * @param {Boolean} active - si se va a activar
    * @param {Function} onComplete - funcion a la que llamar cuando acabe la animacion
    * @param {Number} delay - tiempo en ms que tarda en llamarse a onComplete
    */
    activate(active, onComplete, delay) {
        // Es visible si el alpha de la caja es 1
        let isVisible = this.box.alpha == 1;

        if (active && isVisible) {
            if (this.nonPortraitChar && this.portrait) {
                this.portrait.alpha = 0;
            }
        }

        // Si se va a activar y no es visible, aparece con animacion.
        if (active && !isVisible) {
            this.canWrite = false;

            // Si el personaje que va a hablar no tiene retrato, no lo muestra
            // y si lo tiene, si lo muestra
            if (this.nonPortraitChar) {
                this.box.disableInteractive();
                super.activate(true, [this.box, this.nameBox, this.currText, this.nameText], () => {
                    setTimeout(() => {
                        this.box.setInteractive({ useHandCursor: true });
                        this.canWrite = true;
                    }, 200);

                }, 0);
            }
            else {
                this.box.disableInteractive();
                super.activate(true, [this.box, this.nameBox, this.currText, this.nameText, this.portrait], () => {
                    setTimeout(() => {
                        this.box.setInteractive({ useHandCursor: true });
                        this.canWrite = true;
                    }, 200);
                }, 0);
            }
        }
        // Si se va a desactivar y es visible, desaparece con animacion
        else if (!active && isVisible) {
            this.box.disableInteractive();
            this.canWrite = false;

            // Si el personaje que va a hablar no tiene retrato, no lo oculta (ya que ya deberia estarlo)
            // y si tiene retrato, si lo oculta
            if (this.nonPortraitChar) {
                super.activate(false, [this.box, this.nameBox, this.currText, this.nameText], onComplete, delay);
            }
            else {
                super.activate(false, [this.box, this.nameBox, this.currText, this.nameText, this.portrait], onComplete, delay);
            }
        }
        // Si se va a desactivar y no era visible, se llama a la funcion que se ha pasado
        else if (!active && !isVisible) {
            if (onComplete !== null && typeof onComplete === 'function') {
                setTimeout(() => {
                    onComplete();
                }, delay);

            }
        }
    }

    /**
     * Se resetea la configuracion del texto de la caja a la por defecto
     */
    resetTextConfig() {
        this.normalTextConfig = { ...this.defaultNormalTextConfig };
        // Por si acaso
        if (this.centered) {
            this.normalTextConfig.align = 'center';
        }
        this.nameTextConfig = { ...this.defaultNameTextConfig };
    }

    /**
     * Alinear el texto de la caja al centro o arriba a la izquierda
     * @param {Boolean} centered - true si el texto esta centrado, false si esta arriba a la izquierda
     */
    centerText(centered) {
        this.centered = centered;

        this.normalTextConfig.align = 'left';
        this.currText.setOrigin(0);
        if (this.centered) {
            this.normalTextConfig.align = 'center';
            this.currText.setOrigin(0.5);
        }
    }
}

class OptionBox extends DialogObject {
    /**
    * Caja de texto para la opcion multiple
    * @extends DialogObject
    * @param {Phaser.Scene} scene - escena a la que pertenece
    * @param {Number} index - indice de la opcion
    * @param {Number} numOpts - numero total de elecciones
    * @param {String} text - texto de la opcion
    */
    constructor(scene, dialogManager, index, numOpts, text) {
        super(scene);

        let padding = 10;
        this.box = scene.add.image(this.scene.CANVAS_WIDTH / 2, 0, 'dialogs', 'optionBg').setOrigin(0.5, 0);
        let scale = this.scene.CANVAS_WIDTH / (this.box.width + padding);
        this.box.setScale(scale);

        this.box.y = this.scene.CANVAS_HEIGHT - (this.box.displayHeight * numOpts) + (this.box.displayHeight * index);

        // Configuracion del texto de la caja
        this.textConfig = { ...scene.gameManager.textConfig };
        this.textConfig.fontSize = 25 + 'px';
        this.textConfig.fontStyle = 'bold';
        this.textConfig.strokeThickness = 5;

        let x = 50;
        let y = this.box.y + this.box.displayHeight / 2;

        // Crea el texto
        this.text = this.scene.add.text(x, y, text, this.textConfig);
        this.text.setOrigin(0, 0.5);

        this.box.setInteractive({ useHandCursor: true });

        // Configuracion de las animaciones
        let tintFadeTime = 50;

        let noTint = Phaser.Display.Color.HexStringToColor('#ffffff');
        let pointerOverColor = Phaser.Display.Color.HexStringToColor('#00ff56');

        // Hace fade del color de la caja al pasar o quitar el raton por encima
        this.box.on('pointerover', () => {
            scene.tweens.addCounter({
                targets: [this.box],
                from: 0,
                to: 100,
                onUpdate: (tween) => {
                    const value = tween.getValue();
                    let col = Phaser.Display.Color.Interpolate.ColorWithColor(noTint, pointerOverColor, 100, value);
                    let colInt = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
                    this.box.setTint(colInt);
                },
                duration: tintFadeTime,
                repeat: 0,
            });
        });
        this.box.on('pointerout', () => {
            scene.tweens.addCounter({
                targets: [this.box],
                from: 0,
                to: 100,
                onUpdate: (tween) => {
                    const value = tween.getValue();
                    let col = Phaser.Display.Color.Interpolate.ColorWithColor(pointerOverColor, noTint, 100, value);
                    let colInt = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
                    this.box.setTint(colInt);
                },
                duration: tintFadeTime,
                repeat: 0,
            });
        });

        // Al hacer click, vuelve a cambiar el color de la caja al original
        // y avisa a la escena de la opcion elegida 
        this.box.on('pointerdown', () => {
            this.box.disableInteractive();
            let fadeColor = scene.tweens.addCounter({
                targets: [this.box],
                from: 0,
                to: 100,
                onUpdate: (tween) => {
                    const value = tween.getValue();
                    let col = Phaser.Display.Color.Interpolate.ColorWithColor(pointerOverColor, noTint, 100, value);
                    let colInt = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
                    this.box.setTint(colInt);
                },
                duration: tintFadeTime,
                repeat: 0,
                yoyo: true
            });
            fadeColor.on('complete', () => {
                dialogManager.selectOption(index);
            });
        });

        this.box.alpha = 0;
        this.text.alpha = 0;
        this.box.disableInteractive();
    }

    /**
    * Activa/desactiva la caja
    * @param {Boolean} active - si se va a activar
    */
    activate(active) {
        // Es visible si el alpha de la caja es 1
        let isVisible = this.box.alpha == 1;
        this.box.disableInteractive();

        // Si se va a activar y no es visible, aparece con animacion
        if (active && !isVisible) {
            super.activate(true, [this.box, this.text], () => {
                this.box.setInteractive({ useHandCursor: true });
            }, 0);
        }
        // Si se va a desactivar y es visible, desaparece con animacion
        else if (!active && isVisible) {
            super.activate(false, [this.box, this.text]);
        }
    }

}

class DialogManager {
    /**
    * Gestor de los dialogos. Crea la caja de texto/opciones con su texto y se encarga de actualizarlos.
    * Los nodos de dialogos tienen que estar creados con antelacion (deberia hacerse en la constructora de la escena)
    */
    constructor(scene) {
        this.scene = scene;

        this.textbox = null;                // Instancia de la caja de dialogo
        this.lastCharacter = "";            // Ultimo personaje que hablo
        this.options = [];                  // Cajas de opcion multiple
        this.currNode = null;               // Nodo actual
        this.portraits = new Map();         // Mapa para guardar los retratos en esta escena
        this.allPortraits = new Set();
        this.launched=false;
        this.activeDialogTracker = null;    // Tracker para completar dialogos en xAPI

        this.gameManager = GameManager.getInstance();
        this.dispatcher = this.gameManager.dispatcher;

        this.textbox = new TextBox(scene, this);

        // Mascara para los retratos de los personajes (para que no se pinten fuera de la caja de texto)
        let mask = scene.add.image(this.textbox.getTransform().x, this.textbox.getTransform().y, 'textboxMask');
        // let mask = this.add.image(this.textbox.box.x, this.textbox.box.y, 'dialog', 'textboxMask.png');
        mask.setOrigin(this.textbox.getTransform().originX, this.textbox.getTransform().originY);
        mask.setScale(this.textbox.getTransform().scaleX, this.textbox.getTransform().scaleY);
        mask.setCrop(0, 0, 160, mask.displayHeight);
        mask.visible = false;
        this.portraitMask = mask.createBitmapMask();

        this.setTalking(false);

        // Anade un rectangulo para bloquear la interaccion con los elementos del fondo
        this.bgBlock = scene.add.rectangle(0, 0, this.scene.CANVAS_WIDTH, this.scene.CANVAS_HEIGHT, 0xfff, 0).setOrigin(0, 0);
        this.bgBlock.setDepth(this.textbox.box.depth - 1);
        this.bgBlock.on('pointerdown', () => {
            if (this.textbox.box.input.enabled && this.textbox.box.alpha > 0) {
                this.nextDialog();
            }
            else if (!this.currNode) {
                // console.log("node null when clicking bgBlock");
                this.setNode(null);
            }
        });

        this.textbox.activate(false);
        this.bgBlock.disableInteractive();
        this.activateOptions(false);
    }


    /**
     * Metodo que elimina de esta escena todos los retratos guardados
     * anteriormente para que no de error al destruir las escenas 
     */
    clearScene() {
        this.portraits.clear();
        this.allPortraits.forEach((portrait) => {
            portrait.destroy();
        });
        this.allPortraits.clear();
    }

    /**
    * Metodo que se llama cuando se llama al changeScene de una escena 
    * @param {Phaser.Scene} scene - escena a la que se va a pasar
    */
    changeScene(scene) {
        xapiTracker.accessible(scene.scene.key, xapiTracker.ACCESSIBLETYPE.SCREEN)
                    .accessed()
                    .send();
        // Desactiva la caja de texto y las opciones (por si acaso)
        this.textbox.activate(false);
        // console.log("bgBlock interactive disabled when changing scene");
        this.bgBlock.disableInteractive();
        this.activateOptions(false);
        this.portraits.clear();

        // Coge todos los retratos de los personajes de la escena, 
        // los copia en esta escena, y les aplica la mascara
        scene.portraits.forEach((value, key) => {
            // Guarda los retratos de todas las escenas que se ejecutan sin destuirse, ya que al
            // cambiar de escena, se pierde la referncia a los retratos, pero siguen existiendo
            this.allPortraits.add(value);

            let p = this.scene.add.existing(value);
            this.portraits.set(key, p);
            p.alpha = 0;
            p.setMask(this.portraitMask);
        });
    }


    /**
    * Devuelve el retrato del personaje indicado
    * @param {String} character - id del personaje
    * @returns {Phaser.Image} - imagen con el retrato del personaje. 
    *                          Devuelve null si la id no esta en el mapa de retratos 
    */
    getPortrait(character) {
        return this.portraits.get(character);
    }

    /**
    * Cambia el texto de la caja
    * @param {String} text - texto a escribir
    * @param {Boolean} animate - si se va a animar el texto o no
    */
    setText(dialogInfo, animate) {
        this.textbox.setText(dialogInfo, animate);
    }

    /**
    * Devuelve si el texto de la caja supera la altura maxima
    * @returns {boolean} - true si la caja supera la altura maxima, false en caso contrario
    */
    textTooBig() {
        return (this.textbox.textTooBig());
    }

    /**
    * Cambia el nodo actual por el indicado
    * @param {DialogNode} node - nodo que se va a poner como nodo actual
    */
    setNode(node) {
        // Si no hay ningun dialogo activo y el nodo a poner es valido
        if (!this.isTalking() && node !== null) {
            // Indica que ha empezado un dialogo
            this.setTalking(true);

            // Desactiva la caja de texto y las opciones (por si acaso)
            this.textbox.activate(false);
            // console.log("bgBlock interactive disabled when setting valid node");
            this.bgBlock.disableInteractive();
            this.activateOptions(false);

            // Cambia el nodo por el indicado
            this.currNode = node;
            this.lastCharacter = null;
            this.processNode(node);
        }
        else {
            // Se resetea la configuracion del texto de la caja por si se habia cambiado a la de por defecto
            this.currNode = null;
            this.textbox.resetTextConfig();
            this.textbox.activate(false);
            // console.log("bgBlock interactive disabled when setting null node");
            this.bgBlock.disableInteractive();
            this.setTalking(false);
        }
    }

    /**
     * Procesa el nodo de condicion que se le pase como parametro
     * @param {DialogNode} node - Nodo a procesar 
     * @returns {Number} - indice del siguiente nodo
     */
    processCondition(node) {
        let conditionMet = false;
        let i = 0;

        // Recorre todas las condiciones hasta que se haya cumplido la primera
        while (i < node.conditions.length && !conditionMet) {
            let allConditionsMet = true;
            let j = 0;

            // Se recorren todas las variables de la condicion mientras se cumplan todas
            while (j < node.conditions[i].length && allConditionsMet) {
                // Coge el nombre de la variable, el operador y el valor esperado 
                let variable = node.conditions[i][j].key;
                let operator = node.conditions[i][j].operator;
                let expectedValue = node.conditions[i][j].value;

                // Busca el valor de la variable en la blackboard indicada. 
                // Si no es valida, buscara por defecto en el gameManager
                let variableValue = this.gameManager.getValue(variable, node.conditions[i][j].blackboard);
                // console.log(variable + " " + variableValue);

                if (operator === "equal") {
                    conditionMet = variableValue === expectedValue;
                }
                else if (operator === "greater") {
                    conditionMet = variableValue >= expectedValue;

                }
                else if (operator === "lower") {
                    conditionMet = variableValue <= expectedValue;

                }
                else if (operator === "different") {
                    conditionMet = variableValue !== expectedValue;
                }

                // Se habran cumplido todas las condiciones si todas las condiciones
                // se han cumplido anteriormente y esta tambien se ha cumplido
                allConditionsMet &= conditionMet;

                j++;
            }

            // Si no se ha cumplido ninguna condicion, pasa a la siguiente
            if (!conditionMet) i++;
        }
        return i;
    }

    /**
     * Procesa el nodo de evento que se le pasa como parametro
     * @param {DialogNode} node - nodo a procesar 
     */
    processEvent(node) {
        // Recorre todos los eventos del nodo y les hace dispatch con el delay establecido (si tienen)
        for (let i = 0; i < node.events.length; i++) {
            let evt = node.events[i];

            let delay = 0;
            if (evt.delay) {
                delay = evt.delay;
            }
            setTimeout(() => {
                this.dispatcher.dispatch(evt.name, evt);

                // console.log("Dispatching " + evt.name);
                // Si el evento establece el valor de una variable, lo cambia en la 
                // blackboard correspondiente (la de la escena o la del gameManager)
                let blackboard = this.gameManager.blackboard;
                if (evt.global !== undefined && evt.global === false) {
                    blackboard = evt.blackboard;
                }
                if (evt.variable && evt.value !== undefined) {
                    this.gameManager.setValue(evt.variable, evt.value, blackboard);
                }
            }, delay);
        }
    }

    // Procesa el nodo actual dependiendo de su tipo
    processNode() {
        // Si el nodo actual es valido
        if (this.currNode) {
            this.bgBlock.setInteractive();

            // Si el nodo es un nodo condicional
            if (this.currNode.type === "condition") {
                let i = this.processCondition(this.currNode);

                // El indice del siguiente nodo sera el primero que cumpla una de las condiciones
                this.currNode = this.currNode.next[i];

                // Pasa al siguiente nodo
                this.processNode();
            }
            else if (this.currNode.type === "choice") {
                this.createOptions(this.currNode.choices);
                this.activateOptions(true);
            }
            else if (this.currNode.type === "text") {
                if(!this.launched) {
                    var dialog = this.currNode.dialogs[0];
                    this.activeDialogTracker = xapiTracker.completable(`${this.currNode.fullId}`, xapiTracker.COMPLETABLETYPE.STORYNODE);
                    this.activeDialogTracker.initialized().send();
                    this.launched=true;
                }
                // Si el nodo no tiene texto, se lo salta y pasa al siguiente nodo
                // IMPORTANTE: DESPUES DE UN NODO DE DIALOGO SOLO HAY UN NODO, POR LO QUE 
                // EL SIGUIENTE NODO SERA EL PRIMER NODO DEL ARRAY DE NODOS SIGUIENTES
                if (this.currNode.dialogs[this.currNode.currDialog].text.length < 1) {
                    this.currNode = this.currNode.next[0];
                    this.processNode();
                }
                else {
                    // Funcion a ejecutar para mostrar la caja. Actualiza el retrato y el texto y activa la caja
                    let showBox = () => {
                        this.textbox.setPortrait(this.portraits.get(this.currNode.character));
                        this.textbox.centerText(this.currNode.centered);
                        this.setText(this.currNode.dialogs[this.currNode.currDialog], true);
                        this.textbox.activate(true);
                    };

                    // Si el ultimo personaje que hablo es distinto del que habla ahora, se oculta la caja y luego se muestra
                    if (this.currNode.character !== this.lastCharacter) {
                        this.textbox.activate(false, () => {
                            showBox();
                        }, 0);
                    }
                    // Si no, se muestra directamente. Si la caja ya estaba activa, no vuelve a mostrarla
                    else {
                        showBox();
                    }
                }
            }
            else if (this.currNode.type === "event") {
                this.processEvent(this.currNode);

                // IMPORTANTE: DESPUES DE UN NODO DE EVENTO SOLO HAY UN NODO, POR LO QUE 
                // EL SIGUIENTE NODO SERA EL PRIMER NODO DEL ARRAY DE NODOS SIGUIENTES
                this.currNode = this.currNode.next[0];
                this.processNode();
            }
            else if (this.currNode.type === "chatMessage") {
                this.setTalking(false);
                this.scene.phoneManager.phone.setChatNode(this.currNode.chat, this.currNode);
                // console.log("bgBlock interactive disabled when setting chatMessageNode");
                this.bgBlock.disableInteractive();
            }
            else if (this.currNode.type === "socialNetMessage") {
                // Funcion comun (se anade el comentario al post y se procesa el nodo)
                let fnAux = () => {
                    xapiTracker.alternative(this.currNode.postName, xapiTracker.ALTERNATIVETYPE.DIALOG)
                                .selected(this.currNode.text)
                                .send();
                    this.gameManager.computerScene.socialNetScreen.addCommentToPost(this.currNode.owner, this.currNode.postName,
                        this.currNode.character, this.currNode.name, this.currNode.text);

                    this.currNode = this.currNode.next[0];
                    this.processNode();
                };
                // Si el retraso es 0...
                if (this.currNode.replyDelay <= 0) {
                    // Se procesa inmediatamente
                    // Importante: se hace de esta manera porque aunque setTimeout permite un delay de 0 segundos,
                    // el codigo no se procesa al instante.
                    // Es muy importante que los mensaje con un delay de 0 segundos se procesen al instante porque al crear un post
                    // se anade una lista larga de mensajes iniciales y si no se procesan en orden, this.currNode se vuelve loco
                    fnAux();
                }
                // Sino...
                else {
                    // Se usa un timeout
                    setTimeout(() => {
                        fnAux();
                    }, this.currNode.replyDelay);
                }
            }
        }
        // Se ha acabado el dialogo o se ha pasado un nodo invalido
        else {
            // console.log("node null when processing currentNode == null");
            this.setNode(null);
        }
    }

    // Pasa al siguiente dialogo
    // (llamado al hacer click en la caja de texto)
    nextDialog() {
        if (this.currNode.type === "text") {
            // Si aun no ha acabado de mostrarse todo el texto, lo muestra de golpe
            if (!this.textbox.finished) {
                this.textbox.forceFinish();
            }
            // Si ha acabado de mostrarse todo el dialogo
            else {
                // Actualiza el dialogo que se esta mostrando del nodo actual
                this.currNode.currDialog++;
                // Si aun no se han mostrado todos los dialogos del nodo, muestra el siguiente dialogo
                if (this.currNode.currDialog < this.currNode.dialogs.length) {
                    this.setText(this.currNode.dialogs[this.currNode.currDialog], true);
                }
                // Si ya se han mostrado todos los dialogos
                else {
                    // Actualiza el ultimo personaje que se ha hablado
                    this.lastCharacter = this.currNode.character;
                    // Completa el dialogo rastreado
                    if (this.activeDialogTracker) {
                        this.activeDialogTracker.completed(true, true).send();
                        this.activeDialogTracker = null;
                    }
                    this.launched=false;
                    // Se reinicia el dialogo del nodo actual y actualiza el nodo al siguiente
                    // IMPORTANTE: DESPUES DE UN NODO DE DIALOGO SOLO HAY UN NODO, POR LO QUE 
                    // EL SIGUIENTE NODO SERA EL PRIMER NODO DEL ARRAY DE NODOS SIGUIENTES
                    this.currNode.currDialog = 0;
                    this.currNode = this.currNode.next[0];
                    this.processNode();
                }
            }

        }
    }



    /**
    * Crea las opciones de eleccion multiple
    * @param {Array} opts - array con los strings/opciones a mostrar
    */
    createOptions(opts) {
        // Limpia las opciones que hubiera anteriormente
        for (let i = 0; i < this.options.length; i++) {
            this.options[i].activate(false);
        }
        this.options = [];

        // Crea las opciones y las guarda en el array
        for (let i = 0; i < opts.length; i++) {
            this.options.push(new OptionBox(this.scene, this, i, opts.length, opts[i].text));
        }

    }

    /**
    * Activa/desactiva las cajas de opcion multiple
    * @param {Boolean} active - si se van a activar o no las opciones
    * @param {Function} onComplete - funcion a la que llamar cuando acabe la animacion
    * @param {Number} delay - tiempo en ms que tarda en llamarse a onComplete
    */
    activateOptions(active, onComplete = {}, delay = 0, instant = false) {
        // Dependiendo de si es instantaneo o no, se ocultan las opciones con animacion o sin ella. 
        // Oculta primero la caja de texto por si acaso y luego muestra las opciones
        this.textbox.activate(false, () => {
            for (let i = 0; i < this.options.length; i++) {
                if (instant) {
                    this.options[i].box.visible = active;
                    this.options[i].text.visible = active;
                }
                else {
                    this.options[i].activate(active);
                }
            }

            // Si la funcion es valida, se ejecuta con el retardo indicado
            if (onComplete !== null && typeof onComplete === 'function') {
                setTimeout(() => {
                    onComplete();
                }, delay);
            }
        });
    }

    /**
    * Elige la opcion sobre la que se ha hecho click (llamado desde la instancia correspondiente de OptionBox)
    * @param {Number} index - indice elegido
    */
    selectOption(index) {
        // Desactiva las opciones
        this.activateOptions(false);

        let next = this.currNode.next[index];
        let statementBuilder = xapiTracker.alternative(this.currNode.fullId, xapiTracker.ALTERNATIVETYPE.DIALOG)
                    .selected(`${index}`);
        for (let i = 0; i < this.currNode.choices.length; i++) {
            statementBuilder.withResultExtension(`choice/${i}`, `${this.currNode.choices[i].fullId}`);
        }
        statementBuilder.send();
        // Si la opcion no se puede elegir de nuevo, elimina tanto la opcion
        // como el nodo al que lleva de sus arrays correspondientes
        if (!this.currNode.choices[index].repeat) {
            this.currNode.choices.splice(index, 1);
            this.currNode.next.splice(index, 1);
        }

        // Actualiza el nodo actual y lo procesa            
        this.currNode.selectedOption = index;
        this.currNode = next;
        this.processNode();
    }

    /**
    * Metodo que se llama cuando inicia o termina un dialogo 
    * @param {Boolean} talking - true si el dialogo inicia, false si acaba
    */
    setTalking(talking) {
        this.talking = talking;
    }

    /**
    * Metodo para comprobar si un dialogo esta activo o no
    * @returns {boolean} - true si hay un dialogo activo, false en caso contrario
    */
    isTalking() {
        return this.talking;
    }
}

class BaseScreen extends Phaser.GameObjects.Container {
    /**
     * Pantalla base para las distintas pantallas del telefono
     * @extends Phaser.GameObjects.Container
     * @param {Phaser.Scene} scene - escena a la que pertenece (UIManager)
     * @param {Phone} phone - telefono
     * @param {String} bgImage - id de la imagen de fondo
     * @param {BaseScreen} prevScreen - pantalla anterior
     */
    constructor(scene, phone, bgImage, prevScreen) {
        super(scene, 0, 0);
        this.scene = scene;
        this.phone = phone;

        this.gameManager = GameManager.getInstance();
        this.i18next = this.gameManager.i18next;

        this.prevScreen = prevScreen;

        // Configuracion de las posiciones y dimensiones
        this.BG_X = this.phone.PHONE_X + 150;
        this.BG_Y = this.scene.CANVAS_HEIGHT / 2 + 6;

        this.BUTTON_Y = this.scene.CANVAS_HEIGHT * 0.85 + 3;
        this.BUTTON_SCALE = 0.34;


        // Se ponen las imagenes en la pantalla
        this.bg = scene.add.image(this.BG_X, this.BG_Y, 'phoneElements', bgImage);
        this.returnButton = scene.add.image(this.BG_X - this.BG_X / 6, this.BUTTON_Y, 'phoneElements', 'returnButton').setScale(this.BUTTON_SCALE);
        this.homeButton = scene.add.image(this.BG_X, this.BUTTON_Y, 'phoneElements', 'homeButton').setScale(this.BUTTON_SCALE);
        this.uselessButton = scene.add.image(this.BG_X + this.BG_X / 6, this.BUTTON_Y, 'phoneElements', 'uselessButton').setScale(this.BUTTON_SCALE);

        // Se anaden las imagenes a la escena
        this.add(this.bg);
        this.add(this.returnButton);
        this.add(this.homeButton);
        this.add(this.uselessButton);

        this.sendToBack(this.bg);

        // Se anima y se da funcionalidad a los botones
        this.animateButton(this.returnButton, () => { phone.toPrevScreen(); });
        this.animateButton(this.homeButton, () => { phone.toMainScreen(); });
        this.animateButton(this.uselessButton);

        this.bg.setInteractive();
    }

    /**
     * Anade al boton la animacion y la funcion a la que debe llamar
     * @param {Phaser.Image} button - imagen que animar
     * @param {Function} onClick - funcion a la que llama el boton al pulsarlo
     */
    animateButton(button, onClick) {
        // Se hace interactivo
        button.setInteractive({ useHandCursor: true });
        let originalScale = button.scale;

        // Al pasar el raton por encima, el icono se hace mas grande,
        // y al sacarlo, el icono vuelve a su escala original
        button.on('pointerover', () => {
            this.scene.tweens.add({
                targets: [button],
                scale: originalScale * 1.1,
                duration: 0,
                repeat: 0,
            });
        });
        button.on('pointerout', () => {
            this.scene.tweens.add({
                targets: [button],
                scale: originalScale,
                duration: 0,
                repeat: 0,
            });
        });

        // Al hacer click, se hace mas pequeno y vuelve a 
        // ponerse como estaba originalmente (efecto yoyo)
        button.on('pointerdown', () => {
            let anim = this.scene.tweens.add({
                targets: [button],
                scale: originalScale,
                duration: 20,
                repeat: 0,
                yoyo: true
            });

            // Si la funcion onClick es valida y se ha hecho la 
            // animacion, al terminar la animacion llama a la funcion
            if (anim && onClick !== null && typeof onClick === 'function') {
                anim.on('complete', () => {
                    onClick();
                });
            }
        });
    }


}

class AlarmScreen extends BaseScreen {
    constructor(scene, phone, prevScreen) {
        super(scene, phone, 'alarmBg', prevScreen);

        // Quita los botones de la parte inferior
        this.remove(this.returnButton);
        this.remove(this.homeButton);
        this.remove(this.uselessButton);
        this.returnButton.destroy();
        this.homeButton.destroy();
        this.uselessButton.destroy();


        // Configuracion de texto para la el texto de ll titulo
        let textConfig = { ...scene.gameManager.textConfig };
        textConfig.fontFamily = 'gidole-regular';
        textConfig.fontSize = 40 + 'px';

        // Se coge el texto del archivo de traducciones y se pone en pantalla 
        let text = this.i18next.t("alarm.title", { ns: "phoneInfo" });
        let alarmText = this.scene.add.text(this.BG_X, this.BG_Y * 0.4, text, textConfig).setOrigin(0.5, 0.5);

        // Configuracion de texto para el reloj
        let hourTextConfig = { ...scene.gameManager.textConfig };
        hourTextConfig.fontFamily = 'gidole-regular';
        hourTextConfig.fontSize = 100 + 'px';

        let dayTextConfig = { ...scene.gameManager.textConfig };
        dayTextConfig.fontFamily = 'gidole-regular';

        // Crea el texto y lo anade a la escena
        this.hourText = this.scene.add.text(this.BG_X, this.BG_Y * 0.65, "", hourTextConfig).setOrigin(0.5, 0.5);
        this.dayText = this.scene.add.text(this.BG_X, this.BG_Y * 0.8, "", dayTextConfig).setOrigin(0.5, 0.5);

        // Se ponen la imagen del deslizable en la pantalla
        let scrollable = scene.add.image(this.BG_X, this.BG_Y * 1.18, 'phoneElements', 'homeButton').setScale(this.ICON_SCALE);
        scrollable.setInteractive({ draggable: true, useHandCursor: true });

        // Limites de hasta donde se puede deslizar el icono
        let leftBound = this.BG_X - this.bg.displayWidth / 2 + scrollable.displayWidth / 2;
        let rightBound = this.BG_X + this.bg.displayWidth / 2 - scrollable.displayWidth / 2;

        // Bloquea el deslizamiento para que solo se pueda mover horizontalmente hasta los limites
        scrollable.on('drag', (pointer, dragX, dragY) => {
            dragX = Phaser.Math.Clamp(dragX, leftBound, rightBound);
            scrollable.x = dragX;
        });

        // Cuando se deja de deslizar,
        scrollable.on('dragend', (pointer, dragX, dragY) => {
            // Si se ha deslizado hasta la izquierda, llama a la funcion para quedarse dormido 
            if (scrollable.x === leftBound) {
                phone.phoneManager.sleep();
            }
            // Si se ha deslizado hasta la derecha, llama a la funcion para despertarse
            else if (scrollable.x === rightBound) {
                phone.phoneManager.wakeUp();
            }

            // Se pone el icono de nuevo en su posicion original
            scrollable.x = this.BG_X;
        });

        this.add(alarmText);
        this.add(this.hourText);
        this.add(this.dayText);
        this.add(scrollable);
    }

    /**
     * Cambia el texto del dia y la hora
     * @param {String} hour - hora
     * @param {String} dayText - informacion del dia
     */
    setDayInfo(hour, dayText) {
        if (hour !== "") {
            this.hourText.setText(hour);
        }
        if (dayText !== "") {
            this.dayText.setText(dayText);
        }
    }

}

class MainScreen extends BaseScreen {
    constructor(scene, phone, prevScreen) {
        super(scene, phone, 'mainScreenBg', prevScreen);

        // Configuracion de las posiciones y dimensiones
        this.ICON_SCALE = 0.45;
        this.ICON_Y = this.BG_Y * 1.1;

        // Se ponen las imagenes en la pantalla
        let statusButton = scene.add.image(this.BG_X - this.BG_X / 6, this.ICON_Y, 'phoneElements', 'statusIcon').setScale(this.ICON_SCALE);
        let chatButton = scene.add.image(this.BG_X, this.ICON_Y, 'phoneElements', 'chatIcon').setScale(this.ICON_SCALE);
        let settingsButton = scene.add.image(this.BG_X - this.BG_X / 6, this.ICON_Y * 1.25, 'phoneElements', 'settingsIcon').setScale(this.ICON_SCALE);

        // Se anaden las imagenes a la escena
        this.add(statusButton);
        this.add(chatButton);
        this.add(settingsButton);

        // Se anima y se da funcionalidad a los botones
        super.animateButton(statusButton, () => { phone.toStatusScreen(); });
        super.animateButton(chatButton, () => { phone.toMsgScreen(); });
        super.animateButton(settingsButton, () => { phone.toSettingsScreen(); });


        // Configuracion de texto para el reloj
        let hourTextConfig = { ...scene.gameManager.textConfig };
        hourTextConfig.fontFamily = 'gidole-regular';
        hourTextConfig.fontSize = 100 + 'px';
        hourTextConfig.fontStyle = 'bold';

        let dayTextConfig = { ...scene.gameManager.textConfig };
        dayTextConfig.fontFamily = 'gidole-regular';
        dayTextConfig.fontStyle = 'bold';

        // Crea el texto y lo anade a la escena
        this.hourText = this.scene.add.text(this.BG_X, this.BG_Y * 0.65, "", hourTextConfig).setOrigin(0.5, 0.5);
        this.dayText = this.scene.add.text(this.BG_X, this.BG_Y * 0.8, "", dayTextConfig).setOrigin(0.5, 0.5);

        // Crea el icono de las notificaciones
        let notifObj = phone.phoneManager.createNotification(chatButton.x + chatButton.displayWidth / 3, chatButton.y - chatButton.displayHeight / 3);
        this.notifications = notifObj.container;
        this.notificationText = notifObj.text;

        this.add(this.hourText);
        this.add(this.dayText);
        this.add(this.notifications);
    }


    /**
     * Cambia el texto del dia y la hora
     * @param {String} hour - hora
     * @param {String} dayText - informacion del dia
     */
    setDayInfo(hour, dayText) {
        if (hour !== "") {
            this.hourText.setText(hour);
        }
        if (dayText !== "") {
            this.dayText.setText(dayText);
        }
    }

    /**
     * Establece las notificaciones que hay
     * @param {Number} amount - numero de notificaciones a poner
     */
    setNotifications(amount) {
        // Si son mas de 0, activa las notificaciones y cambia el texto
        if (amount > 0) {
            this.notifications.visible = true;
            this.notificationText.setText(amount);
        }
        // Si no, las desactiva
        else {
            this.notifications.visible = false;
            this.notificationText.setText("");
        }
    }
}

class StatusBar {
    constructor(scene, screen, x, y, w, h, character) {
        let bgCol = 0xc0c0c0;
        let borderCol = 0x000000;
        let borderThickness = 2;
        this.minValCol = 0xff0000;
        this.maxValCol = 0x00ff00;

        let bgRadius = this.calculateRadius(w, h, 0.25);
        let bgGraphics = scene.make.graphics().fillStyle(bgCol, 1).fillRoundedRect(0, 0, w, h, bgRadius).lineStyle(borderThickness, borderCol, 1).strokeRoundedRect(0, 0, w, h, bgRadius);
        bgGraphics.generateTexture('statusBarBg' + character, w, h);
        let bg = scene.add.image(x, y, 'statusBarBg' + character).setOrigin(0.5, 0.5);
        bgGraphics.destroy();

        let barW = w * 0.95;
        let barH = h * 0.75;
        let barRadius = this.calculateRadius(barW, barH, 0.25);
        let barGraphics = scene.make.graphics().fillStyle(0xffffff, 1).fillRoundedRect(0, 0, barW, barH, barRadius).lineStyle(borderThickness, borderCol, 1).strokeRoundedRect(0, 0, barW, barH, barRadius);
        barGraphics.generateTexture('statusBarFill' + character, barW, barH);
        this.bar = scene.add.image(x - barW / 2, y, 'statusBarFill' + character).setOrigin(0, 0.5);
        barGraphics.destroy();

        this.value = 50;
        this.updateColor();

        screen.add(bg);
        screen.add(this.bar);        
    }

    calculateRadius(w, h, ratio) {
        let min = Math.min(w, h);
        return min * ratio;
    }

    updateColor() {
        let minHexColor = Phaser.Display.Color.ValueToColor(this.minValCol);
        let maxHexColor = Phaser.Display.Color.ValueToColor(this.maxValCol);

        let scale = Phaser.Math.Clamp(this.value, 0, 100);
        let col = Phaser.Display.Color.Interpolate.ColorWithColor(minHexColor, maxHexColor, 100, scale);
        let colInt = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
        this.bar.setTint(colInt);

        this.bar.setScale(scale / 100, 1);
    }
}

class StatusScreen extends BaseScreen {
    constructor(scene, phone, prevScreen) {
        super(scene, phone, 'statusBg', prevScreen);
        this.scene = scene;

        // Configuracion de texto para la el texto de ll titulo
        let textConfig = { ...scene.gameManager.textConfig };
        textConfig.fontSize = '30px';
        textConfig.fontFamily = 'gidolinya-regular';
        textConfig.fontStyle = 'normal';
        textConfig.color = '#FFF';

        // Se coge el texto del archivo de traducciones y se pone en pantalla 
        let text = this.i18next.t("statusScreen.title", { ns: "phoneInfo" });
        let title = this.scene.add.text(this.BG_X, this.BG_Y * 0.39, text, textConfig).setOrigin(0.5, 0.5);
        text = this.i18next.t("statusScreen.subtitle", { ns: "phoneInfo" });
        let subtitle = this.scene.add.text(this.BG_X, this.BG_Y * 0.63, text, textConfig).setOrigin(0.5, 0.5);
        
        this.statusBars = new Map();
        
        this.average = new StatusBar(scene, this, this.BG_X, this.BG_Y / 2.05, 170, 30, "Average");
        this.addStatusBar("Alison", "left");
        this.addStatusBar("Alex", "mid");
        this.addStatusBar("Guille", "left");
        this.addStatusBar("Ana", "mid");
        this.addStatusBar("Maria", "left");
        this.addStatusBar("Jose", "mid");
        this.addStatusBar("parents", "left");
        this.addStatusBar("teacher", "mid");

        this.updateRelationShip();
        
        this.add(title);
        this.add(subtitle);
    }

    /**
     * Anade la barra de amistad del personaje indicado a pantalla y la guarda en el mapa
     * @param {String} character - id del personaje de la barra
     * @param {String} pos - posicion en la que colocar la barra (a la izquierda o en el medio)
     */
    addStatusBar(character, pos = "left") {
        let LEFT_X = this.BG_X + this.bg.displayWidth * 0.01;
        let MID_X =  LEFT_X + 75;
        let BAR_Y = this.BG_Y * 0.74;
        let BAR_OFFSET = 51;
        let BAR_ERROR = 3;
        let BAR_W = 140;
        let BAR_H = 15;

        let barPos = LEFT_X;
        if (pos === "mid") {
            barPos = MID_X;
        }
        let bar = new StatusBar(this.scene, this, barPos, BAR_Y + BAR_OFFSET * this.statusBars.size - BAR_ERROR * this.statusBars.size, BAR_W, BAR_H, character);
        this.statusBars.set(character, bar);
    }

    /**
     * Actualiza la barra de amistad del personaje indicado
     * @param {String} character - id del personaje cuya amistad modificar
     * @param {Number} newValue - nuevo valor de la barra de amistad 
     */
    updateRelationShip(character, newValue) {
        if (character && newValue !== undefined) {
            let bar = this.statusBars.get(character);
            bar.value = newValue;
            bar.updateColor();    
        }
        
        let total = 0;
        this.statusBars.forEach((bar) => {
            total += bar.value;
        });

        this.average.value = total / this.statusBars.size;
        this.average.updateColor();
    } 
}

class ChatScreen extends BaseScreen {
    /**
     * Pantalla base para los chats. Tiene metodos para actualizar
     * el numero de notificaciones del telefono en base a las
     * notificaciones que haya en el chat
     * @extends BaseScreen
     * @param {Phaser.Scene} scene - escena a la que pertenece (UIManager)
     * @param {Phone} phone - telefono
     * @param {BaseScreen} prevScreen - pantalla anterior
     * @param {String} name - nombre del contacto
     * @param {String} icon - icono del contacto
     *                          Nota: el id del personaje corresponde con su icono
     */
    constructor(scene, phone, prevScreen, name, icon) {
        super(scene, phone, 'chatBg', prevScreen);

        // Quita los botones de la parte inferior
        this.remove(this.returnButton);
        this.remove(this.homeButton);
        this.remove(this.uselessButton);
        this.returnButton.destroy();
        this.homeButton.destroy();
        this.uselessButton.destroy();

        // Crea la caja de respuesta y el boton de volver hacia atras y los guarda
        // en las variables this.textBox y this.returnButton respectivamente
        this.createTextBox();
        this.createReturnButton();

        // Configuracion de texto para la el texto del titulo
        let textConfig = { ...scene.gameManager.textConfig };
        textConfig.fontFamily = 'roboto-regular';
        textConfig.color = '#000';
        textConfig.fontStyle = 'bold';

        // Crea el texto del nombre de la persona
        this.nameText = this.scene.add.text(this.BG_X - this.bg.displayWidth * 0.15, this.BG_Y * 0.36, name, textConfig).setOrigin(0, 0.5);

        // Crea el icono
        this.iconImage = this.scene.add.image(this.nameText.x, this.nameText.y, 'avatars', icon);
        this.iconImage.setScale((this.nameText.displayHeight / this.iconImage.displayHeight) * 1.35);
        this.iconImage.x -= this.iconImage.displayWidth;

        // Icono de las notificaciones y cantidad de notificaciones
        this.notifications = null;
        this.notificationAmount = 0;

        // Nodo de texto que se reproducira al pulsar el boton de erespuesta
        this.currNode = null;

        // Partes de la pantalla que tapan el chat
        this.topArea = scene.add.image(this.BG_X, this.BG_Y, 'phoneElements', 'chatBgTop');


        // Lista con los mensajes
        this.messagesListView = new VerticalListView(this.scene, this.BG_X, this.iconImage.displayHeight * 1.5 + (this.BG_Y - this.bg.displayHeight / 2),
            1, 10, { width: this.bg.displayWidth, height: this.bg.displayHeight - this.iconImage.displayHeight * 3 }, null, true, 50, true);

        this.add(this.topArea);
        this.add(this.nameText);
        this.add(this.iconImage);
        this.add(this.messagesListView);


        // Deja los mensajes debajo por si acaso
        this.bringToTop(this.messagesListView);
        this.bringToTop(this.topArea);
        this.bringToTop(this.textBox);
        this.bringToTop(this.returnButton);
        this.bringToTop(this.nameText);
        this.bringToTop(this.iconImage);

        this.canAnswer = false;
    }


    // Crea la caja de respuesta y la guarda en la variable this.textBox
    createTextBox() {
        // Anade la imagen de la caja
        this.textBox = this.scene.add.image(this.BG_X, this.BG_Y * 1.67, 'phoneElements', 'chatTextBox').setScale(0.6);
        this.textBox.setInteractive({ useHandCursor: true });

        // Configuracion de las animaciones
        let tintFadeTime = 50;
        let noTint = Phaser.Display.Color.HexStringToColor('#ffffff');
        let pointerOverColor = Phaser.Display.Color.HexStringToColor('#c9c9c9');

        // Hace fade del color de la caja al pasar o quitar el raton por encima
        this.textBox.on('pointerover', () => {
            if (!this.scene.dialogManager.isTalking()) {
                this.scene.tweens.addCounter({
                    targets: [this.textBox],
                    from: 0,
                    to: 100,
                    onUpdate: (tween) => {
                        const value = tween.getValue();
                        let col = Phaser.Display.Color.Interpolate.ColorWithColor(noTint, pointerOverColor, 100, value);
                        let colInt = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
                        this.textBox.setTint(colInt);
                    },
                    duration: tintFadeTime,
                    repeat: 0,
                });
            }

        });
        this.textBox.on('pointerout', () => {
            if (!this.scene.dialogManager.isTalking()) {
                this.scene.tweens.addCounter({
                    targets: [this.textBox],
                    from: 0,
                    to: 100,
                    onUpdate: (tween) => {
                        const value = tween.getValue();
                        let col = Phaser.Display.Color.Interpolate.ColorWithColor(pointerOverColor, noTint, 100, value);
                        let colInt = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
                        this.textBox.setTint(colInt);
                    },
                    duration: tintFadeTime,
                    repeat: 0,
                });
            }
        });

        // Al hacer click, vuelve a cambiar el color de la caja al original
        this.textBox.on('pointerdown', () => {
            xapiTracker.gameObject("chatBoxScreen", xapiTracker.GAMEOBJECTTYPE.ITEM)
                        .interacted()
                        .send();
            if (!this.scene.dialogManager.isTalking() && this.canAnswer) {
                let fadeColor = this.scene.tweens.addCounter({
                    targets: [this.textBox],
                    from: 0,
                    to: 100,
                    onUpdate: (tween) => {
                        const value = tween.getValue();
                        let col = Phaser.Display.Color.Interpolate.ColorWithColor(noTint, pointerOverColor, 100, value);
                        let colInt = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
                        this.textBox.setTint(colInt);
                    },
                    duration: tintFadeTime,
                    repeat: 0,
                    yoyo: true
                });
                // Si se ha hecho la animacion, al terminar la animacion hace que
                // el dialogManager cree las opciones para responder y las active
                if (fadeColor) {
                    fadeColor.on('complete', () => {
                        if (this.currNode.type === "chatMessage") {
                            this.processNode();
                        }
                        else {
                            this.scene.dialogManager.setNode(this.currNode);
                        }
                    });

                }
            }

        });

        this.add(this.textBox);

    }

    // Crea el boton de volver atras y lo guarda en la variable this.returnButton
    createReturnButton() {
        // Anade la imagen del boton
        this.returnButton = this.scene.add.image(this.BG_X * 0.77, this.BG_Y * 0.36, 'backButton').setScale(0.7);
        this.returnButton.setInteractive();

        let originalScale = this.returnButton.scale;

        // Al pasar el raton por encima del icono, se hace mas grande,
        // al quitar el raton de encima vuelve a su tamano original,
        // y al hacer click, se hace pequeno y grande de nuevo
        this.returnButton.on('pointerover', () => {
            if (!this.scene.dialogManager.isTalking()) {
                this.scene.tweens.add({
                    targets: [this.returnButton],
                    scale: originalScale * 1.2,
                    duration: 0,
                    repeat: 0,
                });

            }
        });
        this.returnButton.on('pointerout', () => {
            if (!this.scene.dialogManager.isTalking()) {
                this.scene.tweens.add({
                    targets: [this.returnButton],
                    scale: originalScale,
                    duration: 0,
                    repeat: 0,
                });
            }

        });
        this.returnButton.on('pointerdown', () => {
            xapiTracker.gameObject("returnButton", xapiTracker.GAMEOBJECTTYPE.ITEM)
                        .interacted()
                        .send();
            if (!this.scene.dialogManager.isTalking()) {
                let anim = this.scene.tweens.add({
                    targets: [this.returnButton],
                    scale: originalScale,
                    duration: 20,
                    repeat: 0,
                    yoyo: true
                });

                // Cuando termina la animacion, vuelve a la pantalla anterior
                anim.on('complete', () => {
                    this.phone.toPrevScreen();
                });
            }

        });

        this.add(this.returnButton);
    }


    // Borra todas las notificaciones de este chat
    // (genera -notificationAmount para quitarlas todas)
    clearNotifications() {
        this.generateNotifications(-this.notificationAmount);
    }

    /**
     * Genera notificaciones para el chat
     * @param {Number} amount - cantidad de notificaciones a generar 
     */
    generateNotifications(amount) {
        // Actualiza la cantidad de notificaciones tanto del chat, como en general
        this.notificationAmount += amount;
        this.phone.phoneManager.addNotifications(amount);

        // Si ya no hay notificaciones, se oculta el icono
        if (this.notificationAmount === 0) {
            this.notifications.container.visible = false;
        }
        // Si hay notificaciones, se muestra el icono y actualiza el texto
        else {
            this.notifications.container.visible = true;
            this.notifications.text.setText(this.notificationAmount);
        }
    }

    /**
     * Cambia el nodo de dialogo
     * @param {DialogNode} node - nodo de dialogo que se va a reproducir
     */
    setNode(node) {
        // Si el nodo a poner es valido, cambia el nodo por el indicado
        if (node !== null) {
            this.currNode = node;

            if (this.currNode.type === "chatMessage") {
                this.processNode();
            }
        }
    }

    // Procesa el nodo de dialogo
    processNode() {
        if (this.currNode) {
            this.textBox.disableInteractive();
            this.canAnswer = false;

            // Si el nodo es de tipo mensaje, con el retardo indicado, anade
            //  el mensaje al chat, pasa al siguiente nodo, y lo procesa.
            if (this.currNode.type === "chatMessage") {
                this.canAnswer = false;
                setTimeout(() => {
                    this.addMessage(this.currNode.text, this.currNode.character, this.currNode.name);
                    this.currNode = this.currNode.next[0];
                    this.processNode();
                }, this.currNode.replyDelay);

            }
            // Si el nodo es de tipo condicion, hace que el dialogManager lo procese y obtiene el siguiente nodo
            else if (this.currNode.type === "condition") {
                let i = this.scene.dialogManager.processCondition(this.currNode);

                // El indice del siguiente nodo sera el primero que cumpla una de las condiciones
                this.currNode = this.currNode.next[i];

                // Pasa al siguiente nodo
                this.processNode();
            }
            // Si el nodo es de tipo evento, hace que el dialogManager lo procese y pasa al siguiente nodo
            else if (this.currNode.type === "event") {
                this.scene.dialogManager.processEvent(this.currNode);

                // IMPORTANTE: DESPUES DE UN NODO DE EVENTO SOLO HAY UN NODO, POR LO QUE 
                // EL SIGUIENTE NODO SERA EL PRIMER NODO DEL ARRAY DE NODOS SIGUIENTES
                this.currNode = this.currNode.next[0];
                this.processNode();
            }
            else {
                this.textBox.setInteractive();
                this.canAnswer = true;
            }
        }
    }

    /**
     * Anade el mensaje a la listView de mensajes
     * @param {String} text - texto del mensaje
     * @param {String} character - id del personaje que envia el mensaje
     * @param {String} name - nombre del personaje que envia el mensaje
     */
    addMessage(text, character, name) {
        // Si la pantalla actual no es la del chat y no es el jugador quien escribe, se genera una notificacion
        if (this.phone.currScreen !== this && character !== "player") {
            this.generateNotifications(1);
        }

        // Crea la caja del mensaje y la anade a la lista
        let msg = new MessageBox(this.scene, text, character, name, 0, this.bg.displayWidth);
        this.messagesListView.addLastItem(msg);
        //this.messagesListView.cropItems();
    }
}

class MessagesScreen extends BaseScreen {
    constructor(scene, phone, prevScreen) {
        super(scene, phone, 'messagesBg', prevScreen);

        // Configuracion de texto para la el texto de ll titulo
        let textConfig = { ...scene.gameManager.textConfig };
        textConfig.fontStyle = 'bold';
        textConfig.color = '#000';

        // Se coge el texto del archivo de traducciones y se pone en pantalla 
        let text = this.i18next.t("textMessages.title", { ns: "phoneInfo" });
        let titleText = this.scene.add.text(this.BG_X, this.BG_Y * 0.365, text, textConfig).setOrigin(0.5, 0.5);

        this.chatNum = 0;
        this.chatTextConfig = { ...textConfig };
        // chatTextConfig.fontFamily = 'gidole-regular';
        this.chatTextConfig.fontSize = 20 + 'px';
        this.chatTextConfig.style = 'normal';

        this.add(titleText);
    }

    /**
     * Crea el boton para acceder al chat
     * @param {String} icon - nombre de la imagen que se va a poner de icono
     * @param {String} name - nombre del chat
     * @param {Object} textConfig - configuracion de texto para el nombre
     * @param {Function} onClick - funcion que se llamara al hacer click en el boton
     * @returns {Object} - objeto con el contenedor y el objeto de texto de las notificaciones
     */
    createChatButton(icon, name, textConfig, onClick) {
        // Anade la imagen del boton. Dependiendo del numero de chats que haya, se iran creando abajo
        let button = this.scene.add.image(this.BG_X, this.BG_Y * 0.5, 'phoneElements', 'chatButton').setScale(0.6);
        button.y += (button.displayHeight + 7) * this.chatNum;
        button.setInteractive({ useHandCursor: true });

        // Anade el texto
        let nameText = this.scene.add.text(button.x - button.displayWidth / 3.5, button.y, name, textConfig).setOrigin(0, 0.5);
        let iconImage = this.scene.add.image(button.x - button.displayWidth / 2, button.y, 'avatars', icon);
        iconImage.setScale((button.displayHeight / iconImage.displayHeight) * 0.8);
        iconImage.x += iconImage.displayWidth  * 0.6;

        // Configuracion de las animaciones
        let tintFadeTime = 50;
        let noTint = Phaser.Display.Color.HexStringToColor('#ffffff');
        let pointerOverColor = Phaser.Display.Color.HexStringToColor('#c9c9c9');

        // Hace fade del color de la caja al pasar o quitar el raton por encima
        button.on('pointerover', () => {
            this.scene.tweens.addCounter({
                targets: [button],
                from: 0,
                to: 100,
                onUpdate: (tween) => {
                    const value = tween.getValue();
                    let col = Phaser.Display.Color.Interpolate.ColorWithColor(noTint, pointerOverColor, 100, value);
                    let colInt = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
                    button.setTint(colInt);
                },
                duration: tintFadeTime,
                repeat: 0,
            });
        });
        button.on('pointerout', () => {
            this.scene.tweens.addCounter({
                targets: [button],
                from: 0,
                to: 100,
                onUpdate: (tween) => {
                    const value = tween.getValue();
                    let col = Phaser.Display.Color.Interpolate.ColorWithColor(pointerOverColor, noTint, 100, value);
                    let colInt = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
                    button.setTint(colInt);
                },
                duration: tintFadeTime,
                repeat: 0,
            });
        });

        // Al hacer click, vuelve a cambiar el color de la caja al original
        button.on('pointerdown', () => {
            xapiTracker.gameObject("messageButton", xapiTracker.GAMEOBJECTTYPE.ITEM)
                        .interacted()
                        .send();
            let fadeColor = this.scene.tweens.addCounter({
                targets: [button],
                from: 0,
                to: 100,
                onUpdate: (tween) => {
                    const value = tween.getValue();
                    let col = Phaser.Display.Color.Interpolate.ColorWithColor(noTint, pointerOverColor, 100, value);
                    let colInt = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
                    button.setTint(colInt);
                    yoyo: true;
                },
                duration: tintFadeTime,
                repeat: 0,
            });
            // Si la funcion onClick es valida y se ha hecho la 
            // animacion, al terminar la animacion llama a la funcion
            if (fadeColor) {
                fadeColor.on('complete', () => {
                    if (onClick !== null && typeof onClick === 'function') {
                        onClick();
                    }
                });

            }
        });

        // Aumenta el numero de chats que hay
        this.chatNum++;

        this.add(button);
        this.add(nameText);
        this.add(iconImage);

        // Crea el icono de las notificaciones
        let notifObj = this.phone.phoneManager.createNotification(this.BG_X + this.bg.displayWidth * 0.4, button.y, true);
        this.add(notifObj.container);
        notifObj.container.visible = false;

        return notifObj;
    }


    /**
     * Anade la pantalla del chat al telefono y anade el boton 
     * para entrar a ese chat en esta pantalla 
     * @param {String} name - nombre del contacto
     * @param {String} icon - id de la imagen con la foto de perfil del contacto
     */
    addChat(name, icon) {
        // Crea la pantalla
        let screen = new ChatScreen(this.scene, this.phone, this, name, icon);

        // Anade la pantalla al contenedor del telefono y la hace invisible
        this.phone.add(screen);
        screen.visible = false;
        this.phone.bringToTop(this.phone.phone);

        // Crea el boton del chat y su icono de notificaciones en esta pantalla 
        let notifObj = this.createChatButton(icon, name, this.chatTextConfig, () => {
            // Al pulsar el boton, se cambiara a la pantalla creada
            this.phone.toChatScreen(name);
        });

        // Establece el objeto notifications de la pantalla creada
        screen.notifications = notifObj;

        // Anade la pantalla al mapa de chats del telefono con la key del nombre del chat
        this.phone.chats.set(name, screen);
    }

}

class SettingsScreen extends BaseScreen {
    constructor(scene, phone, prevScreen) {
        super(scene, phone, 'settingsBg', prevScreen);

        // Configuracion de texto para la advertencia
        let textConfig = { ...scene.gameManager.textConfig };
        textConfig.fontFamily = 'gidole-regular';
        textConfig.fontSize = 40 + 'px';
        textConfig.fontStyle = 'bold';
        textConfig.strokeThickness = 5,
            textConfig.align = 'center';
        textConfig.wordWrap = {
            width: this.bg.displayWidth,
            useAdvancedWrap: true
        };

        // Se coge el texto del archivo de traducciones y se pone en pantalla 
        let text = this.i18next.t("settings.text", { ns: "phoneInfo", context: this.gameManager.getUserInfo().gender });
        let warningText = this.scene.add.text(this.BG_X, this.BG_Y * 0.65, text, textConfig).setOrigin(0.5, 0.5);

        // Configuracion de texto y colores del boton
        let buttonTextConfig = { font: 'gidole-regular', size: 45, style: 'bold', color: '#000' };
        let normalColor = { R: 255, G: 255, B: 255 };
        let hoverColor = { R: 64, G: 142, B: 134 };
        let pressedColor = { R: 200, G: 200, B: 200 };

        // Se coge el texto de los botones del archivo de traducciones y crea los botones
        let yesText = this.i18next.t("settings.yes", { ns: "phoneInfo" });
        let yesButton = new Button(scene, this.BG_X, this.BG_Y * 1.1, 1,
            () => {
                xapiTracker.alternative("setting_reset_game",xapiTracker.ALTERNATIVETYPE.MENU)
                            .selected("yes")
                            .send();
                this.gameManager.completedGame(false);
                yesButton.reset();
                this.gameManager.startLangMenu();
            },
            this.gameManager.textBox.fillName, normalColor, hoverColor, pressedColor,
            yesText, buttonTextConfig, this.gameManager.textBox.edgeName,
            {
                // La textura generada con el objeto grafico es un pelin mas grande que el dibujo en si. Por lo tanto,
                // si la caja de colision por defecto es un pelin mas grande. Es por eso que se pasa una que se ajuste
                // a las medidas reales
                area: new Phaser.Geom.Rectangle(this.gameManager.textBox.offset, this.gameManager.textBox.offset, this.gameManager.textBox.width, this.gameManager.textBox.height),
                callback: Phaser.Geom.Rectangle.Contains
            }
        );
        let noText = this.i18next.t("settings.no", { ns: "phoneInfo" });
        let noButton = new Button(scene, this.BG_X, this.BG_Y * 1.4, 1,
            () => {
                xapiTracker.alternative("setting_reset_game", xapiTracker.ALTERNATIVETYPE.MENU)
                            .selected("no")
                            .send();
                noButton.reset();
                phone.toPrevScreen();
            },
            this.gameManager.textBox.fillName, normalColor, hoverColor, pressedColor,
            noText, buttonTextConfig, this.gameManager.textBox.edgeName,
            {
                // La textura generada con el objeto grafico es un pelin mas grande que el dibujo en si. Por lo tanto,
                // si la caja de colision por defecto es un pelin mas grande. Es por eso que se pasa una que se ajuste
                // a las medidas reales
                area: new Phaser.Geom.Rectangle(this.gameManager.textBox.offset, this.gameManager.textBox.offset, this.gameManager.textBox.width, this.gameManager.textBox.height),
                callback: Phaser.Geom.Rectangle.Contains
            }
        );

        yesButton.setScale(0.9, 1);
        noButton.setScale(0.9, 1);

        this.add(yesButton);
        this.add(noButton);
        this.add(warningText);
    }
}

class Phone extends Phaser.GameObjects.Container {
    constructor(scene, phoneManager) {
        super(scene, 0, 0);
        this.scene = scene;
        this.phoneManager = phoneManager;

        // Configuracion de las posiciones y dimensiones
        this.PHONE_X = 400 + 10;
        this.PHONE_Y = 800;

        // Se crean las imagenes y diferentes pantallas
        this.phone = scene.add.image(this.PHONE_X, this.PHONE_Y, 'phone');
        this.alarmScreen = new AlarmScreen(scene, this, null);
        this.mainScreen = new MainScreen(scene, this, null);
        this.statusScreen = new StatusScreen(scene, this, this.mainScreen);
        this.messagesScreen = new MessagesScreen(scene, this, this.mainScreen);
        this.settingsScreen = new SettingsScreen(scene, this, this.mainScreen);

        // Se anaden las pantallas a un array para poder iterar sobre ellas mas rapidamente
        let screens = [
            this.alarmScreen,
            this.mainScreen,
            this.statusScreen,
            this.messagesScreen,
            this.settingsScreen
        ];

        // Se crea el mapa que guardara las pantallas de chat
        this.chats = new Map();

        // Se anade la imagen del telefono y las pantallas a la escena
        this.add(this.phone);
        screens.forEach((screen) => {
            this.add(screen);
            screen.visible = false;
        });
        // Se pone la imagen del telefono por encima de todo
        this.bringToTop(this.phone);

        this.currScreen = null;


        // Forma personalizada de la silueta de la mano para 
        // evitar que se guarde el telefono si se hace click 
        // fuera del telefono pero dentro de la imagen de la mano
        let graphics = scene.add.graphics(0, 0);
        let polygon = new Phaser.Geom.Polygon([
            358, 282,
            245, 403,
            228, 705,
            -200, 1050,
            579, 1050,
            847, 558,
            800, 262
        ]);
        // graphics.lineStyle(5, 0xFF00FF, 1.0).fillStyle(0xFFFFFF, 1.0).fillPoints(polygon.points, true);
        graphics.generateTexture('hand', graphics.displayWidth, graphics.displayHeight);
        let hand = scene.add.image(0, 0, 'hand').setOrigin(0, 0);
        this.add(hand);
        this.sendToBack(hand);
        hand.setInteractive(polygon, Phaser.Geom.Polygon.Contains);
        // graphics.destroy();


        scene.add.existing(this);
    }

    /**
     * Metodo para obtener las dimensiones de la imagen del telefono
     * @returns - objeto con la posicion, origen y escala de la imagen del telefono
     */
    getPhoneTransform() {
        return {
            x: this.phone.x,
            y: this.phone.y,
            originX: this.phone.originX,
            originY: this.phone.originY,
            scaleX: this.phone.scaleX,
            scaleY: this.phone.scaleY
        }
    }

    /**
     * Cambia a la pantalla indicada
     * @param {BaseScreen} nextScreen - pantalla a la que se va a cambiar
     */
    changeScreen(nextScreen) {
        // Si la pantalla actual no es la misma que la siguiente
        if (this.currScreen !== nextScreen) {
            // Si hay una pantalla actual, la oculta
            if (this.currScreen) {
                this.currScreen.visible = false;
            }

            // Hace que la pantalla actual sea a la que se va a cambiar
            this.currScreen = nextScreen;

            // Muestra la pantalla actual
            this.currScreen.visible = true;
        }

    }


    // Pasa a la pantalla anterior
    toPrevScreen() {
        xapiTracker.gameObject("toPrevScreen", xapiTracker.GAMEOBJECTTYPE.GAMEOBJECT)
                    .interacted()
                    .send();
        // Si la pantalla actual es la pantalla principal, se guarda el movil
        if (this.currScreen === this.mainScreen) {
            this.phoneManager.togglePhone();
        }
        // Si no, si la pantalla actual tiene pantalla anterior, se cambia a esa pantalla
        else if (this.currScreen.prevScreen) {
            this.changeScreen(this.currScreen.prevScreen);
        }
    }

    // Cambia a la pantalla de la alarma
    toAlarmScreen() {
        this.changeScreen(this.alarmScreen);
    }

    // Cambia a la pantalla principal
    toMainScreen() {
        xapiTracker.gameObject("toMainScreen", xapiTracker.GAMEOBJECTTYPE.GAMEOBJECT)
                    .interacted()
                    .send();
        this.changeScreen(this.mainScreen);
    }

    // Cambia a la pantalla de estado
    toStatusScreen() {
        xapiTracker.gameObject("openFriendsApp", xapiTracker.GAMEOBJECTTYPE.GAMEOBJECT)
                    .interacted()
                    .send();
        this.changeScreen(this.statusScreen);
    }

    // Cambia a la pantalla de mensajes
    toMsgScreen() {
        xapiTracker.gameObject("openMobileChat", xapiTracker.GAMEOBJECTTYPE.GAMEOBJECT)
                    .interacted()
                    .send();
        this.changeScreen(this.messagesScreen);
    }

    /**
     * Cambia a la pantalla del chat indicado
     * @param {String} chat - id del chat
     */
    toChatScreen(chat) {
        xapiTracker.gameObject(`chat_${chat}`, xapiTracker.GAMEOBJECTTYPE.GAMEOBJECT)
                    .interacted()
                    .send();
        if (this.chats.has(chat)) {
            this.changeScreen(this.chats.get(chat));
            this.chats.get(chat).clearNotifications();
        }
    }

    // Cambia a la pantalla de ajustes
    toSettingsScreen() {
        xapiTracker.gameObject("openMobileSettings", xapiTracker.GAMEOBJECTTYPE.GAMEOBJECT)
                    .interacted()
                    .send();
        this.changeScreen(this.settingsScreen);
    }

    /**
     * Muestra en la pantalla de mensajes el chat indicado
     * @param {String} name - nombre del contacto
     * @param {String} icon - id de la imagen con la foto de perfil del contacto
     *                          Nota: la id del personaje corresponde con su icono
     */
    addChat(name, icon) {
        this.messagesScreen.addChat(name, icon);
    }


    /**
     * Cambia la hora y el dia de las pantallas de alarma y principal
     * @param {String} hour - hora
     * @param {String} dayText - informacion del dia
     */
    setDayInfo(hour, dayText) {
        this.alarmScreen.setDayInfo(hour, dayText);
        this.mainScreen.setDayInfo(hour, dayText);
    }

    /**
     * Cambia la cantidad de notificaciones de la pantalla principal
     * @param {Number} amount - cantidad de notificaciones
     */
    setNotifications(amount) {
        this.mainScreen.setNotifications(amount);
    }

    /**
     * Cambia el nodo de dialogo en el chat indicado
     * 
     * IMPORTANTE: Antes de poder llamar a este metodo, se tiene que haber
     * llamado al metodo addChat para que chatScreen tenga el metodo setNode
     * 
     * @param {String} chat - id del chat en el que anadir el mensaje 
     * @param {DialogNode} node - nodo de dialogo que se va a reproducir
     */
    setChatNode(chat, node) {
        if (this.chats.has(chat)) {
            this.chats.get(chat).setNode(node);
        }
    }

    /**
     * Procesa el nodo del chat indicado
     * @param {String} chat - id del chat en el que anadir el mensaje 
     */
    processChatNode(chat) {
        if (this.chats.has(chat)) {
            this.chats.get(chat).processNode();
        }
    }

    /**
     * Actualiza la barra de amistad del personaje indicado en la pantalla de relaciones
     * @param {String} character - id del personaje cuya amistad modificar
     * @param {Number} newValue - nuevo valor de la barra de amistad 
     */
    updateRelationShip(character, newValue) {
        this.statusScreen.updateRelationShip(character, newValue);
    }
}

class PhoneManager {
    /**
    * Gestor del telefono. Se encarga de mostrar/ocultar el telefono y contiene el telefono en si.
    * Tambien gestiona las notificaciones y las animaciones de despertarse y quedarse dormido
    */
    constructor(scene) {
        this.scene = scene;
        this.gameManager = GameManager.getInstance();
        this.i18next = this.gameManager.i18next;
        this.dispatcher = this.gameManager.dispatcher;

        // Configuracion de las posiciones y animaciones
        this.OFFSET = 80;
        this.ICON_SCALE = 0.3;
        this.TOGGLE_SPEED = 500;
        this.SLEEP_DELAY = 500;


        // Crea el icono del telefono y lo guarda en la variable this.icon
        this.createIcon();

        // Anade el icono de las notificaciones
        let notifObj = this.createNotification(this.icon.x + this.icon.displayWidth / 2, this.icon.y - this.icon.displayHeight / 2);
        this.notifications = notifObj.container;
        this.notificationText = notifObj.text;

        // Anade el telefono 
        this.phone = new Phone(scene, this);

        // Anade un rectangulo para bloquear la interaccion con los elementos del fondo
        this.bgBlock = scene.add.rectangle(0, 0, this.scene.CANVAS_WIDTH, this.scene.CANVAS_HEIGHT, 0xfff, 0).setOrigin(0, 0);
        this.bgBlock.setInteractive({ useHandCursor: true });
        this.bgBlock.setDepth(this.icon.depth - 1);


        // Configuracion de las posiciones del las animaciones
        this.PHONE_SCALE = 1;
        this.PHONE_HIDDEN = { x: - this.phone.phone.displayWidth, y: this.scene.CANVAS_HEIGHT };
        this.PHONE_VISIBLE = { x: 0, y: 0 };

        this.PHONE_ALARM_SCALE = 0.8;
        this.PHONE_ALARM_HIDDEN = { x: - this.phone.phone.displayWidth, y: this.scene.CANVAS_HEIGHT };
        this.PHONE_ALARM_VISIBLE = { x: this.phone.phone.displayWidth * 0.13, y: this.scene.CANVAS_HEIGHT * 0.2 };

        // Si se pulsa fuera del telefono cuando esta sacado y en otra 
        // pantalla que no sea la pantalla de alarma, se guarda
        this.bgBlock.on('pointerdown', () => {
            if (this.phone.visible && this.phone.currScreen !== this.phone.alarmScreen) {
                this.togglePhone();
            }
        });


        // Pone las notificaciones a 0
        this.activeTween = null;
        this.notificationAmount = 0;
        this.setNotifications();


        // Crea los parpados para la animacion de abrir y cerrar los ojos
        this.topLid = scene.add.rectangle(0, 0, this.scene.CANVAS_WIDTH, this.scene.CANVAS_HEIGHT / 2, 0x000, 1).setOrigin(0, 0);
        this.topLid.setDepth(100).setScrollFactor(0);
        this.botLid = scene.add.rectangle(0, this.scene.CANVAS_HEIGHT / 2, this.scene.CANVAS_WIDTH, this.scene.CANVAS_HEIGHT / 2, 0x000, 1).setOrigin(0, 0);
        this.botLid.setDepth(100).setScrollFactor(0);

        // Crea el mensaje de despertarse y lo guarda en la variable this.wakeUpMessage
        this.createMessage();
        this.wakeUpMessage.setScrollFactor(0);
        this.wakeUpMessage.visible = false;


        // Nombres de los eventos
        this.resetCamEvent = "resetCam";
        this.wakeUpEvent = "wakeUp";

        this.showPhone(false);
    }


    // Crea el icono
    createIcon() {
        // Anade el icono del telefono
        this.icon = this.scene.add.image(this.scene.CANVAS_WIDTH - this.OFFSET, this.scene.CANVAS_HEIGHT - this.OFFSET, 'phoneElements', 'phoneIcon').setScale(this.ICON_SCALE);
        this.icon.setInteractive({ useHandCursor: true });

        // Al pasar el raton por encima del icono, se hace mas grande,
        // al quitar el raton de encima vuelve a su tamano original,
        // y al hacer click, se hace pequeno y grande de nuevo
        this.icon.on('pointerover', () => {
            if (!this.scene.dialogManager.isTalking()) {
                this.scene.tweens.add({
                    targets: [this.icon],
                    scale: this.ICON_SCALE * 1.1,
                    duration: 0,
                    repeat: 0,
                });
            }
        });
        this.icon.on('pointerout', () => {
            this.scene.tweens.add({
                targets: [this.icon],
                scale: this.ICON_SCALE,
                duration: 0,
                repeat: 0,
            });
        });
        this.icon.on('pointerdown', () => {
            if (!this.scene.dialogManager.isTalking()) {
                this.togglePhone();
                this.scene.tweens.add({
                    targets: [this.icon],
                    scale: this.ICON_SCALE,
                    duration: 20,
                    repeat: 0,
                    yoyo: true
                });
            }
        });

    }

    /**
     * Reproduce la animacion de ocultar/mostrar el movil
     * @param {Number} speed - velolcidad a la que se reproduce la animacion (en ms) 
     */
    togglePhone(speed) {
        if (!speed && speed !== 0) {
            speed = this.TOGGLE_SPEED;
        }

        // Si no hay una animacion reproduciendose
        if (!this.toggling) {
            // Se indica que va a empezar una
            this.toggling = true;

            // Si el telefono es visible
            if (this.phone.visible) {
                this.gameManager.interacted("hideMobile", xapiTracker.GAMEOBJECTTYPE.ITEM)
                                .send();
                this.phone.setScale(this.PHONE_SCALE);
                let x = { from: this.PHONE_VISIBLE.x, to: this.PHONE_HIDDEN.x };
                let y = { from: this.PHONE_VISIBLE.y, to: this.PHONE_HIDDEN.y };

                // Si el telefono esta en la pantalla de alarma, se hace mas pequeno
                // y se ajusta el movimiento para que el movil quede en el centro
                if (this.phone.currScreen === this.phone.alarmScreen) {
                    this.phone.setScale(this.PHONE_ALARM_SCALE);
                    x = { from: this.PHONE_ALARM_VISIBLE.x, to: this.PHONE_ALARM_HIDDEN.x };
                    y = { from: this.PHONE_ALARM_VISIBLE.y, to: this.PHONE_ALARM_HIDDEN.y };
                }
                // Se mueve hacia abajo a la izquierda
                let deactivate = this.scene.tweens.add({
                    targets: [this.phone],
                    x: x,
                    y: y,
                    duration: speed,
                    repeat: 0,
                });
                this.activeTween = deactivate;

                // Una vez terminada la animacion, se oculta el telefono, se indica que ya ha terminado, se 
                // reactiva la interaccion con los elementos del fondo y vuelve a la pantalla de inicio
                deactivate.on('complete', () => {
                    this.phone.visible = false;
                    this.toggling = false;
                    this.bgBlock.disableInteractive();
                    this.phone.toMainScreen();
                });
            }
            // Si el telefono no es visible
            else {
                this.gameManager.interacted("toggleMobile", xapiTracker.GAMEOBJECTTYPE.ITEM)
                                .send();
                // Se hace visible y se bloquea la interaccion con los elementos del fondo
                this.phone.visible = true;
                this.bgBlock.setInteractive({ useHandCursor: true });

                this.phone.setScale(this.PHONE_SCALE);
                let x = { from: this.PHONE_HIDDEN.x, to: this.PHONE_VISIBLE.x };
                let y = { from: this.PHONE_HIDDEN.y, to: this.PHONE_VISIBLE.y };

                // Si el telefono esta en la pantalla de alarma, se hace mas pequeno
                // y se ajusta el movimiento para que el movil quede en el centro
                if (this.phone.currScreen === this.phone.alarmScreen) {
                    this.phone.setScale(this.PHONE_ALARM_SCALE);
                    x = { from: this.PHONE_ALARM_HIDDEN.x, to: this.PHONE_ALARM_VISIBLE.x };
                    y = { from: this.PHONE_ALARM_HIDDEN.y, to: this.PHONE_ALARM_VISIBLE.y };
                }

                // Se mueve hacia el centro de la pantalla
                let activate = this.scene.tweens.add({
                    targets: [this.phone],
                    x: x,
                    y: y,
                    duration: speed,
                    repeat: 0,
                });
                this.activeTween = activate;

                // Una vez terminada la animacion, se indica que ya ha terminado
                activate.on('complete', () => {
                    this.toggling = false;
                });
            }
        }
    }


    // Crea el mensaje de despertarse
    createMessage() {
        let textConfig = { ...this.scene.gameManager.textConfig };
        textConfig.fontFamily = 'gidole-regular';
        textConfig.fontSize = 40 + 'px';
        textConfig.align = 'center';

        let text = this.i18next.t("alarm.message", { ns: "phoneInfo" });
        let wakeUpText = this.scene.add.text(this.scene.CANVAS_WIDTH / 2, 0, text, textConfig).setOrigin(0.5, 0.5);
        wakeUpText.y += wakeUpText.displayHeight;

        let bgCol = 0xFFB61E1E;
        let borderCol = 0x000000;
        let borderThickness = 2;

        let w = wakeUpText.displayWidth * 1.15;
        let h = wakeUpText.displayHeight * 1.5;
        let min = Math.min(w, h);
        let radius = min * 0.1;

        let bgGraphics = this.scene.make.graphics().fillStyle(bgCol, 1).fillRoundedRect(0, 0, w, h, radius).lineStyle(borderThickness, borderCol, 1).strokeRoundedRect(0, 0, w, h, radius);
        bgGraphics.generateTexture('alarmMsgBg', w, h);
        let bg = this.scene.add.image(wakeUpText.x, wakeUpText.y, 'alarmMsgBg').setOrigin(0.5, 0.5);

        this.wakeUpMessage = this.scene.add.container(0, 0);
        this.wakeUpMessage.add(wakeUpText);
        this.wakeUpMessage.add(bg);
        this.wakeUpMessage.bringToTop(wakeUpText);
    }

    /**
     * Crea el icono de las notificaciones
     * @param {Number} x - posicion x del icono 
     * @param {Number} y - posicion y del icono
     * @param {Boolean} circle - true si la forma del icono es circular, false si es rectangular
     * @returns {Object} - objeto con el contenedor y el objeto de texto
     */
    createNotification(x, y, circle = false) {
        let notificationColor = 0xf55d5d;
        let borderColor = 0x000;

        let fillImg = null;
        let edgeImg = null;

        // Se crea el icono con forma de cuadrado
        if (!circle) {
            fillImg = this.scene.add.image(0, 0, this.gameManager.roundedSquare.fillName);
            edgeImg = this.scene.add.image(0, 0, this.gameManager.roundedSquare.edgeName);
            fillImg.setTint(notificationColor);
        }
        // Se crea el icono con forma de circulo
        else {
            let radius = 50;
            let borderThickness = 4;
            fillImg = this.scene.add.circle(0, 0, radius, notificationColor);
            edgeImg = this.scene.add.circle(0, 0, radius + borderThickness, borderColor);
        }

        // Configuracion de texto para las notificaciones
        let notifTextConfig = { ...this.scene.gameManager.textConfig };
        notifTextConfig.fontSize = 60 + 'px';
        notifTextConfig.fontStyle = 'bold';

        // Crea el texto con el numero de notificaciones
        let textObj = this.scene.add.text(0, 0, "", notifTextConfig).setOrigin(0.5, 0.5);

        // Crea el contenedor para todos los elementos y los andae 
        let notifications = this.scene.add.container(0, 0);
        notifications.add(fillImg);
        notifications.add(edgeImg);
        notifications.add(textObj);

        // Reordena los elementos
        if (!circle) {
            notifications.bringToTop(fillImg);
            notifications.bringToTop(edgeImg);
        }
        else {
            notifications.bringToTop(edgeImg);
            notifications.bringToTop(fillImg);
        }
        notifications.bringToTop(textObj);

        // Redimensiona el contenedor
        notifications.setScale(0.3);
        notifications.x = x;
        notifications.y = y;

        return {
            container: notifications,
            text: textObj
        };


    }


    /**
     * Muestra/oculta toda la interfaz del telefono (incluyendo el icono y las notificaciones) 
     * @param {Boolean} active - true si se va a mostrar, false en caso contrario
     */
    activate(active) {
        // Se guarda el telefono al instante
        this.showPhone(false);
        
        // Si se quiere activar    
        if (active) {
            // Si no es el dia 4, o si se han intercambiado las contrasenas, o si no se han intercambiado
            // pero se ha recuperado el movil, vuelven a aparecer el icono del telefono y las notificaciones
            if (this.gameManager.day !== 4 || this.gameManager.getValue("passwordExchanged")
                || (!this.gameManager.getValue("passwordExchanged") && this.gameManager.getValue("phoneFound"))) 
            {
                this.icon.visible = true;
                // Las notificaciones solo aparecen si hay mas de 0 notificaciones
                this.notifications.visible = this.notificationAmount > 0;
            }
        }
        // Si no, se desactivan el icono y las notificaciones
        else {
            this.icon.visible = false;
            this.notifications.visible = false;
        }
    }
    
    /**
     * Muestra/oculta el telefono de manera inmediata
     * @param {Boolean} active - true si se va a activar, false en caso contrario
     */
    showPhone(show) {
        if ((this.phone.visible && !show) || (!this.phone.visible && show)) {
            this.toggling = false;
            this.togglePhone(0);
        }
    }

    /**
     * Cambia la hora y el dia del telefono en base a la id de la hora
     * @param {String} hourId - id de la hora en el archivo de traducciones 
     */
    setDayInfo(hourId) {
        // Set date time in game manager for xapiTracker
        this.gameManager.hourId = `clock.${hourId}`;
        // Coge el texto de la hora y de los dias en el archivo de traducciones
        this.gameManager.hour = this.i18next.t(this.gameManager.hourId, { ns: "phoneInfo" });
        // Coge el dia del array en base al dia del gameManager
        let days = this.i18next.t("clock.days", { ns: "phoneInfo", returnObjects: true });
        this.gameManager.dayText = days[this.gameManager.day - 1];
        // Cambia la hora del telefono
        this.phone.setDayInfo(this.gameManager.hour, this.gameManager.dayText);
    }

    /**
     * Anade notificaciones a las que ya habia
     * @param {Number} amount - cantidad de notificaciones que anadir a la cantidad actual 
     */
    addNotifications(amount) {
        this.notificationAmount += amount;
        this.setNotifications();
    }

    // Establece las notificaciones que hay
    setNotifications() {
        // Set notificationAmount in game manager for xapiTracker
        this.gameManager.notificationAmount = this.notificationAmount;
        // Si son mas de 0, activa las notificaciones si el icono esta activo y cambia el texto
        if (this.notificationAmount > 0) {
            this.notifications.visible = this.icon.visible;
            this.notificationText.setText(this.notificationAmount);
        }
        // Si no, las desactiva
        else {
            this.notifications.visible = false;
            this.notificationText.setText("");
        }
        this.phone.setNotifications(this.notificationAmount);
    }


    // Funcion llamada al aplazar la alarma
    sleep() {
        // Si no se ha dormido antes o no es el ultimo dia
        if (!this.gameManager.getValue("isLate") && this.gameManager.day !== 5) {
            // Se actualiza la variable de haberse quedado dormido
            this.gameManager.setValue("isLate", true);

            // Guarda el telefono
            this.togglePhone(1500);

            // Al terminar la animacion de guardar el telefono
            if (this.activeTween) {
                this.activeTween.on('complete', () => {
                    // Se vuelve a poner la alarma
                    this.phone.toAlarmScreen();

                    // Vuelve a reproducir la animacion de cerrar los ojos  
                    setTimeout(() => {
                        this.closeEyesAnimation();
                    }, this.SLEEP_DELAY);

                });
            }
        }
        // Si ya se ha dormido antes, muestra el mensaje de que ya no puede domir mas
        else {
            this.wakeUpMessage.visible = true;
        }
        this.gameManager.interacted("Sleep_phone", xapiTracker.GAMEOBJECTTYPE.ITEM)
            .withResultExtension("isLate",this.gameManager.getValue("isLate"))
            .send();
    }

    // Funcion llamada al apagar la alarma y despertarse
    wakeUp() {
        
        // Se guarda el telefono
        this.togglePhone(1500);

        // Cuando termina la animacion, se oculta el mensaje de haberse dormido (si estaba activo),
        // y se muestran de nuevo los iconos del telefono y las notificaciones (si hay notificaciones)
        if (this.activeTween) {
            this.activeTween.on('complete', () => {
                this.wakeUpMessage.visible = false;
                this.icon.visible = true;

                this.notifications.visible = this.notificationAmount > 0;

                // Envia el evento de reiniciar la camara y el de despertarse
                this.dispatcher.dispatch(this.resetCamEvent, {});
                this.dispatcher.dispatch(this.wakeUpEvent, {});

            });
        }
        this.gameManager.interacted("wake_up_phone", xapiTracker.GAMEOBJECTTYPE.ITEM)
            .withResultExtension("isLate",this.gameManager.getValue("isLate"))
            .send();
    }


    // Animacion de abrir los ojos. Mueve los parpados varias
    // veces y cuando termina, saca el movil con la alarma
    openEyesAnimation() {
        // Envia el evento de reiniciar la camara
        this.dispatcher.dispatch(this.resetCamEvent, {});

        // Oculta el icono del movil, las notificaciones, y el propio movil
        this.icon.visible = false;
        this.notifications.visible = false;
        this.showPhone(false);

        // Cuando termina la animacion de desactivarse, va a la pantalla de la alarma y
        // activa el bloqueo del fondo (hay que hacerlo cuando termine la animacion aunque
        // sea instantanea porque si no, se ejecuta el onComplete del tween despues de
        // ir a la larma y activar el bloqueo del fondo)
        this.activeTween.on('complete', () => {
            this.phone.toAlarmScreen();
            this.bgBlock.disableInteractive();
        });


        let speed = 1000;
        let lastTopPos = this.topLid.y;
        let lastBotPos = this.botLid.y;
        let movement = this.topLid.displayHeight / 4;

        // Abre los ojos
        let anim = this.scene.tweens.add({
            targets: [this.topLid],
            y: { from: lastTopPos, to: lastTopPos - movement },
            duration: speed,
            repeat: 0,
        });
        this.scene.tweens.add({
            targets: [this.botLid],
            y: { from: lastBotPos, to: lastBotPos + movement },
            duration: speed,
            repeat: 0,
        });

        // Cierra un poco los ojos
        anim.on('complete', () => {
            speed = 500;
            lastTopPos = this.topLid.y;
            lastBotPos = this.botLid.y;
            movement = this.topLid.displayHeight / 10;

            anim = this.scene.tweens.add({
                targets: [this.topLid],
                y: { from: lastTopPos, to: lastTopPos + movement },
                duration: speed,
                repeat: 0,
            });
            this.scene.tweens.add({
                targets: [this.botLid],
                y: { from: lastBotPos, to: lastBotPos - movement },
                duration: speed,
                repeat: 0,
            });

            // Vuelve a abrir los ojos
            anim.on('complete', () => {
                speed = 500;
                lastTopPos = this.topLid.y;
                lastBotPos = this.botLid.y;
                movement = this.topLid.displayHeight / 9;

                anim = this.scene.tweens.add({
                    targets: [this.topLid],
                    y: { from: lastTopPos, to: lastTopPos - movement },
                    duration: speed,
                    repeat: 0,
                });
                this.scene.tweens.add({
                    targets: [this.botLid],
                    y: { from: lastBotPos, to: lastBotPos + movement },
                    duration: speed,
                    repeat: 0,
                });

                // Cierra los ojos un poco mas
                anim.on('complete', () => {
                    speed = 500;
                    lastTopPos = this.topLid.y;
                    lastBotPos = this.botLid.y;
                    movement = this.topLid.displayHeight / 5;

                    anim = this.scene.tweens.add({
                        targets: [this.topLid],
                        y: { from: lastTopPos, to: lastTopPos + movement },
                        duration: speed,
                        repeat: 0,
                    });
                    this.scene.tweens.add({
                        targets: [this.botLid],
                        y: { from: lastBotPos, to: lastBotPos - movement },
                        duration: speed,
                        repeat: 0,
                    });

                    // Abre los ojos completamente
                    anim.on('complete', () => {
                        speed = 1500;
                        lastTopPos = this.topLid.y;
                        lastBotPos = this.botLid.y;

                        anim = this.scene.tweens.add({
                            targets: [this.topLid],
                            y: { from: lastTopPos, to: -this.scene.CANVAS_HEIGHT / 2 },
                            duration: speed,
                            repeat: 0,
                        });
                        this.scene.tweens.add({
                            targets: [this.botLid],
                            y: { from: lastBotPos, to: this.scene.CANVAS_HEIGHT },
                            duration: speed,
                            repeat: 0,
                        });

                        // Activa el telefono
                        anim.on('complete', () => {
                            this.togglePhone(1500);
                        });

                    });
                });
            });
        });
    }

    // Animacion de cerrar los ojos. Cierra los parpados y 
    // vuelve a reproducir la animacion de abrir los ojos
    closeEyesAnimation(openAgain = true) {
        let speed = 2000;
        let lastTopPos = this.topLid.y;
        let lastBotPos = this.botLid.y;
        this.bgBlock.setInteractive();
        
        let anim = this.scene.tweens.add({
            targets: [this.topLid],
            y: { from: lastTopPos, to: 0 },
            duration: speed,
            repeat: 0,
        });
        this.scene.tweens.add({
            targets: [this.botLid],
            y: { from: lastBotPos, to: this.scene.CANVAS_HEIGHT / 2 },
            duration: speed,
            repeat: 0,
        });

        if (openAgain) {
            // Cuando termina, cambia la hora del telefono y vuelve a reproducir la animacion de abrir los ojos
            anim.on('complete', () => {
                this.setDayInfo("alarmLateHour");

                setTimeout(() => {
                    this.openEyesAnimation();
                }, this.SLEEP_DELAY * 2);
                this.bgBlock.disableInteractive();
            });
        }
        else {
            return anim;
        }
    }


}

class UIManager extends Phaser.Scene {
    /**
    * Gestor de la interfaz. Contiene el PhoneManager y el DialogManager.
    * Tambien se encarga de la creacion de textos
    * @extends Phaser.Scene
    */
    constructor(scene) {
        super({ key: 'UIManager' });
    }

    create() {
        this.CANVAS_WIDTH = this.sys.game.canvas.width;
        this.CANVAS_HEIGHT = this.sys.game.canvas.height;

        this.gameManager = GameManager.getInstance();
        this.phoneManager = new PhoneManager(this);
        this.dialogManager = new DialogManager(this);
    }
}

const max_w = 1129, max_h = 847, min_w = 320, min_h = 240;

const config = {
    width: max_w,
    height: max_h,
    backgroundColor: '#000000',
    version: "1.0",

    type: Phaser.AUTO,
    // Nota: el orden de las escenas es relevante, y las que se encuentren antes en el array se renderizaran por debajo de las siguientes
    scene: [
        // Carga de assets
        BootScene,
        // Menus
        LanguageMenu, TitleMenu, LoginMenu, CreditsScene,
        // Escenas bases
        AlarmScene, RestroomBase, BusScene, OppositeRestroom, TextOnlyScene,
        // Escenas dia 1
        BedroomMorningDay1, LivingroomMorningDay1, PlaygroundMorningDay1, StairsMorningDay1, CorridorMorningDay1, ClassFrontMorningDay1, ClassBackMorningDay1, ClassBackBreakDay1, CorridorBreakDay1, StairsBreakDay1, PlaygroundBreakDay1, PlaygroundAfternoonDay1, LivingroomAfternoonDay1, BedroomAfternoonDay1, NightmareDay1,
        // Escenas dia 2
        BedroomMorningDay2, LivingroomMorningDay2, PlaygroundMorningDay2, StairsMorningDay2, CorridorMorningDay2, ClassFrontMorningDay2, ClassBackBreakDay2, CorridorBreakDay2, RestroomBreakDay2, StairsBreakDay2, PlaygroundBreakDay2, PlaygroundAfternoonDay2, LivingroomAfternoonDay2, BedroomAfternoonDay2, NightmareDay2,
        // Escenas dia 3
        BedroomMorningDay3, LivingroomMorningDay3, PlaygroundMorningDay3, StairsMorningDay3, CorridorMorningDay3, ClassFrontMorningDay3, ClassBackAfternoonDay3, CorridorAfternoonDay3, RestroomAfternoonDay3, StairsAfternoonDay3, PlaygroundAfternoonDay3, LivingroomAfternoonDay3, BedroomAfternoonDay3, NightmareDay3,
        // Escenas dia 4
        BedroomMorningDay4, LivingroomMorningDay4, PlaygroundMorningDay4, StairsMorningDay4, CorridorMorningDay4, ClassFrontMorningDay4, ClassBackBreakDay4, CorridorBreakDay4, StairsBreakDay4, PlaygroundBreakDay4, PlaygroundAfternoonDay4, LivingroomAfternoonDay4, BedroomAfternoonDay4, NightmareDay4,
        // Escenas dia 5
        BedroomMorningDay5, LivingroomMorningDay5, PlaygroundMorningDay5, StairsMorningDay5, CorridorMorningDay5, ClassFrontMorningDay5, ClassBackAfternoonDay5, CorridorAfternoonDay5, StairsAfternoonDay5, RestroomAfternoonDay5, NightmareDay5,
        // UI
        ComputerScene, UIManager],
    autoFocus: true,
    disableContextMenu: true,        // Desactivar que aparezca el menu de inspeccionar al hacer click derecho
    render: {
        antialias: true,
        //transparent: true,
    },
    physics: {
        default: 'arcade',
        arcade: {
            // Visibilidad de las colisiones 
            debug: false,
        },
    },
    plugins: {
        // Plugin para utilizar animaciones esqueletales creadas con Spine
        scene: [
            { key: 'SpinePlugin', plugin: window.SpinePlugin, mapping: 'spine' }
        ]
    },
    scale: {
        autoCenter: Phaser.Scale.CENTER_BOTH,   // CENTER_BOTH, CENTER_HORIZONTALLY, CENTER_VERTICALLY
        mode: Phaser.Scale.FIT,                 // ENVELOP, FIT, HEIGHT_CONTROLS_WIDTH, NONE, RESIZE, WIDTH_CONTROLS_HEIGHT
        min: {
            width: min_w,
            height: min_h
        },
        max: {
            width: max_w,
            height: max_h,
        },
        zoom: 1,
        parent: 'game',
    },
};

const game = new Phaser.Game(config);
// Propiedad debug
game.debug = false;

})();
//# sourceMappingURL=bundle.js.map
