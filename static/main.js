
var socket = io(); // jshint ignore:line

var startTime = 0, username, currentStationName;
var audio, video, media, mediaType;

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

                $.ajax({
                    url: "http://127.0.0.1:3000/api/stations"
                }).then(function (data) {
                    console.log(data);
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
        inited: false,
        baton: false,
        progressDrag: false,
        init: function () {
            // we only want to register the player event handler once
            if(!playerModule.inited) {
                playerModule.addPlayerEventHandlers();
            }
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
            var currentProgress = media.currentTime/media.duration;
            //console.log("timeUpdate media.currentTime " + media.currentTime);
            //console.log("timeUpdate media.duration " + media.duration);
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
            //console.log("Setting media.currentTime to " + newValue);
            media.currentTime = media.duration * newValue;
        },
        onProgressNotification: function (newValue) {
            playerModule.setProgressBar(newValue);
            playerModule.overrideProgress(newValue);
        },
        changeProgress: function (event) {
            var progress = $("#progress");
            var currentProgress = progress.val();
            if(playerModule.progressDrag) {

                if(Number.isFinite(media.duration)) {

                    playerModule.overrideProgress(currentProgress);

                    //media.currentTime = media.duration * currentProgress;

                    playerModule.changeProgressOnServer({
                        progress: currentProgress
                    });
                }
                else {
                    console.log("changeProgress: error, the current duration is " + media.duration );
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
            $("#play-pause").off('click').on('click', function () {
                playerModule.togglePlayPause();

                var command = (media.paused)? "pause":"play";
                playerModule.sendCommandToServer(command, media.paused);
            });

            $("#mute-unmute").off('click').on('click', function () {
                playerModule.toggleMuteUnmute();
            });

            $("#stop").off('click').on('click', function () {
                playerModule.commandStop();
                playerModule.sendCommandToServer("stop", false);
            });

            $("#next").off('click').on('click', function () {
                playerModule.nextButtonClick();
            });
        },
        commandStop: function () {
            media.pause();
            $("#play-pause-icon").text("play_arrow");
        },
        next: function () {
            console.log("Sending next to server.");
            socket.emit("next", { name: currentStationName});
        },
        nextButtonClick: function () {
            console.log("nextButtonClick");
            playerModule.next();
        },
        sendCommandToServer: function (command, playing) {
            socket.emit("command", {
                command: command,
                playing: playing
            });
        },
        commandPlay: function () {
            var pausePlay = $("#play-pause-icon");
            if(media) {
                if(media.paused) {
                    media.play();
                    pausePlay.text("pause");
                }
            }
        },
        commandPause: function () {
            var pausePlay = $("#play-pause-icon");

            if(media) {
                if(!media.paused) {
                    media.pause();
                    pausePlay.text("play_arrow");
                }
            }
        },
        togglePlayPause: function togglePlayPause() {
            var pausePlay = $("#play-pause-icon");

            if(media) {
                if(media.paused) {
                    media.play();
                    pausePlay.text("pause");
                }
                else {
                    media.pause();
                    pausePlay.text("play_arrow");
                }
            }
        },
        toggleMuteUnmute: function toggleMuteUnmute() {
            var muteUnmute = $("#mute-unmute-icon");

            if(media) {
                if(media.muted) {
                    muteUnmute.text("volume_off");
                }
                else {
                    muteUnmute.text("volume_up");
                }

                media.muted = !media.muted;
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

            if(media) {
                media.volume = newVolume;
            }

            if(value) {
                volume.val(newVolume);
            }
        },
        getMediaTypeFromExt: function (mediaInfo) {
            var mediaType = "audio";

            switch(mediaInfo.ext) {
                case "mp4":
                case "mov":
                    mediaType = "video";
                    break;
                case "mp3":
                    mediaType = "audio";
                    break;
                default:
                    console.log("getMediaTypeFromExt(), error, unknown ext ", mediaInfo);
                    break;
            }

            return mediaType;
        },
        showAudio: function () {
            console.log("show audio");
            $("#cover").show();
        },
        showVideo: function () {
            console.log("show video");
            $("#video").show();
        },
        hideAudio: function () {
            console.log("hide audio");
            $("#cover").hide();
        },
        hideVideo: function () {
            console.log("hide video");
            $("#video").hide();
        },
        playVideo: function (mediaInfo) {

            if(audio && !audio.paused) {
                audio.pause();
            }

            player.hideAudio();

            if(video) {
                video.pause();

                video.src = mediaInfo.src;
                video.load();

                player.showVideo();
            }
            else {
                initializeVideoPlayer(mediaInfo.src);

                player.showVideo();
            }

            media = (mediaType === "video")?video:audio;

            var $title = $("#title");
            if(mediaInfo.title) {
                $title.html("Title: " + mediaInfo.title);
                $title.show();
            }
            else {
                $title.hide();
            }

            var $album = $("#album");
            if(mediaInfo.album) {
                $album.html("Album: " + mediaInfo.album);
                $album.show();
            }
            else {
                $album.hide();
            }

            var $artist = $("#artist");
            if(mediaInfo.artist) {
                $artist.html("Artist/Band: " + mediaInfo.artist);
                $artist.show();
            }
            else {
                $artist.hide();
            }

            if(mediaInfo.lyrics) {
                $("#lyrics_block").show();
                $("#lyrics").html(mediaInfo.lyrics);
            }
            else {
                $("#lyrics_block").hide();
            }

            if(mediaInfo.coverUrl) {
                $("#cover").attr("src", mediaInfo.coverUrl);
            }
            else {
                $("#cover").attr("src", "placeholder.jpeg");
            }

            media.play();

            startTime = mediaInfo.startTime;
        },

        playAudio: function (mediaInfo) {

            if(video && !video.paused) {
                video.pause();
            }

            player.hideVideo();

            if(audio) {
                audio.pause();

                audio.src = mediaInfo.src;
                audio.load();
            }
            else {
                initializeAudioPlayer(mediaInfo.src);
                media = (mediaType === "video")?video:audio;
            }

            player.showAudio();

            var $title = $("#title");
            if(mediaInfo.title) {
                $title.html("Title: " + mediaInfo.title);
                $title.show();
            }
            else {
                $title.hide();
            }

            var $album = $("#album");
            if(mediaInfo.album) {
                $album.html("Album: " + mediaInfo.album);
                $album.show();
            }
            else {
                $album.hide();
            }

            var $artist = $("#artist");
            if(mediaInfo.artist) {
                $artist.html("Artist/Band: " + mediaInfo.artist);
                $artist.show();
            }
            else {
                $artist.hide();
            }

            if(mediaInfo.lyrics) {
                $("#lyrics_block").show();
                $("#lyrics").html(mediaInfo.lyrics);
            }
            else {
                $("#lyrics_block").hide();
            }

            if(mediaInfo.coverUrl) {
                $("#cover").attr("src", mediaInfo.coverUrl);
            }
            else {
                $("#cover").attr("src", "placeholder.jpeg");
            }

            media.play();

            startTime = mediaInfo.startTime;
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

    socket.on('play', function (mediaInfo) {

        console.log("---> play ", mediaInfo);

        if(mediaInfo.mime !== "unknown") {
            mediaType = mediaInfo.mime.match(/video/)?"video":"audio";
        }
        else {
            mediaType = player.getMediaTypeFromExt(mediaInfo.src);
        }

        if(mediaType === "video") {
            player.playVideo(mediaInfo);
            media = video;
        }
        else {
            player.playAudio(mediaInfo);
            media = audio;
        }
    });
}());

/**
 * Create and begin the actual audio playback
 */
function initializeAudioPlayer(src) {
    "use strict";
    audio = new Audio();
    audio.loop = false;

    audio.src = src;

    player.init();

    player.setVolume(0.8);

    chat.init();

    audio.addEventListener("ended", function () {
        console.log("Audio ended.");
        player.next();
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


/**
 * Create and begin the actual audio playback
 */
function initializeVideoPlayer(src) {
    "use strict";
    video = document.getElementById("video");
    video.loop = false;

    video.src = src;

    player.init();

    player.setVolume(0.8);

    chat.init();

    video.addEventListener("ended", function () {
        console.log("video ended.");
        player.next();
    });

    video.addEventListener("timeupdate", function () {
        player.timeUpdate();
    });

    video.addEventListener("canplay", function () {
        if(startTime > 0) {
            player.overrideProgress(startTime);
            startTime = 0;
        }
    });

    video.addEventListener("error", function () {
        var err = audio.error;
        console.log("An error occurred during audio playback. err " + err);
    });

    player.show();
}


window.onload = login.load();
