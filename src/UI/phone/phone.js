import AlarmScreen from "./alarmScreen.js";
import MainScreen from "./mainScreen.js";
import StatusScreen from "./statusScreen.js";
import MessagesScreen from "./messagesScreen.js";
import SettingsScreen from "./settingsScreen.js";
import { ACCESSIBLETYPE } from "../../xAPITracker/HighLevel/Accessible.js"
import { COMPLETABLETYPE } from "../../xAPITracker/HighLevel/Completable.js";
import { ALTERNATIVETYPE } from "../../xAPITracker/HighLevel/Alternative.js"
import { GAMEOBJECTTYPE } from "../../xAPITracker/HighLevel/GameObject.js";
import {xapiTracker, accessibleXapiTracker, alternativeXapiTracker, completableXapiTracker, gameObjectXapiTracker } from "../../lib/xapi.js";

export default class Phone extends Phaser.GameObjects.Container {
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
        ]

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
        gameObjectXapiTracker.sendStatement(gameObjectXapiTracker.Interacted("toPrevScreen", GAMEOBJECTTYPE.GAMEOBJECT));
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
        gameObjectXapiTracker.sendStatement(gameObjectXapiTracker.Interacted("toMainScreen", GAMEOBJECTTYPE.GAMEOBJECT));
        this.changeScreen(this.mainScreen);
    }

    // Cambia a la pantalla de estado
    toStatusScreen() {
        gameObjectXapiTracker.sendStatement(gameObjectXapiTracker.Interacted("openFriendsApp", GAMEOBJECTTYPE.GAMEOBJECT));
        this.changeScreen(this.statusScreen);
    }

    // Cambia a la pantalla de mensajes
    toMsgScreen() {
        gameObjectXapiTracker.sendStatement(gameObjectXapiTracker.Interacted("openMobileChat", GAMEOBJECTTYPE.GAMEOBJECT));
        this.changeScreen(this.messagesScreen);
    }

    /**
     * Cambia a la pantalla del chat indicado
     * @param {String} chat - id del chat
     */
    toChatScreen(chat) {
        gameObjectXapiTracker.sendStatement(gameObjectXapiTracker.Interacted(`chat_${chat}`, GAMEOBJECTTYPE.GAMEOBJECT));
        if (this.chats.has(chat)) {
            this.changeScreen(this.chats.get(chat));
            this.chats.get(chat).clearNotifications();
        }
    }

    // Cambia a la pantalla de ajustes
    toSettingsScreen() {
        gameObjectXapiTracker.sendStatement(gameObjectXapiTracker.Interacted("openMobileSettings", GAMEOBJECTTYPE.GAMEOBJECT));
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