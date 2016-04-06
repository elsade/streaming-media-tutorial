/**
 * This file is a template for node.js modules.
 *
 * @type {exports|module.exports}
 */

const util = require("util");
const assert = require("assert");

var moduleName = (root) => {
    "use strict";

    // private module variables and constants
    const magicNumber = 42;

    // private function
    function bar() {

    }

    //noinspection UnnecessaryLocalVariableJS
    var context = {
        // public function
        foo: () => {
        }
    };

    return context;
};

module.exports.moduleName = moduleName;