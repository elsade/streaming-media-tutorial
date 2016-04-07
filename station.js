var fs = require("fs");
var util = require("util");
var assert = require("assert");
var _ = require("underscore");

var stations = function(root) {
    "use strict";

    var staticRoot = root;
    const stationRoot = "/stations";

    // used on the server side
    var fsRoot = staticRoot + stationRoot;

    class Station {
        constructor (name, media) {
            this.name = name;
            this.media = media;
            this.currentTime = 0;
            this.playing = null;
            this.batonHolder = null;
        }

        createPlaylist() {
            this.playlist = _.shuffle(this.media.slice());
        }

        next() {
            if(!this.playlist || this.playlist.length === 0) {
                this.createPlaylist();
            }

            // move the first media file in the playlist to the playing slot
            this.playing = this.playlist.shift();
            this.currentTime = 0;
        }

        play() {

            if(this.playing) {
                console.log("station play(), '" + this.playing.name + "' is already playing.");
            }
            else {
                this.next();
            }

            assert(this.playing);
        }

        updateTime (currentTime) {
            assert(this.playing);

            if (this.playing) {
                //console.log("updateTime " + currentTime);
                this.currentTime = currentTime;
            }
        }

        set holder(user) {
            util.log("assigning baton to " + user);
            this.batonHolder = user;
        }

        get holder() {
            return this.batonHolder;
        }
    }

    var module = {
        stationsList: [],
        /**
         * Create a station from a file list.
         *
         * Pure: file list [] -> station []
         *
         * @param files
         * @param stationName
         * @param callback
         * @returns {*}
         */
        createStation: (files, stationName, callback) => {
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

            let newStation = new Station(stationName, media);

            // return the newly created station
            return callback(null, newStation);
        },
        /**
         * Return a function that will be called while iterating over the directory during
         * station creation.
         *
         * Pure: string -> function
         *
         * @returns {Function}
         */
        overEachDirectory: () => {
            return function(directoryName) {
                fs.readdir(fsRoot + "/" + directoryName, (err, files) => {
                    assert.ifError(err);

                    module.createStation(files, directoryName, (err, station) => {
                        module.stationsList.push(station);
                    });
                });
            };
        },
        /**
         * Iterate over the files in a directory and call the provided function on each subdirectory
         *
         * @param files - A
         * @param overEach - A function to be called over each subdirectory
         */
        createStationsFromDirectoryList: function (files, overEach) {
            files.filter((directoryName) => {
                    // exclude 'hidden' directories
                    return directoryName[0] !== ".";
                })
                .sort()
                .map((directoryName) => {
                    overEach(directoryName);
                });
        },
        /**
         * Create the list of stations from the content of the root directory.
         *
         * impure
         */
        createStationList: () => {
            fs.readdir(fsRoot, (err, files) => {
                assert.ifError(err);
                module.createStationsFromDirectoryList(files, module.overEachDirectory());
            });
        },
        /**
         * Get a station from the station list by name
         *
         * @param stationName
         * @returns {T}
         */
        getStationByName: (stationName) => {
            return module.stationsList.find( (station) => {
                return station.name === stationName;
            });
        }
    };

    return module;
};

module.exports.stations = stations;
