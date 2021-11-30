/**
 * Validations for field types.
 * @module localtable/validation
 */
 "use strict";

/**
 * Validates if the value is a string.
 * @function
 * @param {any} value - The data to validate
 * @return {boolean} True if a string, else False
 */
const isString = function(value) {
    return typeof value === "string";
};

/**
 * Validates if the value is an integer.
 * @function
 * @param {any} value - The data to validate
 * @return {boolean} True if an integer, else False
 */
const isInteger = function(value) {
    if(! typeof value === "number") {
        return false;
    }

    if(Math.round(value) !== value) {
        return false;
    }

    return true;
};

/**
 * Validates if the value is a float.
 * @function
 * @param {any} value - The data to validate
 * @return {boolean} True if a float, else False
 */
const isFloat = function(value) {
    return typeof value === "number";
};

/**
 * Validates if the value is a boolean.
 * @function
 * @param {any} value - The data to validate
 * @return {boolean} True if a boolean, else False
 */
const isBool = function(value) {
    return typeof value === "boolean";
};

/**
 * Validates if the value is an object.
 * @function
 * @param {any} value - The data to validate
 * @return {boolean} True if an object, else False
 */
const isObject = function(value) {
    return typeof value === "object";
};

/**
 * Validates if the value is a function.
 * @function
 * @param {any} value - The data to validate
 * @return {boolean} True if a function, else False
 */
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
