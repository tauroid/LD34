// Binds a collection of Box2D bodies to objects sharing the
// pixi transform interface (.x, .y, .rotation)
// Preferably inhabiting the same container, so a mapping is created world -> stage
// Bodies should be linked to entities whose positions are in global space
// (world position of parent is same as stage) or the visual position may be incorrect.

define(function () {
    function PhysicsBinder(physicsUnitSize) {
        this.physicsUnitSize = physicsUnitSize;

        this.bodyActorBindings = [];
    }

    PhysicsBinder.prototype.bindBodyToActor = function (body, actor) {
        this.bodyActorBindings.push([body, actor]);
    }

    PhysicsBinder.prototype.syncActors = function () {
        for (var i = 0; i < this.bodyActorBindings.length; ++i) {
            var bodyPosition = this.bodyActorBindings[i][0].GetPosition();
            var bodyRotation = this.bodyActorBindings[i][0].GetAngle();

            var actor = this.bodyToActorPosition(bodyPosition);
            this.bodyActorBindings[i][1].x = actor.x;
            this.bodyActorBindings[i][1].y = actor.y;
            this.bodyActorBindings[i][1].rotation = bodyRotation;
        }
    }

    PhysicsBinder.prototype.syncPhysicsBodies = function () {
        for (var i = 0; i < this.bodyActorBindings.length; ++i) {
            var actor = this.bodyActorBindings[i][1];

            this.bodyActorBindings[i][0].SetTransform(
                this.actorToBodyPosition(actor), actor.rotation);
        }
    }

    PhysicsBinder.prototype.bodyToActorPosition = function (bodyPosition) {
        return new PIXI.Point(bodyPosition.get_x() * this.physicsUnitSize,
                              bodyPosition.get_y() * this.physicsUnitSize);
    }

    PhysicsBinder.prototype.actorToBodyPosition = function (actor) {
        return new Box2D.b2Vec2(actor.x / this.physicsUnitSize,
                                actor.y / this.physicsUnitSize);
    }

    return PhysicsBinder;
});
