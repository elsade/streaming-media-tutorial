var userStore = require("../userStore").userStore();

exports.userStoreTests = function(test) {
    "use strict";

    var testUser, testUser2, removedUser;

    //test.expect(1);
    test.ok(userStore, "The module was found.");

    test.equal(userStore.userList.length, 0, "");

    testUser = userStore.CreateUser('123', "John Smith");
    test.ok(testUser, "User creation");
    test.equal(testUser.socketId, "123", "User creation");
    test.equal(testUser.name, "John Smith", "User creation");

    userStore.addUser(testUser);
    test.equal(userStore.userList[0].socketId, "123", "addUser test");
    test.equal(userStore.userList[0].name, "John Smith", "addUser test");
    test.equal(userStore.userList.length, 1, "addUser test");

    removedUser = userStore.removeUser(0);
    test.ok(removedUser, "removeUser");
    test.equal(userStore.userList.length, 0, "removeUser");

    userStore.addUser(testUser);
    removedUser = userStore.removeUserById("123");
    test.ok(removedUser, "removeUserById");
    test.equal(userStore.userList.length, 0, "removeUserById");

    userStore.addUser(testUser);
    removedUser = userStore.removeUserByName("John Smith");
    test.ok(removedUser, "removeUserByName");
    test.equal(userStore.userList.length, 0, "removeUserByName");

    testUser2 = userStore.CreateUser("456", "Jane Smith");

    userStore.addUser(testUser);
    userStore.addUser(testUser2);
    removedUser = userStore.removeUserByName("John Smith");
    test.ok(removedUser, "removeUserByName");
    test.equal(userStore.userList.length, 1, "removeUserByName");

    removedUser = userStore.removeUserByName("Jane Smith");
    test.ok(removedUser, "removeUserByName");
    test.equal(userStore.userList.length, 0, "removeUserByName");

    test.done();
};
