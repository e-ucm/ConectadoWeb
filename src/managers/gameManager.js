import EventDispatcher from "../eventDispatcher.js";
import { alternativeXapiTracker, completableXapiTracker, gameObjectXapiTracker } from "../lib/xapi.js";
import BaseScene from "../scenes/gameLoop/baseScene.js";
import { ALTERNATIVETYPE } from "../xAPITracker/HighLevel/Alternative.js";
import { COMPLETABLETYPE } from "../xAPITracker/HighLevel/Completable.js";
import { GAMEOBJECTTYPE } from "../xAPITracker/HighLevel/GameObject.js";

// Variable de nivel de modulo
// - Se puede acceder desde cualquier parte del modulo, pero no es visible
// al no pertenecer a la clase y no ser exportada
// - No cambia con las instancia puesto que no pertenece a la clase, sino
// al modulo y solo existe un modulo

let instance = null;

export default class GameManager {
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
        }

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
        }
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
        }
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
        }
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
        }
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

    startGame(userInfo) {
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
            // Si la escena es hija de BaseScene, se tiene que llamar a su shutdown 
            // antes de detener la escena para evitar problemas al borrar los retratos
            if (sc instanceof BaseScene) {
                if (typeof sc.shutdown === 'function') {
                    sc.shutdown();
                }
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
        gameObjectXapiTracker.sendStatement(this.Interacted("ShowComputerLogin", GAMEOBJECTTYPE.ITEM));
        // Se desactiva la interfaz del telefono
        this.UIManager.phoneManager.activate(false);
        
        // Se duerme la escena actual
        this.currentScene.scene.sleep();

        // Se cambia a la escena del ordenador
        this.computerScene.start();
        this.computerScene.scene.wake();
    }

    leaveComputer() {
        gameObjectXapiTracker.sendStatement(this.Interacted("offComputer", GAMEOBJECTTYPE.ITEM));
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
            alternativeXapiTracker.sendStatement(alternativeXapiTracker.Unlocked("friend", character, ALTERNATIVETYPE.ALTERNATIVE));
            completableXapiTracker.sendStatement(completableXapiTracker.Initialized(varName, COMPLETABLETYPE.COMPLETABLE));
            this.setValue(varName, 50);
        }

        // Obtiene la cantidad a establecer y la actualiza
        let val = this.getValue(varName)
        val += amount;
        this.setValue(varName, val);
        completableXapiTracker.sendStatement(completableXapiTracker.Progressed(varName, COMPLETABLETYPE.COMPLETABLE, val));
        // Actualiza el valor tambien en la pantalla de relaciones del movil
        this.UIManager.phoneManager.phone.updateRelationShip(character, val);
    }

    Interacted(id, type) {
        var statement = gameObjectXapiTracker.Interacted(id, type);
        statement.addResultExtension("GameDay",this.dayText);
        statement.addResultExtension("GameHour", this.hour);
        statement.addResultExtension("IsRepeatedDay", this.isRepeatedDay); //TODO GlobalState.Repeated.ToString() 
        statement.addResultExtension("MobileMessages", this.notificationAmount);
        this.blackboard.forEach((value, key) => {
            statement.addResultExtension(key, value);
        });
        return statement;
    }

    Completed(id, type) {
        var statement = completableXapiTracker.Completed(id, type);
        statement.addResultExtension("Final", this.final);
        statement.addResultExtension("GameDay",this.dayText);
        statement.addResultExtension("GameHour", this.hour);
        statement.addResultExtension("MariaFriendship",this.blackboard.get("MariaFS"));
        statement.addResultExtension("AlisonFriendship", this.blackboard.get("AlisonFS"));
        statement.addResultExtension("AnaFriendship", this.blackboard.get("AnaFS"));
        statement.addResultExtension("GuillermoFriendship", this.blackboard.get("GuilleFS"));
        statement.addResultExtension("JoseFriendship", this.blackboard.get("JoseFS"));
        statement.addResultExtension("AlejandroFriendship", this.blackboard.get("AlexFS"));
        statement.addResultExtension("ParentsFriendship", this.blackboard.get("ParentsFS"));
        statement.addResultExtension("TeacherFriendship", this.blackboard.get("TeacherFS"));
        statement.addResultExtension("RiskFriendship", this.blackboard.get("Risk"));
        return statement;
    }
}