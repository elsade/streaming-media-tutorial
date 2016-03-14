var util = require("util");
var id3 = require('id3js');

var id3Tags = function(root) {
    "use strict";
    var module = {
        read: function readIdTag(filename, callback) {
            console.log("readIdTag: filename " + filename);

            id3({
                file: filename,
                type: id3.OPEN_LOCAL
            }, function(err, tags) {

                if(err) {
                    console.log("id3 read, err " + err);
                    return callback( new Error(err), {});
                }

                console.log("tags: tags " + util.inspect(tags, {depth: 3}));
                return callback( null, tags);
            });
        },
        getTag: function getTag(filename, callback) {

            var fullPath = root + filename;

            console.log("getTag: fullPath " + fullPath);

            return module.read(fullPath, function(err, tags) {
                if (err) {
                    return callback(err, null);
                }



                // trim trailing null characters
                return callback(null, {
                    title: tags.title ? tags.title.replace(/\0/g, ''):"",
                    artist: tags.artist? tags.artist.replace(/\0/g, ''):"",
                    album: tags.album?tags.album.replace(/\0/g, ''):""
                });
            });
        }
    };

    return module;
};

module.exports.id3Tags = id3Tags;

/*

var id3Module = id3Tags();


id3Module.getTag("./static/indie-rock.mp3", function(err, tag) {
    if(err){
        util.log(err);
    }
    util.log(tag);
});
*/
