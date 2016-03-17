const util = require("util");

const moduleUnderTest = require("/moduleUnderTest").moduleUnderTest();

module.exports = {
    setUp: function (callback) {
        "use strict";
        callback();
    },
    tearDown: function (callback) {
        "use strict";
        callback();
    },
    moduleUnderTest_test1: function(test) {
        "use strict";

        //test.expect(2);

        test.ok(moduleUnderTest, "The module was found.");
        test.equal(1, 1, "");

        test.done();
    },
    moduleUnderTest_test2: function(test) {
        "use strict";

        //test.expect(2);

        test.ok(moduleUnderTest, "The module was found.");
        test.equal(1, 1, "");

        test.done();
    }
};
