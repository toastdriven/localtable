import assert from "assert";

import {
    isString,
    isInteger,
    isFloat,
    isBool,
    isObject,
    isFunction,
} from "../src/validation.js";

describe("validations", function() {
    describe("isString", function() {
        it("matches a string", function() {
            assert.equal(isString("a test string"), true);
        });

        it("doesn't match an integer", function() {
            assert.equal(isString(1), false);
        });
    });

    describe("isInteger", function() {
        it("matches an integer", function() {
            assert.equal(isInteger(2), true);
        });

        it("doesn't match a float", function() {
            assert.equal(isInteger(2.5), false);
        });
    });

    describe("isFloat", function() {
        it("matches a float", function() {
            assert.equal(isFloat(2.5), true);
        });

        it("doesn't match a string", function() {
            assert.equal(isFloat("a test string"), false);
        });
    });

    describe("isBool", function() {
        it("matches a true", function() {
            assert.equal(isBool(true), true);
        });

        it("matches a false", function() {
            assert.equal(isBool(false), true);
        });

        it("doesn't match an integer", function() {
            assert.equal(isBool(1), false);
        });
    });

    describe("isObject", function() {
        it("matches an object", function() {
            assert.equal(isObject({"test": "string"}), true);
        });

        it("doesn't match a string", function() {
            assert.equal(isObject("a test string"), false);
        });
    });

    describe("isFunction", function() {
        let testFunc = () => { return true; };

        it("matches a function", function() {
            assert.equal(isFunction(testFunc), true);
        });

        it("doesn't match an object", function() {
            assert.equal(isFunction({"test": "string"}), false);
        });
    });
});
