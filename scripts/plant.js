define(['embox2d-helpers',
        'app/character',
        'app/paths',
        'app/plantbody'], function (B2Helpers, Character, Paths, PlantBody) {
    function Plant (stage, physicsworld, physicsbinder, globalmessagebus, localmessagebus) {
        Character.call(this, stage, physicsworld, physicsbinder, globalmessagebus, localmessagebus);

        this.plantBody = new PlantBody(new PIXI.Point(80,200), physicsworld, physicsbinder);
        this.plantBody.addSegment(null, new PIXI.Point(80,180));
        this.plantBody.firstSegment.topWidth = 22;
        this.segment2 = this.plantBody.addSegment(this.plantBody.firstSegment, new PIXI.Point(80, 160));
        //console.log(segment2);
        this.segment2.topWidth = 16;
        this.segment2.physics.segmentBody.GetPosition().get_x();
        this.segment3 = this.plantBody.addSegment(this.segment2, new PIXI.Point(80, 140), true);
        this.segment2.growing = true;
        this.plantBody.update(0,0);
        this.plantStage = new PIXI.Container();
        this.plantBody.insertGraphics(this.plantStage);
        this.stage.addChild(this.plantStage);
        
        var spawnedNew = this.plantBody.grow(3, 10, 1000000000);

        this.control.bend = { right: false, left: false };
        this.grow = true;

        this.stage.x = window.innerWidth / 2;
        this.stage.y = window.innerHeight / 2;
    }

    Plant.prototype = Object.create(Character.prototype);
    Plant.prototype.constructor = Plant;

    Plant.prototype.onKeyDown = function (keyevent) {
        console.log(keyevent.key);
        if (keyevent.key == "ArrowLeft") {
            this.control.bend.left = true;
        } else if (keyevent.key == "ArrowRight") {
            this.control.bend.right = true;
        } else if (keyevent.key == "s") {
            this.grow = false;
        }
    };
    Plant.prototype.onKeyUp = function (keyevent) {
        if (keyevent.key == "ArrowLeft") {
            this.control.bend.left = false;
        } else if (keyevent.key == "ArrowRight") {
            this.control.bend.right = false;
        }
    };

    Plant.prototype.update = function (delta, time) {
        var spawnedNew = false, grown = false;
        if (this.control.bend.left && this.control.bend.right) {
            spawnedNew = this.plantBody.grow(30, delta, time);
            grown = true;
        } else if (this.control.bend.left) {
            spawnedNew = this.plantBody.grow(30, delta, time);
            grown = true;
            this.plantBody.tip.angle = Math.PI/6;
            this.plantBody.tip.prevSegment.angle = Math.PI/6;
            this.plantBody.tip.prevSegment.prevSegment.angle = Math.PI/6;
        } else if (this.control.bend.right) {
            spawnedNew = this.plantBody.grow(30, delta, time);
            grown = true;
            this.plantBody.tip.angle = -Math.PI/6;
            this.plantBody.tip.prevSegment.angle = -Math.PI/6;
            this.plantBody.tip.prevSegment.prevSegment.angle = -Math.PI/6;
        } else if (this.control.bend == "") {
            this.plantBody.tip.angle = 0;
            this.plantBody.tip.prevSegment.angle = 0;
            this.plantBody.tip.prevSegment.prevSegment.angle = 0;
        }

        this.plantBody.update(delta, time);
        if (grown && spawnedNew) {
            this.plantStage.removeChildren();
            this.plantBody.insertGraphics(this.plantStage);
        }

    }

    return Plant;
});
