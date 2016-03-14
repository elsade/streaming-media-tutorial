
var socket = io(); // jshint ignore:line

var startTime = 0, username, currentStationName;
var audio;

/**
 * Handle user login
 */
var login = (function () {
    "use strict";
    var loginModule = {
        load: function () {
            // the hide/show methods don't work until the DOM has been populated
            $(document).ready( function () {
                loginModule.show();

                stationsMenu.hide();
                player.hide();
                chat.hide();

                $("#login-form").submit( function (event) {
                    event.preventDefault();
                    return loginModule.submit(event);
                });
            });
        },
        show: function () {
            $("#login").show();
        },
        hide: function () {
            $("#login").hide();
        },
        submit: function submitName() {
            var $name = $("#username");
            username = $name.val().trim();

            if(username) {
                socket.emit("login", {
                    username: username
                });

                $("#welcome").html(username + ", please choose a station:");
            }
            else {
                $name.focus();
            }

            return false;   // don't submit the form
        }
    };

    return loginModule;
}());

/**
 * Handle the display, creation, and station menu functionality
 */
var stationsMenu = (function () {
    "use strict";

    var stationMenuModule = {
        show: function () {
            $("#station-block").show();
        },
        hide: function () {
            $("#station-block").hide();
        },
        populate: function populateStationList(stations) {
            stations.stationList.map(function (station, index) {
                $("#station-list").append("<li><a href='#' class='station-links' id='"+ station.name + "'>" + station.name + "</a></li>");

                var listName = "#" + station.name;
                var listElement = $(listName);
                listElement.val(station.name);
                listElement.html(station.name);
                listElement.click(function () {
                    stationMenuModule.onStationClick(station.name);
                });
            });
        },
        onStationClick: function onStationClick(stationName) {
            currentStationName = stationName;

            socket.emit("playStation", {
                name: stationName
            });

            chat.show();

            chat.addNotification("You have joined the '" + stationName + "' channel.");
        }
    };
    return stationMenuModule;
}());

/**
 * Control the display and functionality related to music player.
 */
var player = (function () {
    "use strict";

    var playerModule = {
        baton: false,
        progressDrag: false,
        init: function () {
            playerModule.addPlayerEventHandlers();
        },
        show: function () {
            $("#player").show();
            $("#lyrics_block").show();
        },
        hide: function () {
            $("#player").hide();
            $("#lyrics_block").hide();
        },
        timeUpdate: function () {
            var currentProgress = audio.currentTime/audio.duration;
            //console.log("timeUpdate audio.currentTime " + audio.currentTime);
            //console.log("timeUpdate audio.duration " + audio.duration);
            var progress = $("#progress");
            if(!playerModule.progressDrag) {
                progress.val(currentProgress);

                // report the progress if we have the baton
                if(playerModule.baton) {
                    playerModule.reportProgressToServer({
                        progress: currentProgress
                    });
                }
            }
        },
        setProgressBar: function (newValue) {
            var progress = $("#progress");
            //console.log("Setting the progress bar to " + newValue);
            progress.val(newValue);
        },
        reportProgressToServer: function (progressInfo) {
            socket.emit("reportProgress", progressInfo);
        },
        changeProgressOnServer: function (progressInfo) {
            socket.emit("changeProgress", progressInfo);
        },
        overrideProgress: function (newValue) {
            //console.log("Setting audio.currentTime to " + newValue);
            audio.currentTime = audio.duration * newValue;
        },
        onProgressNotification: function (newValue) {
            playerModule.setProgressBar(newValue);
            playerModule.overrideProgress(newValue);
        },
        changeProgress: function (event) {
            var progress = $("#progress");
            var currentProgress = progress.val();
            if(playerModule.progressDrag) {

                if(Number.isFinite(audio.duration)) {

                    playerModule.overrideProgress(currentProgress);

                    //audio.currentTime = audio.duration * currentProgress;

                    playerModule.changeProgressOnServer({
                        progress: currentProgress
                    });
                }
                else {
                    console.log("changeProgress: error, the current duration is " + audio.duration );
                }
            }
        },
        addProgressEventHandlers: function () {
            var progress = $("#progress");

            progress.click(function (event) {
                playerModule.progressDrag = true;
                playerModule.changeProgress(event);
                playerModule.progressDrag = false;
            });

            progress.mousedown(function (event) {
                playerModule.progressDrag = true;
                playerModule.changeProgress(event);
            });

            progress.mousemove(function (event) {
                playerModule.changeProgress(event);
            });

            progress.mouseup(function (event) {
                playerModule.progressDrag = false;
            });
        },
        addVolumeEventHandlers: function () {
            $("#volume").change(function () {
                playerModule.setVolume();
            });
        },
        addButtonEventHandlers: function () {
            $("#play-pause").click(function () {
                playerModule.togglePlayPause();

                var command = (audio.paused)? "pause":"play";
                playerModule.sendCommandToServer(command, audio.paused);
            });

            $("#mute-unmute").click(function () {
                playerModule.toggleMuteUnmute();
            });

            $("#stop").click(function () {
                playerModule.commandStop();
                playerModule.sendCommandToServer("stop", false);
            });

            $("#next").click(function () {
                playerModule.nextButtonClick();
            });
        },
        commandStop: function () {
            audio.pause();
            $("#play-pause-icon").text("play_arrow");
        },
        nextSong: function () {
            socket.emit("nextSong", { name: currentStationName});
        },
        nextButtonClick: function () {
            playerModule.nextSong();
        },
        sendCommandToServer: function (command, playing) {
            socket.emit("playerCommand", {
                command: command,
                playing: playing
            });
        },
        commandPlay: function () {
            var pausePlay = $("#play-pause-icon");
            if(audio) {
                if(audio.paused) {
                    audio.play();
                    pausePlay.text("pause");
                }
            }
        },
        commandPause: function () {
            var pausePlay = $("#play-pause-icon");

            if(audio) {
                if(!audio.paused) {
                    audio.pause();
                    pausePlay.text("play_arrow");
                }
            }
        },
        togglePlayPause: function togglePlayPause() {
            var pausePlay = $("#play-pause-icon");

            if(audio) {
                if(audio.paused) {
                    audio.play();
                    pausePlay.text("pause");
                }
                else {
                    audio.pause();
                    pausePlay.text("play_arrow");
                }
            }
        },
        toggleMuteUnmute: function toggleMuteUnmute() {
            var muteUnmute = $("#mute-unmute-icon");

            if(audio) {
                if(audio.muted) {
                    muteUnmute.text("volume_off");
                }
                else {
                    muteUnmute.text("volume_up");
                }

                audio.muted = !audio.muted;
            }
        },
        addPlayerEventHandlers: function () {
            playerModule.addButtonEventHandlers();
            playerModule.addProgressEventHandlers();
            playerModule.addVolumeEventHandlers();
        },
        setVolume: function (value) {
            var newVolume;

            var volume = $("#volume");

            // use either the provided value or get it from the UI
            newVolume = value || volume.val();

            audio.volume = newVolume;

            if(value) {
                volume.val(newVolume);
            }
        }
    };

    return playerModule;
}());

/**
 * Handle chat functionality
 */
var chat = (function () {
    "use strict";

    var chatModule = {
        init: function () {
            $("#chat-form").submit( function (event) {
                return chatModule.chatFormSubmit(event);
            });
        },
        chatFormSubmit: function (event) {
            var chatMessage = chatModule.getChatInput();
            chatModule.sendChat(chatMessage);

            return false;   // prevent the form from submitting
        },
        clearChatInput: function () {
            return $("#chat-input").val("");
        },
        show: function () {
            $("#chat-block").show();
        },
        hide: function () {
            $("#chat-block").hide();
        },
        appendToChat: function (message) {
            var chatListItemHTML = "<li class='chat-element'>" + message +"</li>";
            $("#chat-list").append(chatListItemHTML);
        },
        addNotification: function (message) {
            //console.log("chat adding notification: " + message);
            chatModule.appendToChat(message);
        },
        sendChat: function (message) {
            chatModule.addNotification("You: " + message);

            // send the message to the room
            socket.emit("sendChat", {
                username: username,
                station: currentStationName,
                msg: message
            });

            chatModule.clearChatInput();
        },
        getChatInput: function () {
            return $("#chat-input").val();
        }
    };

    return chatModule;

}());

/**
 * Register all client-side socket event handlers
 */
var registerSocketEventHandlers = (function() {
    "use strict";

    socket.on('stations', function (stations) {
        $("#login").hide();

        stationsMenu.populate(stations);

        $("#station-block").show();
    });

    socket.on("receiveChat", function (chatInfo) {
        chat.appendToChat(chatInfo.username + ": " + chatInfo.msg);
    });

    socket.on("notification", function (chatInfo) {
        chat.addNotification(chatInfo.msg);
    });

    socket.on("giveBaton", function (batonInfo) {
        //console.log("Given baton.");
        player.baton = batonInfo.baton;
    });

    socket.on("notifyChangeProgress", function (progressInfo) {
        //console.log("notifyChangeProgress " + progressInfo.progress);
        player.onProgressNotification(progressInfo.progress);
    });

    socket.on("notifyCommand", function (commandInfo) {
        if(commandInfo.command === "play") {
            player.commandPlay();
        }
        else if(commandInfo.command === "pause") {
            player.commandPause();
        }
        else if(commandInfo.command === "stop") {
            player.commandStop();
        }
    });

    socket.on('playSong', function (songInfo) {
        if(audio) {
            audio.src = songInfo.path;
            audio.load();
        }
        else {
            initializeAudioPlayer(songInfo.path);
            audio.src = songInfo.path;
        }

        var $title = $("#title");
        if(songInfo.title) {
            $title.html("Song: " + songInfo.title);
            $title.show();
        }
        else {
            $title.hide();
        }


        var $album = $("#album");
        if(songInfo.album) {
            $album.html("Album: " + songInfo.album);
            $album.show();
        }
        else {
            $album.hide();
        }

        var $artist = $("#artist");
        if(songInfo.artist) {
            $artist.html("Artist/Band: " + songInfo.artist);
            $artist.show();
        }
        else {
            $artist.hide();
        }

        if(songInfo.lyrics) {
            $("#lyrics_block").show();
            $("#lyrics").html(songInfo.lyrics);
        }
        else {
            $("#lyrics_block").hide();
        }

        if(songInfo.coverUrl) {
            $("#cover").attr("src", songInfo.coverUrl);
        }
        else {
            $("#cover").attr("src", "placeholder.jpeg");
        }

        audio.play();

        startTime = songInfo.startTime;
    });
}());

/**
 * Create and begin the actual audio playback
 */
function initializeAudioPlayer() {
    "use strict";
    audio = new Audio();
    audio.loop = false;

    player.init();

    player.setVolume(0.8);

    chat.init();

    audio.addEventListener("ended", function () {
        player.nextSong();
    });

    audio.addEventListener("timeupdate", function () {
        player.timeUpdate();
    });

    audio.addEventListener("canplay", function () {
        if(startTime > 0) {
            player.overrideProgress(startTime);
            startTime = 0;
        }
    });

    audio.addEventListener("error", function () {
        var err = audio.error;
        console.log("An error occurred during audio playback. err " + err);
    });

    player.show();
}

window.onload = login.load();
