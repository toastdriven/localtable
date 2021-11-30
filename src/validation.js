"use strict";

const isString = function(value) {
    return typeof value === "string";
};

const isInteger = function(value) {
    if(! typeof value === "number") {
        return false;
    }

    if(Math.round(value) !== value) {
        return false;
    }

    return true;
};

const isFloat = function(value) {
    return typeof value === "number";
};

const isBool = function(value) {
    return typeof value === "boolean";
};

const isObject = function(value) {
    return typeof value === "object";
};

const isFunction = function(value) {
    return typeof value === "function";
};

export {
    isString,
    isInteger,
    isFloat,
    isBool,
    isObject,
    isFunction,
};
