
import BaseScene from '../baseScene.js';
import { ACCESSIBLETYPE } from "../../../xAPITracker/HighLevel/Accessible.js"
import { COMPLETABLETYPE } from "../../../xAPITracker/HighLevel/Completable.js";
import { ALTERNATIVETYPE } from "../../../xAPITracker/HighLevel/Alternative.js"
import { GAMEOBJECTTYPE } from "../../../xAPITracker/HighLevel/GameObject.js";
import {xapiTracker, accessibleXapiTracker, alternativeXapiTracker, completableXapiTracker, gameObjectXapiTracker } from "../../../lib/xapi.js";

export default class BedroomBase extends BaseScene {
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
            var statement = this.gameManager.Interacted("wardrobeDoor1", GAMEOBJECTTYPE.ITEM);
            statement.addResultExtension("status", "closed");
            gameObjectXapiTracker.sendStatement(statement);
        }, true, () => {
            var statement = this.gameManager.Interacted("wardrobeDoor1", GAMEOBJECTTYPE.ITEM);
            statement.addResultExtension("status", "opened");
            gameObjectXapiTracker.sendStatement(statement);
        });

        // Puerta izquierda del armario
        let door2Closed = this.add.image(2500 * this.scale, 330 * this.scale, this.atlasName, 'wardrobeDoor2Closed').setOrigin(0, 0).setScale(this.scale);
        let door2Opened = this.add.image(2435 * this.scale, 307 * this.scale, this.atlasName, 'wardrobeDoor2Opened').setOrigin(0, 0).setScale(this.scale);
        super.toggleDoor(door2Closed, door2Opened, () => {
            var statement = this.gameManager.Interacted("wardrobeDoor2", GAMEOBJECTTYPE.ITEM);
            statement.addResultExtension("status", "closed");
            gameObjectXapiTracker.sendStatement(statement);
        }, true, () => {
            var statement = this.gameManager.Interacted("wardrobeDoor2", GAMEOBJECTTYPE.ITEM);
            statement.addResultExtension("status", "opened");
            gameObjectXapiTracker.sendStatement(statement);
        });

        // Puerta derecha del armario
        let door3Closed = this.add.image(3155 * this.scale, 330 * this.scale, this.atlasName, 'wardrobeDoor3Closed').setOrigin(1, 0).setScale(this.scale);
        let door3Opened = this.add.image(3220 * this.scale, 330 * this.scale, this.atlasName, 'wardrobeDoor3Opened').setOrigin(1, 0).setScale(this.scale);
        super.toggleDoor(door3Closed, door3Opened, () => {
            var statement = this.gameManager.Interacted("wardrobeDoor3", GAMEOBJECTTYPE.ITEM);
            statement.addResultExtension("status", "closed");
            gameObjectXapiTracker.sendStatement(statement);
        }, true, () => {
            var statement = this.gameManager.Interacted("wardrobeDoor3", GAMEOBJECTTYPE.ITEM);
            statement.addResultExtension("status", "opened");
            gameObjectXapiTracker.sendStatement(statement);
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
                gameObjectXapiTracker.sendStatement(this.gameManager.Interacted("wardrobe1", GAMEOBJECTTYPE.ITEM));
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
                gameObjectXapiTracker.sendStatement(this.gameManager.Interacted("wardrobe2", GAMEOBJECTTYPE.ITEM));
                this.dialogManager.setNode(this.wardrobe2Node);
            }
        })


        // Ordenador
        let nodes = this.cache.json.get('everydayDialog');
        this.pcNode = super.readNodes(nodes, "everydayDialog", "bedroom.pc", true);
        let pc = this.add.zone(276, 360, 150, 162).setOrigin(0, 0);
        pc.setInteractive({ useHandCursor: true });
        // Al hacer click sobre el, se cambia el nodo en el dialogManager, y si
        // se lanza el evento turnPC, se cambia a la escena del ordenador
        pc.on('pointerdown', () => {
            gameObjectXapiTracker.sendStatement(this.gameManager.Interacted("computer", GAMEOBJECTTYPE.ITEM));
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
            gameObjectXapiTracker.sendStatement(this.gameManager.Interacted("livingroomDoor", GAMEOBJECTTYPE.ITEM));
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
            gameObjectXapiTracker.sendStatement(this.gameManager.Interacted("bed", GAMEOBJECTTYPE.ITEM));
            this.dialogManager.setNode(this.bedNode);
        })

        // Evento que se llama al elegir dormir. Hace la animacion de cerrar 
        // los ojos y cuando acaba pasa a la pesadilla del dia correspondiente
        this.dispatcher.addOnce("sleep", this, (obj) => {
            this.phoneManager.topLid.visible = true;
            this.phoneManager.botLid.visible = true;
            this.phoneManager.topLid.y = -this.CANVAS_HEIGHT / 2;
            this.phoneManager.botLid.y = this.CANVAS_HEIGHT;
            let anim = this.phoneManager.closeEyesAnimation(false);
            completableXapiTracker.sendStatement(this.gameManager.Completed(this.scene.key, COMPLETABLETYPE.STORYNODE));
            anim.on('complete', () => {
                setTimeout(() => {
                    this.phoneManager.bgBlock.disableInteractive();
                    let nightmareScene = "NightmareDay" + this.gameManager.day;
                    this.gameManager.changeScene(nightmareScene);
                }, 1000);
            })
        });        
    }
}
