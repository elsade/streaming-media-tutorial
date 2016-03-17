var util = require("util");
var assert = require("assert");
var fs = require("fs");

var express = require('express');
var app = express();
var bodyParser = require('body-parser');

var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

var staticRoot = "./static";

var stations = require("./station").stations(staticRoot);
var userStore = require("./userStore").userStore();
var mediaUtils = require("./mediaUtils").mediaUtils(staticRoot);

app.use(express.static('static'));
app.use(express.static('js'));

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

var router = express.Router();

router.use(function(req, res, next) {
    "use strict";
    next();
});

router.get('/', function (req, res) {
    "use strict";
    res.json({Error: "Usage: GET /stations"});
});

router.route('/stations').get( function (req, res) {
    "use strict";
    res.json({
        stationList: stations.stationsList
    });
});

router.route('/stations/:name')
    .get( function (req, res) {
        "use strict";
        var stationName = req.params.name;

        if(stationName) {
            console.log("GET " + req.originalUrl);
            var selectedStation = stations.getStationByName(req.params.name);
            res.json({
                selectedStation
            });
        }
        else {
            res.status(500).send(new Error("Invalid station name."));
        }
});

app.use('/api', router);

var sockets = {};

// populate the stations and their media lists
stations.create();

var stationUtils = (function () {
    "use strict";

    var module = {
        sendPlay: (socket, station, mediaFilePath, startTime) => {

            // fetch all information we can get about this file
            mediaUtils.getMetaData( mediaFilePath, (err, metaData) => {

                metaData.startTime = startTime;

                util.log("<---out--- 'play' " + util.inspect(metaData));

                // send the play command back to the originator
                socket.emit("play", metaData);

                // broadcast the play to the rest of the room
                socket.broadcast.to(station.name).emit("play", metaData);
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
        var filePath;
        var selectedStation = stations.getStationByName(playInfo.name);
        assert(selectedStation);

        stations.play(selectedStation);
        assert(selectedStation.playing);

        filePath = selectedStation.playing.path;

        stationUtils.joinStation(socket, selectedStation);
        stationUtils.sendPlay(socket, selectedStation, filePath, selectedStation.currentTime);
    });

    socket.on("next", (nextInfo) => {
        util.log("---in---> 'next' " + util.inspect(nextInfo));
        var filePath;

        var selectedStation = stations.getStationByName(nextInfo.name);
        assert(selectedStation);

        stations.next(selectedStation);
        assert(selectedStation.playing);

        filePath = selectedStation.playing.path;
        assert(selectedStation.playing);
        stationUtils.sendPlay(socket, selectedStation, filePath, 0);
    });

    socket.on("reportProgress", (progressInfo) => {
        //console.log("reportProgress " + progressInfo.progress);

        if(socket.activeStationName) {
            var selectedStation = stations.getStationByName(socket.activeStationName);
            assert(selectedStation);

            stations.updateTime(selectedStation, progressInfo.progress);
        }
    });

    socket.on("changeProgress", (progressInfo) => {
        if(socket.activeStationName) {
            var selectedStation = stations.getStationByName(socket.activeStationName);
            assert(selectedStation);

            stations.updateTime(selectedStation, progressInfo.progress);

            socket.broadcast.to(socket.activeStationName).emit("notifyChangeProgress", progressInfo);
        }
    });

    socket.on("command", (commandInfo) => {
        console.log("command " + commandInfo);

        assert(socket.activeStationName);
        if(socket.activeStationName) {
            //var selectedStation = stationUtils.getStationByName(socket.activeStationName);
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
            var selectedStation = stations.getStationByName(socket.activeStationName);
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

/*
process.on('uncaughtException', (err) => {
    "use strict";
    // handle the error safely
    console.log("Uncaught exception, err: " + util.inspect(err));
});
*/
