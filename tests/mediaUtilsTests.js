const util = require("util");

const mediaUtils = require("../mediaUtils").mediaUtils();

module.exports = {
    setUp: function (callback) {
        callback();
    },
    tearDown: function (callback) {
        callback();
    },
    userStoreTests_imageTest: function(test) {
        "use strict";

        //test.expect(1);
        test.ok(mediaUtils, "The module was found.");

        var testMediaInfo = {};

        var testFilePath = "../static/stations/creative-commons-media/space.jpg";

        mediaUtils.determineFiletype(testFilePath, testMediaInfo, (err, mediaInfo, fileType) => {

            test.ok(mediaInfo.mime, "determineFiletype did not work. mimeType is null.");
            test.ok(mediaUtils.isImage(mediaInfo.mime), "isImage did not work.")

            test.done();
        });
    },
    userStoreTests_video: function(test) {
        "use strict";

        //test.expect(1);
        test.ok(mediaUtils, "The module was found.");

        var testMediaInfo = {};

        var testFilePath = "../static/stations/creative-commons-media/bacteria_friend_and_foe_512kb.mp4";

        mediaUtils.determineFiletype(testFilePath, testMediaInfo, (err, mediaInfo, fileType) => {

            test.ok(mediaInfo.mime, "determineFiletype did not work. mimeType is null.");
            test.ok(mediaUtils.isVideo(mediaInfo.mime), "isVideo did not work.")

            test.done();
        });
    },
    userStoreTests_audio: function(test) {
        "use strict";

        //test.expect(1);
        test.ok(mediaUtils, "The module was found.");

        var testMediaInfo = {};

        var testFilePath = "../static/stations/creative-commons-media/hdaudioplus.com056b.Steppenwolf-BornToBeWildhdRemaster.mp3";

        mediaUtils.determineFiletype(testFilePath, testMediaInfo, (err, mediaInfo, fileType) => {

            test.ok(mediaInfo.mime, "determineFiletype did not work. mimeType is null.");
            test.ok(mediaUtils.isAudio(mediaInfo.mime), "isAudio did not work.")

            test.done();
        });
    },
    userStoreTests_readMediaTags: function(test) {
        "use strict";

        //test.expect(1);
        test.ok(mediaUtils, "The module was found.");

        var testMediaInfo = {};

        var testFilePath = "../static/stations/creative-commons-media/hdaudioplus.com056b.Steppenwolf-BornToBeWildhdRemaster.mp3";

        mediaUtils.readMediaTags(testFilePath, testMediaInfo, (err, mediaInfo, tags) => {

            test.equal(mediaInfo.artist, "Steppenwolf", "readMediaTags did not work.");
            //test.ok(mediaUtils.isAudio(mediaInfo.mime), "isAudio did not work.")

            test.done();
        });
    },
    userStoreTests_getMetaData: function(test) {
        "use strict";

        //test.expect(1);
        test.ok(mediaUtils, "The module was found.");

        var testMediaInfo = {};

        var testFilePath = "../static/stations/creative-commons-media/hdaudioplus.com056b.Steppenwolf-BornToBeWildhdRemaster.mp3";

        mediaUtils.getMetaData(testFilePath, (err, mediaInfo) => {

            test.equal(mediaInfo.artist, "Steppenwolf", "getMetaData did not work.");
            test.equal(mediaInfo.ext, "mp3", "getMetaData did not work.");
            test.equal(mediaInfo.mime, "audio/mpeg", "getMetaData did not work.");
            test.equal(mediaInfo.title, "Born To Be Wild {HD+ Remaster}", "getMetaData did not work.");

            test.done();
        });
    }
};
