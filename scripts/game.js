// Responsibilities:
//  - Update physics worlds
//  - Update logic groups

define(['app/messagebus'], function (MessageBus) {
    function Game() {
        this.physicsworlds = {};
        this.stages = {};
        this.physicsbinders = {};
        this.logicgroups = {};
        this.gamewindows = {};
        this.messagebus = new MessageBus();
        this.localmessagebusses = {};

        // Keys of active groups
        this.activethings = [];

        this.configs = {};

        this.updateTimestep = 20;

        this.velIterations = 10;
        this.posIterations = 3;

        this.lastUpdateTime = new Date().getTime();

        console.log("how many?");
        this.renderer = new PIXI.autoDetectRenderer(window.innerWidth, window.innerHeight);
        this.renderer.view.style.display = "block";
        document.body.style.margin = "0";
        this.renderer.autoResize = true;
        this.renderer.backgroundColor = 0xFFFFFF;

        document.body.appendChild(this.renderer.view);
        window.onresize = this.onResize.bind(this);

        this.globalstage = new PIXI.Container(); // Stick gamewindows on here

        window.onkeydown = this.onKeyDown.bind(this);
        window.onkeyup = this.onKeyUp.bind(this);

        this.render();
        this.update();
    }

    Game.prototype.render = function () {
        // To later use gamewindows only, allows for cameras and filters and whatever
        // Lots of backbuffers
        //
        // -> gamewindows.render
        // -> renderer.render(globalstage)
        
        for (var i = 0; i < this.activethings.length; ++i) {
            var stage = this.stages[this.activethings[i]];
            if (stage !== undefined) {
                this.renderer.render(stage);
            }
        }

        requestAnimationFrame(this.render.bind(this));
    }

    Game.prototype.update = function () {
        var newtime = new Date().getTime();
        var delta = newtime - this.lastUpdateTime;
        this.lastUpdateTime = newtime;

        for (var i = 0; i < this.activethings.length; ++i) {
            var physicsworld = this.physicsworlds[this.activethings[i]];
            if (physicsworld !== undefined) {
                physicsworld.Step(delta/1000, this.velIterations, this.posIterations);
            }
        }

        for (var i = 0; i < this.activethings.length; ++i) {
            var physicsbinder = this.physicsbinders[this.activethings[i]];
            if (physicsbinder !== undefined) {
                physicsbinder.syncActors();
            }
        }

        for (var i = 0; i < this.activethings.length; ++i) {
            var logicgroup = this.logicgroups[this.activethings[i]];
            if (logicgroup !== undefined) {
                for (var l = 0; l < logicgroup.length; ++l) {
                    logicgroup[l].update(delta, newtime);
                }
            }
        }

        setTimeout(this.update.bind(this), this.updateTimestep);
    }

    Game.prototype.load = function (config) {
        this.configs[config.name] = config;
        config.load();
    }

    Game.prototype.unload = function (name) {
        this.configs[name].unload();
        delete this.configs[name];
    }

    Game.prototype.deleteGroups = function (key) {
        delete this.physicsworlds[key];
        delete this.stages[key];
        delete this.physicsbinders[key];
        delete this.logicgroups[key];
        delete this.gamewindows[key];
        delete this.localmessagebusses[key];
    }

    Game.prototype.onResize = function () {
        this.renderer.resize(window.innerWidth, window.innerHeight);
    }

    Game.prototype.onKeyDown = function (keyevent) {
        this.messagebus.sendMessage("keydown", keyevent);
    }

    Game.prototype.onKeyUp = function (keyevent) {
        this.messagebus.sendMessage("keyup", keyevent);
    }

    return Game;
});
