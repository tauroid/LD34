define(['app/character', 'app/physicsbinder', 'app/paths'],
       function (Character, PhysicsBinder, Paths) {
    // Configure, don't modify
    function TestLevel(game) {
        this.game = game;
    }

    TestLevel.prototype.name = "testlevel";

    // Modify here
    TestLevel.prototype.load = function () {
        var game = this.game;
        var physics_unit = 30;
        var box_size = 30; //pixels

        var pworld = game.physicsworlds[this.name] = new Box2D.b2World(new Box2D.b2Vec2(0,10));
        var stage = game.stages[this.name] = new PIXI.Container();
        var physicsbinder = game.physicsbinders[this.name] = new PhysicsBinder(physics_unit);

        var boxChar = new Character(stage, pworld, physicsbinder, game.messagebus, null);

        game.logicgroups[this.name] = [ boxChar ];
        
        var boxDef = new Box2D.b2BodyDef();
        boxDef.set_type(Box2D.b2_dynamicBody);

        var boxShape = new Box2D.b2PolygonShape();
        var halfside = box_size / physics_unit / 2;
        boxShape.SetAsBox(halfside, halfside);

        var boxBody = boxChar.data.physics.body = pworld.CreateBody(boxDef);
        boxBody.CreateFixture(boxShape, 1);

        var groundDef = new Box2D.b2BodyDef();

        var groundShape = new Box2D.b2PolygonShape();
        groundShape.SetAsBox(100/physics_unit, 25/physics_unit);

        var groundBody = pworld.CreateBody(groundDef);
        groundBody.CreateFixture(groundShape, 0);

        var box = boxChar.data.graphics.sprite = PIXI.Sprite.fromImage(Paths.images+"man.png");
        box.pivot = new PIXI.Point(box_size/2, box_size/2);
        box.x = 50; box.rotation = Math.PI/3;
        stage.addChild(box);
        
        var ground = new PIXI.Graphics();

        ground.beginFill(0x00FF00);
        ground.drawRect(0,0,200,50);
        ground.endFill();
        ground.pivot = new PIXI.Point(100,25);
        ground.y = 200; ground.x = 100;

        stage.addChild(ground);

        physicsbinder.bindBodyToActor(boxBody, box);
        physicsbinder.bindBodyToActor(groundBody, ground);

        physicsbinder.syncPhysicsBodies();

        game.activethings.push(this.name);
    }
                
    TestLevel.prototype.unload = function () {
        this.game.deleteGroups(this.name);
    }

    return TestLevel;
}); 
