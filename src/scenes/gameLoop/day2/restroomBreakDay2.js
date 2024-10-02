
import RestroomBase from '../baseScenarios/restroomBase.js';
import { ACCESSIBLETYPE } from "../../../xAPITracker/HighLevel/Accessible.js"
import { COMPLETABLETYPE } from "../../../xAPITracker/HighLevel/Completable.js";
import { ALTERNATIVETYPE } from "../../../xAPITracker/HighLevel/Alternative.js"
import { GAMEOBJECTTYPE } from "../../../xAPITracker/HighLevel/GameObject.js";
import {xapiTracker, accessibleXapiTracker, alternativeXapiTracker, completableXapiTracker, gameObjectXapiTracker } from "../../../lib/xapi.js";

export default class RestroomBreakDay2 extends RestroomBase {
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
            gameObjectXapiTracker.sendStatement(this.gameManager.Interacted("sink", GAMEOBJECTTYPE.ITEM));
            this.dialogManager.setNode(sinkNode);
        });

        
    }
}