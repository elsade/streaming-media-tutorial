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
    const stationRoot = "/stations";

    // used on the server side
    var fsRoot = staticRoot + stationRoot;

    // pure
    function Station (name, media) {
        return {
            name: name,
            media: media,
            currentTime: 0,
            playing: null,
            batonHolder: null
        };
    }

    // pure
    var createStation = (files, stationName, callback) => {
        let media = files.filter((filename) => {
                // exclude 'hidden' files
                return filename[0] !== ".";
            })
            .map((current) => {
                return {
                    name: current,
                    path: stationRoot + "/" + stationName + "/" + current,
                    src: "/" + stationName + "/" + current
                };
            });

        let newStation = Station(stationName, media);

        return callback(null, newStation);
    };

    var module = {
        stationsList: [],
        // impure
        create: () => {
            fs.readdir(fsRoot, (err, files) => {
                assert.ifError(err);

                files.filter((directoryName) => {
                        // exclude 'hidden' directories
                    return directoryName[0] !== ".";
                })
                .sort()
                .map((directoryName) => {

                    fs.readdir(fsRoot + "/" + directoryName, (err, files) => {
                        assert.ifError(err);

                        createStation(files, directoryName, (err, station) => {
                            module.stationsList.push(station);
                        });
                    });
                });
            });
        },
        // impure
        createPlaylist: (station) => {
            assert(station);
            station.playlist = station.media.slice();
            shuffle(station.playlist);
        },
        next: (station) => {

            assert(station);

            if(!station.playlist || station.playlist.length === 0) {
                module.createPlaylist(station);
            }

            // move the first media file in the playlist to the playing slot
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
        },
        getStationByName: (stationName) => {
            return module.stationsList.find( (station) => station.name === stationName);
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