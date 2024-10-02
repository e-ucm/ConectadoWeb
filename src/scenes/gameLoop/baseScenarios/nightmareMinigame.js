import NightmareBase from './nightmareBase.js'
import { ACCESSIBLETYPE } from "../../../xAPITracker/HighLevel/Accessible.js"
import { COMPLETABLETYPE } from "../../../xAPITracker/HighLevel/Completable.js";
import { ALTERNATIVETYPE } from "../../../xAPITracker/HighLevel/Alternative.js"
import { GAMEOBJECTTYPE } from "../../../xAPITracker/HighLevel/GameObject.js";
import {xapiTracker, accessibleXapiTracker, alternativeXapiTracker, completableXapiTracker, gameObjectXapiTracker } from "../../../lib/xapi.js";

export default class NightmareMinigame extends NightmareBase {
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
        }

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
        })

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
        }
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
        }

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