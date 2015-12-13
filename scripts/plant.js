define(['embox2d-helpers',
        'app/character',
        'app/paths',
        'app/plantbody'], function (B2Helpers, Character, Paths, PlantBody) {
    function Plant (stage, physicsworld, physicsbinder, globalmessagebus, localmessagebus) {
        Character.call(this, stage, physicsworld, physicsbinder, globalmessagebus, localmessagebus);

        this.plantStage = new PIXI.Container();
        this.plantBody = new PlantBody(new PIXI.Point(80,200),
                                       this.plantStage,
                                       physicsworld,
                                       physicsbinder);
        this.plantBody.addSegment(null, new PIXI.Point(80,180));
        this.plantBody.firstSegment.topWidth = 22;
        this.segment2 = this.plantBody.addSegment(this.plantBody.firstSegment, new PIXI.Point(80, 160));
        //console.log(segment2);
        this.segment2.topWidth = 16;
        this.segment3 = this.plantBody.addSegment(this.segment2, new PIXI.Point(80, 140), true);
        this.segment2.growing = true;
        this.plantBody.update(0,0);
        var p = this.plantBody.firstSegment.physics;
        console.log(p.segmentBody.GetPosition().get_x()+", "+p.segmentBody.GetPosition().get_y());
        this.physicsworld.Step(0.001, 10, 3);
        console.log(p.segmentBody.GetPosition().get_x()+", "+p.segmentBody.GetPosition().get_y());
        this.plantBody.update(0,0);
        console.log(this.plantBody.firstSegment.baseNode);
        this.plantBody.update(0,0);
        console.log(this.plantBody.firstSegment.baseNode);
        this.plantBody.reloadGraphics();
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
        var key = keyevent.key ? keyevent.key : keyevent.keyIdentifier;
        console.log(key);
        if (key == "ArrowLeft" || key == "Left") {
            this.control.bend.left = true;
        } else if (key == "ArrowRight" || key == "Right") {
            this.control.bend.right = true;
        } else if (key == "s") {
            this.grow = false;
        }
    };

    Plant.prototype.onKeyUp = function (keyevent) {
        var key = keyevent.key ? keyevent.key : keyevent.keyIdentifier;
        if (key == "ArrowLeft" || key == "Left") {
            this.control.bend.left = false;
        } else if (key == "ArrowRight" || key == "Right") {
            this.control.bend.right = false;
        }
    };

    Plant.prototype.update = function (delta, time) {
        var spawnedNew = false, grown = false;
        if (this.control.bend.left && this.control.bend.right) {
            this.plantBody.growSpeed = 30;
            this.plantBody.growAngle = 0;
        } else if (this.control.bend.left) {
            this.plantBody.growSpeed = 30;
            this.plantBody.growAngle = Math.PI/6;
        } else if (this.control.bend.right) {
            this.plantBody.growSpeed = 30;
            this.plantBody.growAngle = -Math.PI/6;
        } else {
            this.plantBody.growSpeed = 0;
            this.plantBody.growAngle = 0;
        }

        //this.plantBody.update(delta, time);
    }

    return Plant;
});
