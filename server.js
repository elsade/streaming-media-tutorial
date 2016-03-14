var util = require("util");
var assert = require("assert");
var fs = require("fs");

var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

var staticRoot = "./static";

var id3 = require('./id3').id3Tags(staticRoot);
var coverArt = require('cover-art');
var stations = require("./station").stations(staticRoot);
var userStore = require("./userStore").userStore();

app.use(express.static('static'));
app.use(express.static('js'));

var sockets = {};

// populate the stations and their song lists
stations.create();

var stationUtils = (function () {
    "use strict";

    var module = {
        getSongMetaData: (filePath, callback) => {
            var songMetaData = {
                path: filePath
            };

            id3.getTag(filePath, (err, tags) => {

                if(err) {
                    return callback(err, songMetaData);
                }

                songMetaData.title = tags.title;
                songMetaData.artist = tags.artist;
                songMetaData.album = tags.album;

                if(songMetaData.artist && songMetaData.album) {
                    return coverArt(songMetaData.artist.trim(), songMetaData.album.trim(), "large", (err, url)=> {
                        if(err) {
                            console.log("cover art error: " + util.inspect(err));
                            return callback(null, songMetaData);
                        }

                        songMetaData.coverUrl = url;

                        return callback(null, songMetaData);
                    });
                }

                return callback(null, songMetaData);
            });
        },
        getStation: (stationName) => {
            return stations.stationsList.find( (station) => station.name === stationName);
        },
        playSong: (socket, station, songPath, startTime) => {
            util.log(id3);

            module.getSongMetaData( songPath, (err, songMetaData) => {

                songMetaData.startTime = startTime;

                util.log(songMetaData);

                util.log("<---out--- 'playSong' " + util.inspect(songMetaData));
                socket.emit("playSong", songMetaData);

                socket.broadcast.to(station.name).emit("playSong", songMetaData);
            });
        },
        leaveStation: (socket) => {
            if(socket.activeStationName) {

                // check if the use was the baton holder; if so, assign a new one
                var batonHolder = stations.getBatonHolder(socket.activeStationName);
                if(batonHolder) {
                    if(batonHolder.socketId === socket.id) {
                        var newBatonHolder = userStore.userList[0];
                        stations.assignBatonHolder(socket.activeStationName, newBatonHolder);
                        sockets[newBatonHolder.socketId].emit("giveBaton", { baton: true });
                    }
                }


                // notify other that user has left
                var notificationMsg = socket.username + " has left the channel.";

                socket.broadcast.to(socket.activeStationName).emit("notification", {
                    msg: notificationMsg
                });

                // leave the room
                socket.leave(socket.activeStationName);
                delete socket.activeStationName;
            }
        },
        joinStation: (socket, station) => {
            // leave previous station if we need to
            module.leaveStation(socket, station);

            // join the channel associated with that station
            socket.join(station.name);
            socket.activeStationName = station.name;

            // check if the baton has been assigned
            var batonHolder = stations.getBatonHolder(station);
            if(!batonHolder) {
                stations.assignBatonHolder(station, userStore.findUserById(socket.id));

                socket.emit("giveBaton", { baton: true });
            }

            // send the joined notification

            var notificationMsg = socket.username + " has joined the channel.";

            socket.broadcast.to(socket.activeStationName).emit("notification", {
                msg: notificationMsg
            });
        }
    };

    return module;
}());

io.on('connection', (socket) => {
    "use strict";

    console.log('a user connected');

    sockets[socket.id] = socket;

    socket.on("login", (loginInfo) => {
        var response;
        util.log("---in---> 'login' " + util.inspect(loginInfo));

        response = {
            stationList: stations.stationsList
        };

        socket.username = loginInfo.username;

        var user = userStore.CreateUser(socket.id, loginInfo.username);
        userStore.addUser(user);

        util.log("<---out--- 'stations' " + util.inspect(response));
        socket.emit("stations", response);
    });

    socket.on("playStation", (playInfo) => {
        util.log("---in---> 'playStation' " + util.inspect(playInfo));
        var songPath;
        var selectedStation = stationUtils.getStation(playInfo.name);
        assert(selectedStation);

        stations.play(selectedStation);
        assert(selectedStation.playing);

        songPath = selectedStation.playing.path;

        stationUtils.joinStation(socket, selectedStation);

        stationUtils.playSong(socket, selectedStation, songPath, selectedStation.currentTime);
    });

    socket.on("nextSong", (nextSongInfo) => {
        util.log("---in---> 'nextSong' " + util.inspect(nextSongInfo));
        var songPath;

        var selectedStation = stationUtils.getStation(nextSongInfo.name);
        assert(selectedStation);

        stations.next(selectedStation);
        assert(selectedStation.playing);

        songPath = selectedStation.playing.path;
        assert(selectedStation.playing);
        stationUtils.playSong(socket, selectedStation, songPath, 0);
    });

    socket.on("reportProgress", (progressInfo) => {
        //console.log("reportProgress " + progressInfo.progress);

        if(socket.activeStationName) {
            var selectedStation = stationUtils.getStation(socket.activeStationName);
            assert(selectedStation);

            stations.updateTime(selectedStation, progressInfo.progress);
        }
    });

    socket.on("changeProgress", (progressInfo) => {
        if(socket.activeStationName) {
            var selectedStation = stationUtils.getStation(socket.activeStationName);
            assert(selectedStation);

            stations.updateTime(selectedStation, progressInfo.progress);

            socket.broadcast.to(socket.activeStationName).emit("notifyChangeProgress", progressInfo);
        }
    });

    socket.on("playerCommand", (commandInfo) => {
        console.log("playerCommand " + commandInfo);

        assert(socket.activeStationName);
        if(socket.activeStationName) {
            //var selectedStation = stationUtils.getStation(socket.activeStationName);
            socket.broadcast.to(socket.activeStationName).emit("notifyCommand", commandInfo);
        }
    });

    socket.on("sendChat", (chatInfo) => {
        util.log(chatInfo);

        assert(chatInfo.username);
        assert(chatInfo.station);

        socket.broadcast.to(chatInfo.station).emit("receiveChat", chatInfo);
    });

    socket.on("error", (err) => {
        util.log(err);
    });

    socket.on('disconnect', () => {
        console.log('connection dropped');

        if(socket.activeStationName) {
            var selectedStation = stationUtils.getStation(socket.activeStationName);
            assert(selectedStation);

            // leave the station
            stationUtils.leaveStation(socket, selectedStation);
        }

        userStore.removeUserById(socket.id);

        if(sockets[socket.id]) {
            delete sockets[socket.id];
        }
    });
});

server.listen(port, () => {
    "use strict";
    console.log('listening on *:' + port);
});

process.on('uncaughtException', (err) => {
    "use strict";
    // handle the error safely
    console.log("Uncaught exception, err: " + util.inspect(err));
});
