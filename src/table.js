/**
 * LocalTable: Provides a database-table-like API.
 *
 * @module localtable/table
 */
"use strict";

import {
    isString,
    isInteger,
    isFloat,
    isBool,
    isObject,
    isFunction,
} from "./validation.js";

/**
 * A class representing a table of similar rows.
 */
class LocalTable {
    /** Mapping of field types to validation functions */
    fieldTypes = {
        "str": isString,
        "int": isInteger,
        "float": isFloat,
        "timestamp": isInteger,
        "bool": isBool,
        "obj": null,
    };
    /** The available lookup types for basic filtering */
    lookupTypes = [
        "=",
        ">",
        ">=",
        "<",
        "<=",
        "!=",
    ];
    /** The name of the `id` in a row's data */
    idField = "id";

    /**
     * Creates a new `LocalTable` instance.
     * @param {Storage} storage - Reference to the `Storage`-like object that
     *     will keep the data.
     * @param {string} tableName - The name of the table.
     * @param {object} options - The options for instantiating the table.
     */
    constructor(storage, tableName, options) {
        this.storage = storage;
        this.tableName = tableName;
        this._fields = options["fields"] || [];
        this._cache_ids = null;

        // Ensure the table exists.
        this.create();
    };

    _tableListName() {
        return `${this.tableName}_list`;
    };

    _getIds() {
        if(this._cache_ids === null) {
            let listName = this._tableListName();
            let listData = this.storage.getItem(listName);

            if(! listData) {
                this.create();
            } else {
                this._cache_ids = JSON.parse(listData);
            }
        }

        return this._cache_ids;
    };

    _setIds() {
        if(this._cache_ids === null) {
            // We haven't tried to access any keys yet.
            this._cache_ids = [];
        }

        let listName = this._tableListName();
        const allIds = JSON.stringify(this._cache_ids);
        this.storage.setItem(listName, allIds);
    };

    _detailName(id) {
        return `${this.tableName}_detail_${id}`;
    };

    _pushNewId(id) {
        if(this._cache_ids === null) {
            this._cache_ids = [];
        }

        this._cache_ids.push(id);
        this._setIds();
    };

    _serializeData(data) {
        // We need to make a copy, so that we don't alter-by-reference the
        // user's data.
        const detailData = {};

        for(const key of Object.keys(data)) {
            if(key === this.idField) {
                continue;
            }

            if(data.hasOwnProperty(key)) {
                detailData[key] = data[key];
            }
        }

        return JSON.stringify(detailData);
    };

    _deserializeData(id, data) {
        const detailData = JSON.parse(data);
        detailData[this.idField] = id;
        return detailData;
    };

    /**
     * Creates the table (if not already present).
     * @return {null}
     */
    create() {
        let listName = this._tableListName();

        if(! this.storage.getItem(listName)) {
            this._setIds();
        };
    };

    /**
     * Drops the table & all rows from the storage.
     * @return {null}
     */
    drop() {
        // Delete all the detail records first.
        let allIds = this._getIds();

        for(const id of allIds) {
            const actualName = this._detailName(id);
            this.storage.removeItem(actualName);
        }

        // Then delete the table.
        let listName = this._tableListName();
        this.storage.removeItem(listName);

        // And reset the internal IDs.
        this._cache_ids = null;
    };

    _defaultFiltering(filterBy, detailData) {
        let matched = [true];

        for(const fieldName of Object.keys(filterBy)) {
            if(! detailData.hasOwnProperty(fieldName)) {
                continue;
            }

            const currentValue = detailData[fieldName];
            const lookupData = filterBy[fieldName];

            for(const comparison of Object.keys(lookupData)) {
                if(this.lookupTypes.indexOf(comparison) < 0) {
                    throw new Error(`Invalid lookup type '${comparison}' provided!`);
                }

                let desiredValue = lookupData[comparison];

                switch(comparison) {
                    case "=":
                        matched.push(currentValue === desiredValue);
                        break;
                    case ">":
                        matched.push(currentValue > desiredValue);
                        break;
                    case ">=":
                        matched.push(currentValue >= desiredValue);
                        break;
                    case "<":
                        matched.push(currentValue < desiredValue);
                        break;
                    case "<=":
                        matched.push(currentValue <= desiredValue);
                        break;
                    case "!=":
                        matched.push(currentValue !== desiredValue);
                        break;
                    default:
                        throw new Error(`Unhandled lookup type '${comparison}'!`);
                }
            }
        }

        return matched.every((bit) => bit === true);
    };

    _filter(filterBy) {
        let allIds = this._getIds();
        let allData = [];

        for(const id of allIds) {
            const actualName = this._detailName(id);
            const rawData = this.storage.getItem(actualName);

            if(! rawData) {
                console.log(`Couldn't find detail data for ${actualName}! Skipping...`);
            }

            const detailData = this._deserializeData(id, rawData);

            if(filterBy !== undefined) {
                if(! isFunction(filterBy)) {
                    // Use the default filtering.
                    if(! this._defaultFiltering(filterBy, detailData)) {
                        continue;
                    }
                } else {
                    // We've got a custom callable.
                    if(! filterBy(detailData)) {
                        continue;
                    }
                }
            }

            allData.push(detailData);
        }

        return allData;
    }

    /**
     * Returns all rows found in the table.
     * @return {array} An array of objects for all the rows
     */
    all() {
        return this._filter();
    };

    /**
     * Returns a count of the number of rows in the table.
     * @return {integer} How many rows are in the table
     */
    count() {
        let allIds = this._getIds();
        return allIds.length;
    };

    /**
     * Checks if a row is in the table.
     * @param {any} id - The identifier of the row. Typically an integer, but can
     *     be a string/UUID/etc.
     * @return {boolean} True if present, else False.
     */
    exists(id) {
        try {
            // This is a little wasteful, as we're parsing the data then just
            // throwing it out. But whatevs.
            this.get(id);
            return true;
        } catch (err) {
            return false;
        }
    };

    /**
     * Fetches a specific row from the table.
     * @param {any} id - The identifier of the row. Typically an integer, but can
     *     be a string/UUID/etc.
     * @throws If the provided ID is not present in the table.
     * @return {object} The detail data for the row
     */
    get(id) {
        const actualName = this._detailName(id);
        let detailData = this.storage.getItem(actualName);

        if(! detailData) {
            throw new Error(`Couldn't find data for '${id}'.`);
        }

        return this._deserializeData(id, detailData);
    };

    _validate(data) {
        const errors = [];

        for(const fieldAttrs of this._fields) {
            const fieldName = fieldAttrs["name"];

            // Check if it's missing
            if(! data.hasOwnProperty(fieldName)) {
                // If it's not present & there's a default, use that instead.
                if(fieldAttrs.hasOwnProperty("default")) {
                    data[fieldName] = fieldAttrs["default"];
                } else if(fieldAttrs["required"] === false) {
                    // It's missing & not required. Don't bother trying to validate.
                } else {
                    errors.push(`Missing data for ${fieldName}`);
                }

                continue;
            }

            // Check its type.
            let fieldType = "str";

            if(fieldAttrs.hasOwnProperty("type")) {
                fieldType = fieldAttrs["type"];
            }

            if(! this.fieldTypes.hasOwnProperty(fieldType)) {
                errors.push(`Invalid field type provided: ${fieldType}`);
                continue;
            }

            let validator = this.fieldTypes[fieldType];

            if(validator !== null) {
                if(! validator(data[fieldName])) {
                    errors.push(`Invalid data type provided for '${fieldName}': ${data[fieldName]}`);
                    continue;
                }
            }

            // TODO: Maybe length/range checks here in the future?
        }

        return errors;
    };

    /**
     * Inserts a new row into the table.
     * @param {any} id - The identifier of the row. Typically an integer, but can
     *     be a string/UUID/etc.
     * @param {object} data - The field data for the row
     * @throws If the id is already present in the table or the fields fail
     *     to validate
     * @return {null}
     */
    insert(id, data) {
        if(this.exists(id)) {
            throw new Error(`Data is already present for '${id}'!`);
        }

        // Check for validation errors.
        const errors = this._validate(data);

        if(errors.length > 0) {
            throw new Error(`Invalid data! ${errors}`);
        }

        // If we're good, update the storage.
        const actualName = this._detailName(id);
        const actualData = this._serializeData(data);
        this.storage.setItem(actualName, actualData);

        // Then append it onto the list.
        this._pushNewId(id);
    };

    /**
     * Updates an existing row (or inserts a new row if not present) into the
     * table.
     * @param {any} id - The identifier of the row. Typically an integer, but can
     *     be a string/UUID/etc.
     * @param {object} data - The changed field data for the row
     * @throws If the fields fail to validate
     * @return {null}
     */
    update(id, newData) {
        const actualName = this._detailName(id);
        let found = false;
        let currentData;

        // Fetch the current data, or assume an empty row.
        try {
            currentData = this.get(id);
            found = true;
        } catch (err) {
            currentData = {};
        }

        // Copy over the updated data.
        for(const fieldName of Object.keys(newData)) {
            currentData[fieldName] = newData[fieldName];
        }

        // Check for validation errors.
        const errors = this._validate(currentData);

        if(errors.length > 0) {
            throw new Error(`Invalid data! ${errors}`);
        }

        // If we're good, update the storage.
        const actualData = this._serializeData(currentData);
        this.storage.setItem(actualName, actualData);

        // Then, if new, append it onto the list.
        if(! found) {
            this._pushNewId(id);
        }
    };

    /**
     * Deletes a row from the table.
     * @param {any} id - The identifier of the row. Typically an integer, but can
     *     be a string/UUID/etc.
     * @return {null}
     */
    delete(id) {
        const actualName = this._detailName(id);
        this.storage.removeItem(actualName);

        // Then fix the cached IDs.
        this._cache_ids = this._cache_ids.filter(currentId => currentId !== id);
        this._setIds();
    };

    /**
     * Returns a filtered set of rows from the table.
     * @param {object|function} filterBy - Either a plain object of filters
     *     or a user-defined function to do the filtering.
     * @throws If invalid fields or lookup types are provided
     * @return {array} An array of objects of matched rows
     */
    filter(filterBy) {
        return this._filter(filterBy);
    };
}

export {
    LocalTable,
};
