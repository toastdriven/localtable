import assert from "assert";

import { LocalTable } from "../src/table.js";

class MockStorage {
    length = 0;

    constructor() {
        this._data = {};
    };

    getItem(key) {
        return this._data[key];
    };

    setItem(key, value) {
        if(! this._data.hasOwnProperty(key)) {
            this.length++;
        }

        this._data[key] = value;
    };

    removeItem(key) {
        delete this._data.key;
        this.length--;
    };

    clear() {
        this._data = {};
        this.length = 0;
    };
};

describe("LocalTable", function() {
    describe("constructor", function() {
        it("sets internal state", function() {
            const store = new MockStorage();
            assert.equal(store.length, 0)


            const table = new LocalTable(store, "records", {
                "fields": [
                    {"name": "message", "type": "str"},
                ],
            });

            assert.equal(table.storage, store);
            assert.equal(table.tableName, "records");
        });
    });
});
