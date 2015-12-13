var $, PIXI, Box2D;

// Test commit

requirejs.config({
    baseUrl: "/scripts/common",
    paths: {
        app: "/games/ld34/scripts"
    },
    urlArgs: "bust=" + (new Date()).getTime()
});

require(['jquery'], function (j) {
    $ = j;
    // TODO: Loady load here

    require(['pixi.min','Box2D_v2.3.1_min','app/paths','app/game','app/testlevel'],
            function (p, B, Paths, Game, TestLevel) {
        PIXI = p; Box2D = B;

        $(document).ready(function () {
            var loader = PIXI.loader;
            for (var path in Paths) {
                for (var filepath in Paths[path].files) {
                    loader.add(path+"."+filepath, Paths[path].path+Paths[path].files[filepath]);
                }
            }
            loader.once('complete', function () { start(Game, TestLevel); });
            loader.load();
        });
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
