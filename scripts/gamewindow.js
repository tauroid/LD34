define(function () {
    function GameWindow(world, stage, renderTexture) {
        this.world = world;
        this.stage = stage;
        this.renderer = renderer;

        this.physicsUnitSize = 30; // pixels

        this.gamedata = {};

        this.bodyPointBindings = [];
    }

    GameWindow.prototype = Object.create(PIXI.Sprite.prototype);
    GameWindow.prototype.constructor = GameWindow;

    GameWindow.prototype.position = {


    GameWindow.prototype.addEntity = function (entitydata) {
        this.
    }

    GameWindow.prototype.bodyPositionToPoint = function (bodyPosition) {

    return GameWindow;
});
