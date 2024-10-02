import BaseScreen from "./baseScreen.js";
import VerticalListView from "../listView/verticalListView.js";
import MessageBox from "../messageBox.js";
import { ACCESSIBLETYPE } from "../../xAPITracker/HighLevel/Accessible.js"
import { COMPLETABLETYPE } from "../../xAPITracker/HighLevel/Completable.js";
import { ALTERNATIVETYPE } from "../../xAPITracker/HighLevel/Alternative.js"
import { GAMEOBJECTTYPE } from "../../xAPITracker/HighLevel/GameObject.js";
import {xapiTracker, accessibleXapiTracker, alternativeXapiTracker, completableXapiTracker, gameObjectXapiTracker } from "../../lib/xapi.js";

export default class ChatScreen extends BaseScreen {
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
        textConfig.fontFamily = 'roboto';
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
            gameObjectXapiTracker.sendStatement(gameObjectXapiTracker.Interacted("chatBoxScreen", GAMEOBJECTTYPE.ITEM));
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
            gameObjectXapiTracker.sendStatement(gameObjectXapiTracker.Interacted("returnButton", GAMEOBJECTTYPE.ITEM));
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
        this.canAnswer = true;
        this.scene.dialogManager.setTalking(false);
        this.scene.dialogManager.bgBlock.disableInteractive();

        // Si el nodo a poner es valido, cambia el nodo por el indicado
        if (node) {
            this.currNode = node;

            if (this.currNode.type === "chatMessage") {
                this.processNode();
            }
        }
    }

    // Procesa el nodo de dialogo
    processNode() {
        this.canAnswer = true;
        this.scene.dialogManager.setTalking(false);
        this.scene.dialogManager.bgBlock.disableInteractive();
        
        if (this.currNode) {
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
            // Si no, si es de cualquier otro tipo excepto de eleccion multiple, lo gestiona el dialogManager
            else if (this.currNode.type !== "choice") {
                this.scene.dialogManager.setNode(this.currNode);
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