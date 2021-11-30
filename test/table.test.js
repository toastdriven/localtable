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
            assert.equal(store.length, 0);

            const table = new LocalTable(store, "records", {
                "fields": [
                    {"name": "message", "type": "str"},
                ],
            });

            assert.equal(table.storage, store);
            assert.equal(table.tableName, "records");

            // Post call to `create`, there should be a key there.
            assert.equal(store.length, 1);
        });
    });

    describe("_tableListName", function() {
        it("creates the internal table name key", function() {
            const store = new MockStorage();
            const table = new LocalTable(store, "records", {
                "fields": [
                    {"name": "message", "type": "str"},
                ],
            });

            assert.equal(table._tableListName(), "records_list");
        });
    });

    describe("_detailName", function() {
        it("creates the internal detail key", function() {
            const store = new MockStorage();
            const table = new LocalTable(store, "records", {
                "fields": [
                    {"name": "message", "type": "str"},
                ],
            });

            assert.equal(table._detailName(5), "records_detail_5");
        });
    });

    describe("create", function() {
        it("creates the table", function() {
            const store = new MockStorage();
            assert.equal(store.length, 0);

            const table = new LocalTable(store, "records", {
                "fields": [
                    {"name": "message", "type": "str"},
                ],
            });

            // The constructor calls `create`, which kinda defeats the
            // purpose of testing.
            assert.equal(store.length, 1);
            // Clear it out & validate `create`'s behavior.
            store.clear();
            assert.equal(store.length, 0);
            table._cache_ids = null;

            table.create();

            assert.equal(store.length, 1);
            assert.equal(table._cache_ids.length, 0);
            assert.equal(store.getItem("records_list"), "[]");
        });
    });

    describe("drop", function() {
        it("drops the table", function() {
            const store = new MockStorage();

            const table = new LocalTable(store, "records", {
                "fields": [
                    {"name": "message", "type": "str"},
                ],
            });

            table.insert(1, {message: "Hello"});
            table.insert(2, {message: "Bonjour"});
            table.insert(3, {message: "Ohayo"});
            table.insert(4, {message: "Guten tag"});

            // Write in a custom key as well.
            store.setItem("super_custom", "yo");

            assert.equal(store.length, 6);

            table.drop();
            assert.equal(store.length, 1);
            assert.equal(table._cache_ids, null);
        });
    });

    describe("count", function() {
        it("returns a count of the number of rows in the table", function() {
            const store = new MockStorage();

            const table = new LocalTable(store, "records", {
                "fields": [
                    {"name": "message", "type": "str"},
                ],
            });

            assert.equal(table.count(), 0);

            table.insert(1, {message: "Hello"});
            table.insert(2, {message: "Bonjour"});
            table.insert(3, {message: "Ohayo"});
            table.insert(4, {message: "Guten tag"});

            assert.equal(table.count(), 4);
        });
    });

    describe("exists", function() {
        it("returns whether or not an id is present in the table", function() {
            const store = new MockStorage();

            const table = new LocalTable(store, "records", {
                "fields": [
                    {"name": "message", "type": "str"},
                ],
            });

            table.insert(1, {message: "Hello"});
            table.insert(2, {message: "Bonjour"});
            table.insert(3, {message: "Ohayo"});
            table.insert(4, {message: "Guten tag"});

            assert.equal(table.exists(1), true);
            assert.equal(table.exists(4), true);
            assert.equal(table.exists(5), false);
        });
    });

    describe("all", function() {
        it("returns all rows in the table", function() {
            const store = new MockStorage();

            const table = new LocalTable(store, "records", {
                "fields": [
                    {"name": "message", "type": "str"},
                ],
            });

            table.insert(1, {message: "Hello"});
            table.insert(2, {message: "Bonjour"});
            table.insert(3, {message: "Ohayo"});
            table.insert(4, {message: "Guten tag"});

            const allMsgs = table.all();

            assert.equal(allMsgs.length, 4);
            assert.equal(allMsgs[0].message, "Hello");
            assert.equal(allMsgs[1].message, "Bonjour");
            assert.equal(allMsgs[2].message, "Ohayo");
            assert.equal(allMsgs[3].message, "Guten tag");
        });
    });

    describe("filter", function() {
        it("returns a set of rows in the table with one filter", function() {
            const store = new MockStorage();

            const table = new LocalTable(store, "records", {
                "fields": [
                    {"name": "firstName", "type": "str"},
                    {"name": "loginCount", "type": "int", "default": 0},
                    {"name": "createdAt", "type": "timestamp"},
                ],
            });

            // Yes, these are super-low timestamps. We just need data.
            table.insert(1, {firstName: "John", loginCount: 5, createdAt: 12345});
            table.insert(2, {firstName: "Jane", loginCount: 2, createdAt: 13367});
            table.insert(3, {firstName: "Joe", loginCount: 10, createdAt: 12399});
            table.insert(4, {firstName: "John", loginCount: 11, createdAt: 12468});

            const moreThan4Logins = table.filter({
                loginCount: {">=": 4},
            });

            assert.equal(moreThan4Logins.length, 3);
            assert.equal(moreThan4Logins[0].firstName, "John");
            assert.equal(moreThan4Logins[1].firstName, "Joe");
            assert.equal(moreThan4Logins[2].firstName, "John");
        });

        it("returns a set of rows in the table with two filters", function() {
            const store = new MockStorage();

            const table = new LocalTable(store, "records", {
                "fields": [
                    {"name": "firstName", "type": "str"},
                    {"name": "loginCount", "type": "int", "default": 0},
                    {"name": "createdAt", "type": "timestamp"},
                ],
            });

            // Yes, these are super-low timestamps. We just need data.
            table.insert(1, {firstName: "John", loginCount: 5, createdAt: 12345});
            table.insert(2, {firstName: "Jane", loginCount: 2, createdAt: 13367});
            table.insert(3, {firstName: "Joe", loginCount: 10, createdAt: 12399});
            table.insert(4, {firstName: "John", loginCount: 11, createdAt: 12468});

            const filtered = table.filter({
                createdAt: {"<": 12499}, // 3 records
                firstName: {"=": "John"}, // ...then just 2 records.
            });

            assert.equal(filtered.length, 2);
            assert.equal(filtered[0].id, 1);
            assert.equal(filtered[0].loginCount, 5);
            assert.equal(filtered[1].id, 4);
            assert.equal(filtered[1].loginCount, 11);
        });

        it("returns a set of rows in the table with custom function", function() {
            const store = new MockStorage();

            const table = new LocalTable(store, "records", {
                "fields": [
                    {"name": "firstName", "type": "str"},
                    {"name": "loginCount", "type": "int", "default": 0},
                    {"name": "createdAt", "type": "timestamp"},
                ],
            });

            // Yes, these are super-low timestamps. We just need data.
            table.insert(1, {firstName: "John", loginCount: 5, createdAt: 12345});
            table.insert(2, {firstName: "Jane", loginCount: 2, createdAt: 13367});
            table.insert(3, {firstName: "Joe", loginCount: 10, createdAt: 12399});
            table.insert(4, {firstName: "John", loginCount: 11, createdAt: 12468});

            const filtered = table.filter((data) => data.firstName === "Jane");

            assert.equal(filtered.length, 1);
            assert.equal(filtered[0].id, 2);
            assert.equal(filtered[0].firstName, "Jane");
            assert.equal(filtered[0].loginCount, 2);
        });
    });

    describe("get", function() {
        it("returns the correct row from the table", function() {
            const store = new MockStorage();

            const table = new LocalTable(store, "records", {
                "fields": [
                    {"name": "message", "type": "str"},
                ],
            });

            table.insert(1, {message: "Hello"});
            table.insert(2, {message: "Bonjour"});
            table.insert(3, {message: "Ohayo"});
            table.insert(4, {message: "Guten tag"});

            const row2 = table.get(2);

            assert.equal(row2.id, 2);
            assert.equal(row2.message, "Bonjour");

            const row4 = table.get(4);

            assert.equal(row4.id, 4);
            assert.equal(row4.message, "Guten tag");
        });

        it("fails with an id that's not present", function() {
            const store = new MockStorage();

            const table = new LocalTable(store, "records", {
                "fields": [
                    {"name": "message", "type": "str"},
                ],
            });

            table.insert(1, {message: "Hello"});
            table.insert(2, {message: "Bonjour"});
            table.insert(3, {message: "Ohayo"});
            table.insert(4, {message: "Guten tag"});

            assert.throws(() => table.get(200));
        });
    });

    describe("insert", function() {
        it("inserts a new row into the table", function() {
            const store = new MockStorage();

            const table = new LocalTable(store, "records", {
                "fields": [
                    {"name": "message", "type": "str"},
                ],
            });

            assert.equal(table.count(), 0);

            table.insert(1, {message: "Hello"});
            table.insert(2, {message: "Bonjour"});
            table.insert(3, {message: "Ohayo"});
            table.insert(4, {message: "Guten tag"});

            assert.equal(table.count(), 4);
        });

        it("fails to insert when the Id is already present", function() {
            const store = new MockStorage();

            const table = new LocalTable(store, "records", {
                "fields": [
                    {"name": "message", "type": "str"},
                ],
            });

            assert.equal(table.count(), 0);

            table.insert(1, {message: "Hello"});
            table.insert(2, {message: "Bonjour"});
            table.insert(3, {message: "Ohayo"});
            table.insert(4, {message: "Guten tag"});

            assert.equal(table.count(), 4);

            assert.throws(() => table.insert(1, {message: "G'day"}));
        });
    });

    describe("update", function() {
        it("updates a row if present", function() {
            const store = new MockStorage();

            const table = new LocalTable(store, "records", {
                "fields": [
                    {"name": "message", "type": "str"},
                ],
            });

            assert.equal(table.count(), 0);

            table.insert(1, {message: "Hello"});
            table.insert(2, {message: "Bonjour"});
            table.insert(3, {message: "Ohayo"});
            table.insert(4, {message: "Guten tag"});

            assert.equal(table.count(), 4);

            table.update(1, {message: "G'day"});

            // No change in the number of rows.
            assert.equal(table.count(), 4);
            // But the data is updated.
            const row1 = table.get(1);
            assert.equal(row1.message, "G'day");
        });

        it("inserts a new row if the Id is not present", function() {
            const store = new MockStorage();

            const table = new LocalTable(store, "records", {
                "fields": [
                    {"name": "message", "type": "str"},
                ],
            });

            assert.equal(table.count(), 0);

            table.insert(1, {message: "Hello"});
            table.insert(2, {message: "Bonjour"});
            table.insert(3, {message: "Ohayo"});
            table.insert(4, {message: "Guten tag"});

            assert.equal(table.count(), 4);

            table.update(17, {message: "G'day"});

            assert.equal(table.count(), 5);
        });
    });

    describe("delete", function() {
        it("deletes a row if present", function() {
            const store = new MockStorage();

            const table = new LocalTable(store, "records", {
                "fields": [
                    {"name": "message", "type": "str"},
                ],
            });

            assert.equal(table.count(), 0);

            table.insert(1, {message: "Hello"});
            table.insert(2, {message: "Bonjour"});
            table.insert(3, {message: "Ohayo"});
            table.insert(4, {message: "Guten tag"});

            assert.equal(table.count(), 4);

            table.delete(3);

            assert.equal(table.count(), 3);

            const allMsgs = table.all();
            assert.equal(allMsgs[0].message, "Hello");
            assert.equal(allMsgs[1].message, "Bonjour");
            assert.equal(allMsgs[2].message, "Guten tag");
        });

        it("silently fails if the Id is not present", function() {
            const store = new MockStorage();

            const table = new LocalTable(store, "records", {
                "fields": [
                    {"name": "message", "type": "str"},
                ],
            });

            assert.equal(table.count(), 0);

            table.insert(1, {message: "Hello"});
            table.insert(2, {message: "Bonjour"});
            table.insert(3, {message: "Ohayo"});
            table.insert(4, {message: "Guten tag"});

            assert.equal(table.count(), 4);

            table.delete(3074);

            // Table count is still the same.
            assert.equal(table.count(), 4);
        });
    });
});
