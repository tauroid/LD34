define(['app/plant', 'app/physicsbinder', 'app/paths'],
       function (Plant, PhysicsBinder, Paths) {
    // Configure, don't modify
    function TestLevel(game) {
        this.game = game;
    }

    TestLevel.prototype.name = "testlevel";

    // Modify here
    TestLevel.prototype.load = function () {
        var game = this.game;
        var physics_unit = 30;

        var pworld = game.physicsworlds[this.name] = new Box2D.b2World(new Box2D.b2Vec2(0,10));
        var stage = game.stages[this.name] = new PIXI.Container();
        var physicsbinder = game.physicsbinders[this.name] = new PhysicsBinder(physics_unit);

        var groundDef = new Box2D.b2BodyDef();

        var groundShape = new Box2D.b2PolygonShape();
        groundShape.SetAsBox(100/physics_unit, 25/physics_unit);

        var groundBody = pworld.CreateBody(groundDef);
        var groundFixture = groundBody.CreateFixture(groundShape, 0);

        var ground = new PIXI.Graphics();

        ground.beginFill(0x00FF00);
        ground.drawRect(0,0,200,50);
        ground.endFill();
        ground.pivot = new PIXI.Point(100,25);
        ground.y = 225; ground.x = 100;

        stage.addChild(ground);

        var boxDef = new Box2D.b2BodyDef();
        boxDef.set_type(Box2D.b2_dynamicBody);

        var boxShape = new Box2D.b2PolygonShape();
        boxShape.SetAsBox(25/physics_unit, 25/physics_unit);

        var boxBody = pworld.CreateBody(boxDef);
        var boxFixture = boxBody.CreateFixture(boxShape, 1);

        var box = new PIXI.Graphics();

        box.beginFill(0xFF0000);
        box.drawRect(0,0,50,50);
        box.endFill();
        box.pivot = new PIXI.Point(25,25);
        box.y = -50; box.x = 100;

        stage.addChild(box);

        var plant = new Plant(stage, pworld, physicsbinder, game.messagebus, null);

        game.logicgroups[this.name] = [ plant ];
        
        physicsbinder.bindBodyToActor(groundBody, ground);
        physicsbinder.bindBodyToActor(boxBody, box);

        physicsbinder.syncPhysicsBodies();

        game.activethings.push(this.name);
    }
                
    TestLevel.prototype.unload = function () {
        this.game.deleteGroups(this.name);
    }

    return TestLevel;
}); 
