var fs = require("fs");
var util = require("util");
var assert = require("assert");

/**
 * Fisher-Yates Shuffle
 *
 * https://bost.ocks.org/mike/shuffle/
 *
 * @param array
 * @returns {*}
 */
function shuffle(array) {
    "use strict";
    var m = array.length, t, i;

    // While there remain elements to shuffle…
    while (m) {

        // Pick a remaining element…
        i = Math.floor(Math.random() * m--);

        // And swap it with the current element.
        t = array[m];
        array[m] = array[i];
        array[i] = t;
    }

    return array;
}


var stations = function(root) {
    "use strict";

    var staticRoot = root;
    var stationRoot = "/stations";

    // used on the server side
    var fsRoot = staticRoot + stationRoot;

    function Station (name, songs) {
        return {
            name: name,
            songs: songs,
            currentTime: 0,
            playing: null,
            batonHolder: null
        };
    }

    var createStation = (path, stationName, callback) => {
        var songs = [];

        fs.readdir(path, (err, files) => {
            assert.ifError(err);

            files.map((song) => {
                songs.unshift({
                    name: song,
                    path: stationRoot + "/" + stationName + "/" + song
                });
            });

            var newStation = Station(stationName, songs);

            callback(null, newStation);
        });
    };

    var module = {
        stationsList: [],
        create: () => {
            fs.readdir(fsRoot, (err, files) => {
                assert.ifError(err);

                files.sort().map((directoryName) => {
                    createStation(fsRoot + "/" + directoryName, directoryName, (err, station) => {
                        module.stationsList.push(station);
                    });
                });
            });
        },
        createPlaylist: (station) => {
            assert(station);
            station.playlist = station.songs.slice();
            shuffle(station.playlist);
        },
        next: (station) => {

            assert(station);

            if(!station.playlist || station.playlist.length === 0) {
                module.createPlaylist(station);
            }

            // move the first song in the playlist to the playing slot
            station.playing = station.playlist.shift();
            station.currentTime = 0;
        },
        play: (station) => {

            assert(station);

            if(station.playing) {
                console.log("station play(), '" + station.playing.name + "' is already playing.");
            }
            else {
                module.next(station);
            }

            assert(station.playing);
        },
        updateTime: (station, currentTime) => {
            assert(station);
            assert(station.playing);

            if(station.playing) {
                //console.log("updateTime " + currentTime);
                station.currentTime = currentTime;
            }
        },
        assignBatonHolder: (station, user) => {
            assert(station);
            if(station) {
                util.log("assigning baton to " + user);
                station.batonHolder = user;
            }
        },
        getBatonHolder: (station) => {
            assert(station);
            return station.batonHolder;
        }
    };

    return module;
};

module.exports.stations = stations;



/*

var x = stations();
x.create();

setTimeout(()=> {
    "use strict";
    util.log(util.inspect(x, {depth: 5}));
}, 1000);

*/