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

        this.control = {};

        this.globalmessagebus.registerOnChannel("keydown", this);
        this.globalmessagebus.registerOnChannel("keyup", this);
    }

    Character.prototype.receiveMessage = function (channel, message) {
        switch (channel) {
            case "keydown":
                this.onKeyDown(message); break;
            case "keyup":
                this.onKeyUp(message); break;
        }
    };

    Character.prototype.onKeyDown = function (keyevent) {
        console.log("down");
    };

    Character.prototype.onKeyUp = function (keyevent) {
        console.log("up");
    };

    Character.prototype.update = function (delta, time) {};

    return Character;
});
