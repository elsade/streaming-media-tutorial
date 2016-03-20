
var socket = io(); // jshint ignore:line

var username, currentStationName;
var mediaType;
//var audio;

/**
 * Handle user login
 */
var login = (function () {
    "use strict";
    var context = {
        load: function () {
            // the hide/show methods don't work until the DOM has been populated
            $(document).ready( function () {
                context.show();

                stationsMenu.hide();
                player.hide();
                chat.hide();

                $("#login-form").submit( function (event) {
                    event.preventDefault();
                    return context.submit(event);
                });

                $.ajax({
                    url: "http://127.0.0.1:3000/api/stations"
                }).then(function (stationList) {
                    console.log(stationList);
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

                //$("#welcome").html(username + ", please choose a station:");
            }
            else {
                $name.focus();
            }

            return false;   // don't submit the form
        }
    };

    return context;
}());

/**
 * Handle the display, creation, and station menu functionality
 */
var stationsMenu = (function () {
    "use strict";

    var context = {
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
                    context.onStationClick(station.name);
                });
            });
        },
        onStationClick: function onStationClick(stationName) {
            currentStationName = stationName;

            socket.emit("playStation", {
                name: stationName
            });

            $("#page-header").hide();

            chat.show();

            chat.addNotification("You have joined the '" + stationName + "' channel.");
        }
    };
    return context;
}());

/**
 * Control the display and functionality related to music player.
 */
var player = (function () {
    "use strict";

    var context = {
        mediaInterface: null,
        inited: false,
        baton: false,
        progressDrag: false,
        init: function (mediaInterface, src) {
            context.mediaInterface = mediaInterface;
            context.mediaInterface.init(src);

            // we only want to register the player event handler once
            if(!context.inited) {
                context.addPlayerEventHandlers();
                context.inited = true;
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
            var currentProgress = context.mediaInterface.getCurrentTime()/context.mediaInterface.getDuration();
            var progress = $("#progress");
            if(!context.progressDrag) {
                progress.val(currentProgress);

                // report the progress if we have the baton
                if(context.baton) {
                    context.reportProgressToServer({
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
            var duration = context.mediaInterface.getDuration();
            context.mediaInterface.setCurrentTime(duration * newValue);
        },
        onProgressNotification: function (newValue) {
            context.setProgressBar(newValue);
            context.overrideProgress(newValue);
        },
        changeProgress: function (event) {
            var progress = $("#progress");
            var currentProgress = progress.val();
            if(context.progressDrag) {

                if(Number.isFinite(context.mediaInterface.getDuration())) {

                    context.overrideProgress(currentProgress);

                    //media.currentTime = media.duration * currentProgress;

                    context.changeProgressOnServer({
                        progress: currentProgress
                    });
                }
                else {
                    console.log("changeProgress: error, the current duration is " + context.mediaInterface.getDuration() );
                }
            }
        },
        addProgressEventHandlers: function () {
            var progress = $("#progress");

            progress.click(function (event) {
                context.progressDrag = true;
                context.changeProgress(event);
                context.progressDrag = false;
            });

            progress.mousedown(function (event) {
                context.progressDrag = true;
                context.changeProgress(event);
            });

            progress.mousemove(function (event) {
                context.changeProgress(event);
            });

            progress.mouseup(function (event) {
                context.progressDrag = false;
            });
        },
        addVolumeEventHandlers: function () {
            $("#volume").change(function () {
                context.setVolume();
            });
        },
        addButtonEventHandlers: function () {
            $("#play-pause").off('click').on('click', function () {
                context.togglePlayPause();

                var paused = context.mediaInterface.isPaused();

                var command = (paused)? "pause":"play";
                context.sendCommandToServer(command, paused);
            });

            $("#mute-unmute").off('click').on('click', function () {
                context.toggleMuteUnmute();
            });

            $("#stop").off('click').on('click', function () {
                context.commandStop();
                context.sendCommandToServer("stop", false);
            });

            $("#next").off('click').on('click', function () {
                context.nextButtonClick();
            });
        },
        commandStop: function () {
            context.mediaInterface.pause();
            $("#play-pause-icon").text("play_arrow");
        },
        next: function () {
            console.log("Sending next to server.");
            socket.emit("next", { name: currentStationName});
        },
        nextButtonClick: function () {
            console.log("nextButtonClick");
            context.next();
        },
        sendCommandToServer: function (command, playing) {
            socket.emit("command", {
                command: command,
                playing: playing
            });
        },
        commandPlay: function () {
            var pausePlay = $("#play-pause-icon");

            context.mediaInterface.play();
            pausePlay.text("pause");
        },
        commandPause: function () {
            var pausePlay = $("#play-pause-icon");

            context.mediaInterface.pause();
            pausePlay.text("play_arrow");
        },
        setPauseIcon: function () {
            var iconText = "play_arrow";
            var pausePlay = $("#play-pause-icon");

            if(!context.mediaInterface.isPaused()) {
                iconText = "pause";
            }

            pausePlay.text(iconText);
        },
        togglePlayPause: function togglePlayPause() {

            if(context.mediaInterface.isPaused()) {
                context.mediaInterface.play();
            }
            else {
                context.mediaInterface.pause();
            }

            context.setPauseIcon();
        },
        setMuteUnmuteIcon: function () {
            $("#mute-unmute-icon").text(context.mediaInterface.isMuted()?"volume_off":"volume_up");
        },
        toggleMuteUnmute: function toggleMuteUnmute() {
            var muted = context.mediaInterface.isMuted();
            if(muted) {
                context.mediaInterface.unmute();
            }
            else {
                context.mediaInterface.mute();
            }

            context.setMuteUnmuteIcon();
        },
        addPlayerEventHandlers: function () {
            context.addButtonEventHandlers();
            context.addProgressEventHandlers();
            context.addVolumeEventHandlers();
        },
        setVolume: function (value) {
            var volume = $("#volume");
            var newVolume = value || volume.val(); // use either the provided value or get it from the UI

            context.mediaInterface.setVolume(newVolume);

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

            if(context.mediaInterface) {
                context.mediaInterface.stop();
            }

            player.hideAudio();

            initializePlayer(mediaInfo.src, "video");

            player.showVideo();

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

            context.mediaInterface.play();
            context.mediaInterface.setStartTime(mediaInfo.startTime);
        },

        playAudio: function (mediaInfo) {

            if(context.mediaInterface) {
                context.mediaInterface.stop();
            }

            player.hideVideo();

            initializePlayer(mediaInfo.src, "audio");

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

            context.mediaInterface.play();
            context.mediaInterface.setStartTime(mediaInfo.startTime);
        }
    };

    return context;
}());

/**
 * Handle chat functionality
 */
var chat = (function () {
    "use strict";

    var context = {
        inited: false,
        init: function () {
            if(!context.inited) {
                $("#chat-form").submit( function (event) {
                    console.log("Registering chat submit handler.");
                    return context.chatFormSubmit(event);
                });

                $("#btn-chat").click( function (event) {
                    return context.chatFormSubmit(event);
                });

                context.inited = true;
            }
        },
        chatFormSubmit: function (event) {
            var chatMessage = context.getChatInput();

            if(chatMessage) {
                context.sendChat(chatMessage);
            }

            return false;   // prevent the form from submitting
        },
        clearChatInput: function () {
            return $("#btn-input").val("");
        },
        show: function () {
            $("#chat-header").show();
            $("#chat-block").show();
        },
        hide: function () {
            $("#chat-header").hide();
            $("#chat-block").hide();
        },
        appendToChat: function (message) {
            var chatListItemHTML = "<li class='chat-element left clearfix'>" + message +"</li>";
            //var chatListItemHTML = "<li class='chat-element'>" + message +"</li>";
            $("#chat-list").append(chatListItemHTML);
        },
        addNotification: function (message) {
            //console.log("chat adding notification: " + message);
            context.appendToChat(message);
        },
        sendChat: function (message) {
            context.addNotification("You: " + message);

            // send the message to the room
            socket.emit("sendChat", {
                username: username,
                station: currentStationName,
                msg: message
            });

            context.clearChatInput();
        },
        getChatInput: function () {
            return $("#btn-input").val();
        }
    };

    return context;

}());

/**
 * Register all client-side socket event handlers
 */
var registerSocketEventHandlers = (function() {
    "use strict";

    socket.on('stations', function (stations) {
        $("#login").hide();

        stationsMenu.populate(stations);

        $("#media-block").show();
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

        if(mediaType === "audio") {
            player.playAudio(mediaInfo);
        }
        else if(mediaType === "video") {
            player.playVideo(mediaInfo);
        }
        else {
            console.log("Error, unhandled mimetype, mediaInfo ", mediaInfo);
        }
    });
}());

/**
 * Create and begin the actual playback
 */
function initializePlayer(src, type) {
    "use strict";

    if(type === "audio") {
        player.init(audioInterface, src);
    }
    else if(type === "video") {
        player.init(videoInterface, src);
    }

    player.setVolume(0.8);
    chat.init();
    player.show();
}

var audioInterface = (function AudioInterface() {
    "use strict";
    var context = {
        audio: null,
        startTime: 0,
        inited: false,
        init: function (src) {

            if(!context.inited) {
                context.audio = new Audio();
                context.audio.loop = false;

                console.log("registering audio event handlers.");

                context.audio.addEventListener("ended", function () {
                    console.log("audio 'ended'");
                    player.next();
                });

                context.audio.addEventListener("timeupdate", function () {
                    player.timeUpdate();
                });

                context.audio.addEventListener("canplay", function () {
                    console.log("audio 'canplay'");
                    if(context.startTime > 0) {
                        player.overrideProgress(context.startTime);
                        context.startTime = 0;
                    }
                });

                context.audio.addEventListener("error", function () {
                    console.log("audio 'error'");
                    var err = context.audio.error;
                    console.log("An error occurred during audio playback. err " + err);
                });

                context.inited = true;
            }

            context.audio.src = src;
            context.load();
        },
        setStartTime: function (startTime) {
            context.startTime = startTime;
        },
        play: function() {
            context.audio.play();
        },
        stop: function () {
            if(context.audio && context.audio.paused === false) {
                context.pause();
            }
        },
        pause: function () {
            if(context.isPaused() === false) {
                context.audio.pause();
            }
        },
        isPaused: function () {
            return context.audio.paused;
        },
        load: function () {
            context.audio.load();
        },
        isMuted: function () {
            return context.audio.muted;
        },
        mute: function () {
            if(context.isMuted() === false) {
                context.audio.muted = true;
            }
        },
        unmute: function () {
            if(context.isMuted()) {
                context.audio.muted = false;
            }
        },
        setVolume: function (newValue) {
            context.audio.volume = newValue;
        },
        getDuration: function () {
            return context.audio.duration;
        },
        getCurrentTime: function () {
            return context.audio.currentTime;
        },
        setCurrentTime: function (newValue) {
            context.audio.currentTime = newValue;
        }
    };

    return context;
}());


var videoInterface = (function AudioInterface() {
    "use strict";
    var context = {
        video: null,
        startTime: 0,
        inited: false,
        init: function (src) {

            if(!context.inited) {
                context.video = document.getElementById("video");
                context.video.loop = false;

                console.log("registering video event handlers.");

                context.video.addEventListener("ended", function () {
                    console.log("video 'ended'");
                    player.next();
                });

                context.video.addEventListener("timeupdate", function () {
                    player.timeUpdate();
                });

                context.video.addEventListener("canplay", function () {
                    console.log("video 'canplay'");
                    if(context.startTime > 0) {
                        player.overrideProgress(context.startTime);
                        context.startTime = 0;
                    }
                });

                context.video.addEventListener("error", function () {
                    console.log("video 'error'");
                    var err = context.video.error;
                    console.log("An error occurred during video playback. err " + err);
                });

                context.inited = true;
            }

            context.video.src = src;
            context.load();
        },
        setStartTime: function (startTime) {
            context.startTime = startTime;
        },
        play: function() {
            context.video.play();
        },
        stop: function () {
            if(context.video && context.video.paused === false) {
                context.pause();
            }
        },
        pause: function () {
            if(context.isPaused() === false) {
                context.video.pause();
            }
        },
        isPaused: function () {
            return context.video.paused;
        },
        load: function () {
            context.video.load();
        },
        isMuted: function () {
            return context.video.muted;
        },
        mute: function () {
            if(context.isMuted() === false) {
                context.video.muted = true;
            }
        },
        unmute: function () {
            if(context.isMuted()) {
                context.video.muted = false;
            }
        },
        setVolume: function (newValue) {
            context.video.volume = newValue;
        },
        getDuration: function () {
            return context.video.duration;
        },
        getCurrentTime: function () {
            return context.video.currentTime;
        },
        setCurrentTime: function (newValue) {
            context.video.currentTime = newValue;
        }
    };

    return context;
}());


window.onload = login.load();
