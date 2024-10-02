import Phone from '../UI/phone/phone.js';
import GameManager from './gameManager.js';
import { ACCESSIBLETYPE } from "../xAPITracker/HighLevel/Accessible.js"
import { COMPLETABLETYPE } from "../xAPITracker/HighLevel/Completable.js";
import { ALTERNATIVETYPE } from "../xAPITracker/HighLevel/Alternative.js"
import { GAMEOBJECTTYPE } from "../xAPITracker/HighLevel/GameObject.js";
import {xapiTracker, accessibleXapiTracker, alternativeXapiTracker, completableXapiTracker, gameObjectXapiTracker } from "../lib/xapi.js";

export default class PhoneManager {
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
                gameObjectXapiTracker.sendStatement(this.gameManager.Interacted("hideMobile", GAMEOBJECTTYPE.ITEM));
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
                gameObjectXapiTracker.sendStatement(this.gameManager.Interacted("toggleMobile", GAMEOBJECTTYPE.ITEM));
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

        let text = this.i18next.t("alarm.message", { ns: "phoneInfo" })
        let wakeUpText = this.scene.add.text(this.scene.CANVAS_WIDTH / 2, 0, text, textConfig).setOrigin(0.5, 0.5);
        wakeUpText.y += wakeUpText.displayHeight;

        let bgCol = 0xFFB61E1E;
        let borderCol = 0x000000;
        let borderThickness = 2;

        let w = wakeUpText.displayWidth * 1.15;
        let h = wakeUpText.displayHeight * 1.5;
        let min = Math.min(w, h);
        let radius = min * 0.1;

        let bgGraphics = this.scene.make.graphics().fillStyle(bgCol, 1).fillRoundedRect(0, 0, w, h, radius).lineStyle(borderThickness, borderCol, 1).strokeRoundedRect(0, 0, w, h, radius)
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
        let notificationColor = 0xf55d5d
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
        // Coge el texto de la hora y de los dias en el archivo de traducciones
        let hour = this.i18next.t("clock." + hourId, { ns: "phoneInfo" });
        let days = this.i18next.t("clock.days", { ns: "phoneInfo", returnObjects: true });

        // Coge el dia del array en base al dia del gameManager
        let day = days[this.gameManager.day - 1];

        // Set date time in game manager for xapiTracker
        this.gameManager.hour = hour;
        this.gameManager.dayText = day;

        // Cambia la hora del telefono
        this.phone.setDayInfo(hour, day);
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
        var statement = this.gameManager.Interacted("Sleep_phone", GAMEOBJECTTYPE.ITEM);
        statement.addResultExtension("isLate",this.gameManager.getValue("isLate"));
        gameObjectXapiTracker.sendStatement(statement);
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
        var statement = this.gameManager.Interacted("wake_up_phone", GAMEOBJECTTYPE.ITEM);
        statement.addResultExtension("isLate",this.gameManager.getValue("isLate"));
        gameObjectXapiTracker.sendStatement(statement);
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
            speed = 500
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
                speed = 500
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
                    speed = 500
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
                        speed = 1500
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
