const util = require("util");
const assert = require("assert");
const fs = require("fs");

const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 3000;

const staticRoot = "./static";

const stations = require("./station").stations(staticRoot);
const userStore = require("./userStore").userStore();
const mediaUtils = require("./mediaUtils").mediaUtils(staticRoot);

app.use(express.static('static'));
app.use(express.static('js'));

// for bootstrap
app.use("/dist/css", express.static('dist/css'));
app.use("/dist/fonts", express.static('dist/fonts'));
app.use("/dist/js", express.static('dist/js'));
app.use("/assets/js", express.static('assets/js'));
app.use("/assets/css", express.static('assets/css'));

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

const router = express.Router();

// TODO-AG: use the APIs below for station retrieval instead of a socket message.
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
        let stationName = req.params.name;

        if(stationName) {
            console.log("GET " + req.originalUrl);
            let selectedStation = stations.getStationByName(req.params.name);
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
stations.createStationList();

const stationUtils = (function () {
    "use strict";

    const context = {
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

                let station = stations.getStationByName(socket.activeStationName);

                // TODO::AG-this logic should be moved to the station
                if(station) {
                    let batonHolder = station.holder;
                    if(batonHolder) {
                        // check if the user who is leaving was the baton holder; if so, assign a new one
                        if(batonHolder.socketId === socket.id) {

                            // the next user in the list should be assigned
                            let newBatonHolder = userStore.userList[0];
                            station.holder = newBatonHolder;
                            sockets[newBatonHolder.socketId].emit("giveBaton", { baton: true });
                        }
                    }
                }

                // notify other that user has left
                let notificationMsg = socket.username + " has left the channel.";

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
            context.leaveStation(socket);

            // join the channel associated with that station
            socket.join(station.name);
            socket.activeStationName = station.name;

            // TODO::AG-This should be moved to the station
            if(station) {
                // check if the baton has been assigned
                let batonHolder = station.holder;
                if(!batonHolder) {
                    let batonInfo = {
                        baton: true
                    };

                    station.holder = userStore.findUserById(socket.id);

                    util.log("<---out--- 'giveBaton' " + util.inspect(batonInfo));
                    socket.emit("giveBaton", batonInfo);
                }
            }

            // send the joined notification
            let notificationMsg = socket.username + " has joined the channel.";
            let notificationInfo = {
                msg: notificationMsg
            };

            util.log("<---broadcast--- 'notification' " + util.inspect(notificationInfo));
            socket.broadcast.to(socket.activeStationName).emit("notification", notificationInfo);
        }
    };

    return context;
}());

io.on('connection', (socket) => {
    "use strict";

    console.log('a user connected');

    sockets[socket.id] = socket;

    socket.on("login", (loginInfo) => {
        let response;
        util.log("---in---> 'login' " + util.inspect(loginInfo));

        response = {
            stationList: stations.stationsList
        };

        socket.username = loginInfo.username;

        let user = userStore.CreateUser(socket.id, loginInfo.username);
        userStore.addUser(user);

        util.log("<---out--- 'stations' " + util.inspect(response));
        socket.emit("stations", response);
    });

    socket.on("playStation", (playInfo) => {
        util.log("---in---> 'playStation' " + util.inspect(playInfo));
        let filePath;
        let station = stations.getStationByName(playInfo.name);
        assert(station);

        station.play();
        assert(station.playing);
        filePath = station.playing.path;

        stationUtils.joinStation(socket, station);
        stationUtils.sendPlay(socket, station, filePath, station.currentTime);
    });

    socket.on("next", (nextInfo) => {
        util.log("---in---> 'next' " + util.inspect(nextInfo));
        let filePath;
        let station = stations.getStationByName(nextInfo.name);
        assert(station);

        station.next();
        assert(station.playing);

        filePath = station.playing.path;

        stationUtils.sendPlay(socket, station, filePath, 0);
    });

    socket.on("reportProgress", (progressInfo) => {
        //util.log("---in---> 'reportProgress' " + util.inspect(progressInfo)); // this is spam-y

        if(socket.activeStationName) {
            let station = stations.getStationByName(socket.activeStationName);
            assert(station);

            station.updateTime(progressInfo.progress);
        }
    });

    socket.on("changeProgress", (progressInfo) => {
        util.log("---in---> 'changeProgress' " + util.inspect(progressInfo));
        if(socket.activeStationName) {
            let station = stations.getStationByName(socket.activeStationName);
            assert(station);

            station.updateTime(progressInfo.progress);

            util.log("<---broadcast--- 'notifyChangeProgress' " + util.inspect(progressInfo));
            socket.broadcast.to(socket.activeStationName).emit("notifyChangeProgress", progressInfo);
        }
    });

    socket.on("command", (commandInfo) => {
        util.log("---in---> 'command' " + util.inspect(commandInfo));

        assert(socket.activeStationName);
        if(socket.activeStationName) {
            util.log("<---broadcast--- 'notifyCommand' " + util.inspect(commandInfo));
            socket.broadcast.to(socket.activeStationName).emit("notifyCommand", commandInfo);
        }
    });

    socket.on("sendChat", (chatInfo) => {
        util.log("---in---> 'sendChat' " + util.inspect(chatInfo));

        assert(chatInfo.username);
        assert(chatInfo.station);

        util.log("<---broadcast--- 'receiveChat' " + util.inspect(chatInfo));
        socket.broadcast.to(chatInfo.station).emit("receiveChat", chatInfo);
    });

    socket.on("error", (err) => {
        util.log(err);
    });

    socket.on('disconnect', () => {
        util.log('connection dropped');

        if(socket.activeStationName) {
            let station = stations.getStationByName(socket.activeStationName);
            assert(station);

            // leave the station
            stationUtils.leaveStation(socket, station);
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
