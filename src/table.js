"use strict";

import {
    isString,
    isInteger,
    isFloat,
    isBool,
    isObject,
    isFunction,
} from "./validation.js";

class LocalTable {
    fieldTypes = {
        "str": isString,
        "int": isInteger,
        "float": isFloat,
        "timestamp": isInteger,
        "bool": isBool,
        "obj": null,
    };
    lookupTypes = [
        "=",
        ">",
        ">=",
        "<",
        "<=",
        "!=",
    ];

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

    create() {
        let listName = this._tableListName();

        if(! this.storage.getItem(listName)) {
            this._setIds();
        };
    };

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

            const detailData = JSON.parse(rawData);

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

    all() {
        return this._filter();
    };

    count() {
        let allIds = this._getIds();
        return allIds.length;
    };

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

    get(id) {
        const actualName = this._detailName(id);
        let detailData = this.storage.getItem(actualName);

        if(! detailData) {
            throw new Error(`Couldn't find data for '${id}'.`);
        }

        return JSON.parse(detailData);
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
        const actualData = JSON.stringify(data);
        this.storage.setItem(actualName, actualData);

        // Then append it onto the list.
        this._pushNewId(id);
    };

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
        const actualData = JSON.stringify(currentData);
        this.storage.setItem(actualName, actualData);

        // Then, if new, append it onto the list.
        if(! found) {
            this._pushNewId(id);
        }
    };

    delete(id) {
        const actualName = this._detailName(id);
        this.storage.removeItem(actualName);

        // Then fix the cached IDs.
        this._cache_ids = this._cache_ids.filter(currentId => currentId !== id);
        this._setIds();
    };

    filter(filterBy) {
        return this._filter(filterBy);
    };
}

export {
    LocalTable,
};
