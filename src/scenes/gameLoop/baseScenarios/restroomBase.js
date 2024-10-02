
import BaseScene from '../baseScene.js';
import { ACCESSIBLETYPE } from "../../../xAPITracker/HighLevel/Accessible.js"
import { COMPLETABLETYPE } from "../../../xAPITracker/HighLevel/Completable.js";
import { ALTERNATIVETYPE } from "../../../xAPITracker/HighLevel/Alternative.js"
import { GAMEOBJECTTYPE } from "../../../xAPITracker/HighLevel/GameObject.js";
import {xapiTracker, accessibleXapiTracker, alternativeXapiTracker, completableXapiTracker, gameObjectXapiTracker } from "../../../lib/xapi.js";

export default class RestroomBase extends BaseScene {
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
            gameObjectXapiTracker.sendStatement(this.gameManager.Interacted("corridorDoor", GAMEOBJECTTYPE.ITEM));
            let params = {
                camPos: "left"
            }
            this.gameManager.changeScene(this.corridor, params, true);    
        }, false);


        // Puerta del primer cubiculo
        let stall1DoorClosed = this.add.image(1911 * this.scale, 296 * this.scale, this.atlasName, 'restroomStall1Closed').setOrigin(0, 0).setScale(this.scale);
        let stall1DoorOpened = this.add.image(1742 * this.scale, 276 * this.scale, this.atlasName, 'restroomStall1Opened').setOrigin(0, 0).setScale(this.scale);
        super.toggleDoor(stall1DoorClosed, stall1DoorOpened, () => {
            var statement = this.gameManager.Interacted("restroomStall1", GAMEOBJECTTYPE.ITEM);
            statement.addResultExtension("status", "closed");
            gameObjectXapiTracker.sendStatement(statement);
        }, true, () => {
            var statement = this.gameManager.Interacted("restroomStall1", GAMEOBJECTTYPE.ITEM);
            statement.addResultExtension("status", "opened");
            gameObjectXapiTracker.sendStatement(statement);
        });

        // Puerta del segundo cubiculo
        this.stall2 = this.add.image(2155 * this.scale, -6 * this.scale, this.atlasName, 'stall2').setOrigin(0, 0).setScale(this.scale);
        let stall2DoorClosed = this.add.image(2197 * this.scale, 244 * this.scale, this.atlasName, 'restroomStall2Closed').setOrigin(0, 0).setScale(this.scale);
        let stall2DoorOpened = this.add.image(1844 * this.scale, 240 * this.scale, this.atlasName, 'restroomStall2Opened').setOrigin(0, 0).setScale(this.scale);
        super.toggleDoor(stall2DoorClosed, stall2DoorOpened, () => {
            var statement = this.gameManager.Interacted("restroomStall2", GAMEOBJECTTYPE.ITEM);
            statement.addResultExtension("status", "closed");
            gameObjectXapiTracker.sendStatement(statement);
        }, true, () => {
            var statement = this.gameManager.Interacted("restroomStall2", GAMEOBJECTTYPE.ITEM);
            statement.addResultExtension("status", "opened");
            gameObjectXapiTracker.sendStatement(statement);
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