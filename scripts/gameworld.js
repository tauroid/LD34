// Updates physics and logic of all entities in gamedata,
// syncs stage with physics. Feed and forget physics & graphics entities. 
// The entities should already be linked and in the respective world and stage
// when their data is inserted using addEntity.
// Link logic loop with physics for now.

define(["physicsbinder", function (PhysicsBinder) {
    function GameWorld(game, physicsworld, stage) {
        this.game = game;
        this.physicsworld = physicsworld;
        this.stage = stage;

        this.velIterations = 10;
        this.posIterations = 3;

        this.physicsbinder = new PhysicsBinder();
    }

    GameWorld.prototype.update = function (timestep) {
        physicsworld.Step(timestep, this.velIterations, this.posIterations);

    

    return GameWorld;
});
