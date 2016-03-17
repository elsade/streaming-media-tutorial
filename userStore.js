var util = require("util");

/**
 * This module stores user lo
 *
 */
var userStore = () => {
    "use strict";
    //noinspection JSUnusedGlobalSymbols,JSUnusedGlobalSymbols,JSUnusedGlobalSymbols
    var module = {
        /**
         * For a small number of users an array will work but for a larger set, we should use an ordered map
         */
        userList: [],
        CreateUser: function (socketId, name) {
            return {
                socketId: socketId,
                name: name
            };
        },
        /**
         * Add users to the store.  We want the users to be in sorted order based on the when they joined.
         *
         * @param user
         */
        addUser: (user) => {
            console.log("addUser " + util.inspect(user));
            module.userList.push(user);
        },
        removeUser: function (index) {
            var removedUser;
            if(index !== -1) {
                removedUser = module.userList.splice(index, 1);
            }
            return removedUser;
        },
        findUserIndex: (id, name) => {
            //noinspection UnnecessaryLocalVariableJS
            var index = module.userList.findIndex((user)=> {
                return id === user.socketId ||
                    name === user.name;
            });

            return index;
        },
        removeUserById: (socketId) => {
            return module.removeUser(module.findUserIndex(socketId));
        },
        removeUserByName: (name) => {
            return module.removeUser(module.findUserIndex(null,name));
        },
        findUserById: (socketId) => {
            var index = module.findUserIndex(socketId, null);
            return (index === -1)? -1 : module.userList[index];
        },
        findUserByName: (name) => {
            var index = module.findUserIndex(null, name);
            return (index === -1)? -1 : module.userList[index];
        }
    };

    return module;
};


module.exports.userStore = userStore;
