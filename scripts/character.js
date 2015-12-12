define(function() {
    // "Entity objects" like this, to specialise, subclass and then modify this.data
    // Sits at the intersection of stage, physics world and local message bus
    // You should create a physicsbinder for each combination of stage and physics world,
    // so that references can be collected on deletion of world and stage.

    function Character(stage, physicsworld, physicsbinder, globalmessagebus, localmessagebus) {
        this.stage = stage;
        this.physicsworld = physicsworld;
        this.physicsbinder = physicsbinder;
        this.globalmessagebus = globalmessagebus;
        this.localmessagebus = localmessagebus;

        this.data = {
            graphics: {},
            physics: {}
        };

        this.control = {
            rolling: false,
            rolldirection: "clockwise",
            jumping: false
        };

        this.globalmessagebus.registerOnChannel("keydown", this);
        this.globalmessagebus.registerOnChannel("keyup", this);
    }

    Character.prototype.receiveMessage = function (channel, message) {
        switch (channel) {
            case "keydown":
                this.onKeyDown(message);
                break;
            default:
                break;
        }
    }

    Character.prototype.onKeyDown = function (keyevent) {
        if (keyevent.key == "ArrowUp") {
            this.control.jumping = true;
        } else if (keyevent.key == "ArrowLeft") {
            this.rolling = true;
            this.rolldirection = "clockwise";
        } else if (keyevent.key == "ArrowRight") {
            this.rolling = true;
            this.rolldirection = "anticlockwise";
        }
    }


    Character.prototype.update = function (delta, time) {
        if (this.control.jumping) this.jump();
        if (this.control.rolling) this.jump(this.control.rolldirection == "clockwise");
    }

    Character.prototype.jump = function () {
        var body = this.data.physics.body;
        var currentvel = body.GetLinearVelocity();
        body.SetLinearVelocity(new Box2D.b2Vec2(currentvel.get_x(), -10));
    }

    Character.prototype.roll = function (clockwise) {
        var body = this.data.physics.body;
        body.SetAwake(true);
        var torque = clockwise ? 100 : -100;
        body.ApplyTorque(torque);
    }

    return Character;
});
