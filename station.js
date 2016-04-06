var fs = require("fs");
var util = require("util");
var assert = require("assert");

var shuffle = require('fisher-yates');  // randomize an array


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
            this.playlist = this.media.slice();
            shuffle(this.playlist);
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
         * Create a station object form a media list
         *
         * Pure: media list [] -> station
         *
         * @param name
         * @param media
         * @returns {{name: *, media: *, currentTime: number, playing: null, batonHolder: null}}
         * @constructor
         */
        Station: function Station (name, media) {
            return {
                name: name,
                media: media,
                currentTime: 0,
                playing: null,
                batonHolder: null
            };
        },
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
        createStationsFromDirectoryList: function (files) {
            files.filter((directoryName) => {
                    // exclude 'hidden' directories
                    return directoryName[0] !== ".";
                })
                .sort()
                .map((directoryName) => {

                    fs.readdir(fsRoot + "/" + directoryName, (err, files) => {
                        assert.ifError(err);

                        module.createStation(files, directoryName, (err, station) => {
                            module.stationsList.push(station);
                        });
                    });
                });
        },
        // impure
        createStationList: () => {
            fs.readdir(fsRoot, (err, files) => {
                assert.ifError(err);
                module.createStationsFromDirectoryList(files);
            });
        },
        getStationByName: (stationName) => {
            return module.stationsList.find( (station) => {
                return station.name === stationName;
            });
        }
    };

    return module;
};

module.exports.stations = stations;
