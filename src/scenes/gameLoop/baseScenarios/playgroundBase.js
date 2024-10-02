
import BaseScene from '../baseScene.js';
import { ACCESSIBLETYPE } from "../../../xAPITracker/HighLevel/Accessible.js"
import { COMPLETABLETYPE } from "../../../xAPITracker/HighLevel/Completable.js";
import { ALTERNATIVETYPE } from "../../../xAPITracker/HighLevel/Alternative.js"
import { GAMEOBJECTTYPE } from "../../../xAPITracker/HighLevel/GameObject.js";
import {xapiTracker, accessibleXapiTracker, alternativeXapiTracker, completableXapiTracker, gameObjectXapiTracker } from "../../../lib/xapi.js";

export default class PlaygroundBase extends BaseScene {
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
        this.bgImg = 'playgroundClosed'
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
            gameObjectXapiTracker.sendStatement(this.gameManager.Interacted("exit", GAMEOBJECTTYPE.ITEM));
            if (this.homeNode) {
                this.dialogManager.setNode(this.homeNode);
            }
            else {
                let params = {
                    nextScene: this.home
                }
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
            gameObjectXapiTracker.sendStatement(this.gameManager.Interacted("doors", GAMEOBJECTTYPE.ITEM));
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
        this.bgImg = 'playgroundOpened'
        this.bg = this.add.image(0, 0, this.bgImg).setOrigin(0, 0).setScale(this.scale).setDepth(bgDepth);
    }
}