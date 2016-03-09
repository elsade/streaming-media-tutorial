var util = require("util");
var restify = require('restify');
var assert = require('assert');
var parseString = require('xml2js').parseString;

// http://api.chartlyrics.com/apiv1.asmx/SearchLyricDirect?artist=michael%20jackson&song=bad

var lyrics = function() {

    var host = "http://api.chartlyrics.com";

    var client = restify.createStringClient({
        url: host
    });

    var module = {
        client: client,
        createLyricResults: function (apiResult) {
            var results = {};

            if(apiResult && apiResult.GetLyricResult) {

                if(apiResult.GetLyricResult.LyricCovertArtUrl) {
                    results.coverUrl = apiResult.GetLyricResult.LyricCovertArtUrl[0];
                }

                if(apiResult.GetLyricResult.Lyric) {
                    results.lyrics = apiResult.GetLyricResult.Lyric[0].replace(/\r\n/g, '<br>');
                }
            }

            return results;
        },
        get: function getLyrics(artist, title, callback) {
            var completePath;
            var lyricResults;
            console.log("getLyrics() artist " + artist + " title " + title + ".");

            var encodedArtist = encodeURI(artist);
            var encodedTitle = encodeURI(title);

            completePath =  "/apiv1.asmx/SearchLyricDirect?artist=" + encodedArtist + "&song=" + encodedTitle;

            console.log("lyrics get: complete path '" + completePath + "'.");

            module.client.get(completePath, function(err, req, res, data) {

                if(err) {
                    assert.ifError(err);
                    return callback(err, {});
                }

                return parseString(data, function (err, result) {
                    if(err) {
                        assert.ifError(err);
                        return callback(err, {});
                    }

                    //util.log(result);

                    lyricResults = module.createLyricResults(result);

                    util.log(lyricResults);

                    return callback(null, lyricResults);
                });
            });
        }
    };

    return module;
};

module.exports.lyrics = lyrics;

/*

var testLyricModule = lyrics();

testLyricModule.get("michael jackson", "bad", function (err, results) {
    util.log(results);
});

*/