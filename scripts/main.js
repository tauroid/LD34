var $, PIXI, Box2D;

requirejs.config({
    baseUrl: "/scripts/common",
    paths: {
        app: "/games/ld34/scripts"
    }
});

require(['jquery'], function (j) {
    $ = j;
    // TODO: Loady load here

    require(['pixi.min','Box2D_v2.3.1_min','app/game','app/testlevel'],
            function (p, B, Game, TestLevel) {
        PIXI = p; Box2D = B;

        $(document).ready(function () { start(Game, TestLevel); });
    });
});

function start(Game, TestLevel) {
    var game = new Game();
    game.load(new TestLevel(game));
}

function listKeys(obj) {
    for (var key in obj) {
        console.log(key+": "+obj[key]);
    }
}
