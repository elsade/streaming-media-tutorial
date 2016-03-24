const util = require("util");
const path = require("path");
const assert = require("assert");

const readChunk = require("read-chunk");
const fileType = require("file-type");
const jsmediatags = require("jsmediatags");

const id3 = require('./id3').id3Tags(); // no longer used...replaced by jsmediatags
const coverArt = require('cover-art');

/**
 * The module parses the input media files and extracts as much information about the file as possible including
 * title, artist, ext, mime types, album, etc.
 *
 * @param root - The root of the media fs.
 */
var mediaUtils = (root) => {
    "use strict";

    const requireChunkSize = 262;   // bytes needed by jsmediatags to identify a tag

    var module = {
        isMp3: (mimeType) => {
            assert(mimeType);
            return mimeType.match(/audio\/mpeg/)?true:false;
        },
        isMp4: (mimeType) => {
            assert(mimeType);
            return mimeType.match(/video\/quicktime/)?true:false;
        },
        isAudio: (mimeType) => {
            assert(mimeType);
            return mimeType.match(/audio\//)?true:false;
        },
        isImage: (mimeType) => {
            assert(mimeType);
            return mimeType.match(/image\//)?true:false;
        },
        isVideo: (mimeType) => {
            assert(mimeType);
            return mimeType.match(/video\//)?true:false;
        },
        setMediaInfoFromId3Tag: (mediaInfo, tag) => {
            assert(mediaInfo);
            assert(tag);

            util.log(tag);

            mediaInfo.title = tag.tags.title;
            mediaInfo.artist = tag.tags.artist;
            mediaInfo.album = tag.tags.album;

            // TODO::AG-add support for the attached picture
            //mediaInfo.picture = tag.tags.picture;
        },
        determineFiletype: (filePath, mediaInfo, callback) => {
            return readChunk(filePath, 0, requireChunkSize, (err, chunk) => {

                if(err) {
                    util.log(err);
                    return callback(err, mediaInfo, null);
                }

                var results = fileType(chunk);

                if(results) {
                    mediaInfo.ext = results.ext;
                    mediaInfo.mime = results.mime;
                }

                return callback(null, mediaInfo, results);
            });
        },
        readMediaTags: (filePath, mediaInfo, callback) => {

            return jsmediatags.read(filePath, {
                onSuccess: function(tag) {
                    assert(tag);

                    // append the information obtained from the tags here
                    module.setMediaInfoFromId3Tag(mediaInfo, tag);

                    return callback(null, mediaInfo, tag);
                },
                onError: function(error) {
                    return callback(error, mediaInfo, null);
                }
            });

        },
        //TODO::AG-Remove the callback hell in this function using promises
        getMetaData: (filePath, callback) => {

            var fullPath = root + filePath;

            var mediaData = {
                path: fullPath,
                src: filePath,
                mime: "unknown",
                ext: path.basename(filePath).split('.')[1]
            };

            // get the mime type and extension
            module.determineFiletype(fullPath, mediaData, (err, mediaInfo, fileType) => {
                if(err) {
                    return callback(err, mediaInfo);
                }

                // if the files have id3 tags
                if(module.isMp3(mediaData.mime) ||
                    module.isMp4(mediaData.mime)) {

                    // read the tags
                    module.readMediaTags(fullPath, mediaData, (err, mediaInfo, tag) => {
                        if(err) {
                            return callback(err, mediaInfo);
                        }

                        module.setMediaInfoFromId3Tag(mediaInfo, tag);

                        // if we alrady have cover art, we can look it up using the artist and album
                        if(!mediaInfo.picture &&
                            mediaInfo.artist &&
                            mediaInfo.album) {

                            // retrieve the cover art using the API
                            return coverArt(mediaInfo.artist.trim(), mediaInfo.album.trim(), "large", (err, url)=> {
                                if(err) {
                                    console.log("cover art error: " + util.inspect(err));
                                    return callback(null, mediaInfo);
                                }

                                mediaInfo.coverUrl = url;

                                return callback(null, mediaInfo);
                            });
                        }

                        return callback(null, mediaInfo);
                    });
                }
                else if(module.isImage(mediaData.mime)) {
                    return callback(null, mediaInfo);
                }
                else {
                    console.log("getMetaData, error, unhandled mime type ", util.inspect(mediaData));
                    return callback( new Error("Unknown media type"), mediaData);
                }
            });
        }
    };

    return module;
};

module.exports.mediaUtils = mediaUtils;