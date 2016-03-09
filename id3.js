var util = require("util");
var id3 = require('id3js');

var id3Tags = function() {
    var module = {
        read: function readIdTag(filename, callback) {
            console.log("readIdTag: filename " + filename);

            id3({
                file: filename,
                type: id3.OPEN_LOCAL
            }, function(err, tags) {
                console.log("tags: tags " + tags);

                callback(err, tags);
            });
        },
        getTag: function getTag(filename, callback) {

            console.log("getTag: filename " + filename);

            return module.read(filename, function(err, tags) {
                if (err) {
                    return callback(err, null);
                }

                // trim trailing null characters
                return callback(null, {
                    title: tags.title.replace(/\0/g, ''),
                    artist: tags.artist.replace(/\0/g, ''),
                    album: tags.album.replace(/\0/g, '')
                });
            });
        }
    };

    return module;
}

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
