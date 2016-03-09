var util = require("util");
var fs = require("fs");
var express = require('express');
var app = express();

var id3 = require('./id3').id3Tags();
var lyricModule = require('./lyrics').lyrics();

var http = require('http').Server(app);
var io = require('socket.io')(http);

var ss = require('socket.io-stream');
//var path = require('path');

app.use(express.static('static'));
app.use(express.static('js'));


function getSongMetaData(filepath, callback) {
    var songMetaData = {
        name: filepath
    };

    id3.getTag(filepath, function (err, tags) {

        if(err) {
            return callback(err, songMetaData);
        }

        songMetaData.title = tags.title;
        songMetaData.artist = tags.artist;
        songMetaData.album = tags.album;

        //console.log("tags: " + util.inspect(tags));

        lyricModule.get(tags.artist, tags.title, function (err, lyricInfo) {

            if(err) {
                return callback(err, songMetaData);
            }

            songMetaData.lyrics = lyricInfo.lyrics;
            songMetaData.coverUrl = lyricInfo.coverUrl;

            //util.log(lyricInfo);

            return callback(null, songMetaData);
        });
    });
}



io.on('connection', function(socket){
    var streamingSocket = ss(socket);

    console.log('a user connected');

    var filepath = "./static/";
    var filename = "indie-rock.mp3";

    var fullpath = filepath + filename;

    util.log(id3);

    getSongMetaData(fullpath, function (err, songMetaData) {

        //util.log(songMetaData);

        var stream = ss.createStream();

        streamingSocket.emit('music-stream', stream, songMetaData);

        fs.createReadStream(fullpath).pipe(stream);

        socket.on('disconnect', function () {
            console.log('connection dropped');
        });
    });
});


http.listen(3000, function(){
    console.log('listening on *:3000');
});
