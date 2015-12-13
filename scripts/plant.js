define(['embox2d-helpers',
        'app/character',
        'app/paths',
        'app/plantbody'], function (B2Helpers, Character, Paths, PlantBody) {
    function Plant (stage, physicsworld, physicsbinder, globalmessagebus, localmessagebus) {
        Character.call(this, stage, physicsworld, physicsbinder, globalmessagebus, localmessagebus);

        this.plantBody = new PlantBody(new PIXI.Point(80,200), physicsworld, physicsbinder);
        console.log(this.plantBody.addSegment(null, new PIXI.Point(80,180)));
        this.plantBody.firstSegment.topWidth = 18;
        this.segment2 = this.plantBody.addSegment(this.plantBody.firstSegment, new PIXI.Point(80, 160));
        //console.log(segment2);
        this.segment2.topWidth = 16;
        this.segment3 = this.plantBody.addSegment(this.segment2, new PIXI.Point(80, 140), true);
        this.plantBody.update(0,0);
        this.plantBody.insertGraphics(this.stage);

        this.control.bend = "";

        this.stage.x = window.innerWidth / 2;
        this.stage.y = window.innerHeight / 2;
    }

    Plant.prototype = Object.create(Character.prototype);
    Plant.prototype.constructor = Plant;

    Plant.prototype.onKeyDown = function (keyevent) {
        console.log(keyevent.key);
        if (keyevent.key == "ArrowLeft") {
            this.control.bend = "left";
        } else if (keyevent.key == "ArrowRight") {
            this.control.bend = "right";
        }
    };
    Plant.prototype.onKeyUp = function (keyevent) {
        if (keyevent.key == "ArrowLeft" || keyevent.key == "ArrowRight") {
            this.control.bend = "";
        }
    };

    Plant.prototype.update = function (delta, time) {
        this.plantBody.update(delta, time);

        if (this.control.bend == "left") {
            this.segment2.physics.segmentBody.SetAwake(true);
            this.segment2.physics.segmentBody.ApplyTorque(-10);
            this.segment3.physics.segmentBody.SetAwake(true);
            this.segment3.physics.segmentBody.ApplyTorque(-10);
        } else if (this.control.bend == "right") {
            this.segment2.physics.segmentBody.SetAwake(true);
            this.segment2.physics.segmentBody.ApplyTorque(10);
            this.segment3.physics.segmentBody.SetAwake(true);
            this.segment3.physics.segmentBody.ApplyTorque(10);
        }
    }

    return Plant;
});
