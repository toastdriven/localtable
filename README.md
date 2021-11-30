# localtable

A thin database-like wrapper over `window.localStorage`.

You create a table (or tables) to store many similar rows in, & `localtable`
handles all the usual CRUD/database-style operations.


## Usage

```javascript
import { LocalTable } from "localtable";

const records = new LocalTable(
    window.localStorage, // ...or 'window.sessionStorage', or any other 'Storage'-like object.
    "records", // The name of the table.
    {
        fields: [
            { name: "firstName", type: "str" },
            { name: "lastName", type: "str" },
            { name: "createdAt", type: "timestamp" },
            { name: "loginCount", type: "int", default: 0, required: false },
        ]
    }
);

console.log(`Initial count: ${records.count()}`);

records.insert(
    1, // An ID, which can be any unique JSON-serializable identifier
    {
        firstName: "Daniel",
        lastName: "Lindsley",
        createdAt: Date.now(),
    }
);
records.insert(2, {
    firstName: "Jane",
    lastName: "Doe",
    createdAt: Date.now(),
});

console.log(`New count: ${records.count()}`);

// Pull specific rows by ID.
let dl = records.get(1);

console.log(`Hello, ${dl.firstName}!`);

// Update information.
records.update(2, {
    firstName: "Jenn",
    loginCount: 3,
});

// Grab all the rows in the table & iterate.
for(const record of records.all()) {
    console.log(`Saw #${record.id}: ${record.firstName} - ${record.loginCount}`);
}

// Or filter down to specific data.
const filtered = records.filter({
    createdAt: {">=": Date.parse("2021-11-24")},
    loginCount: {"<": "2"},
});
console.log(filtered.length); // 1
console.log(filtered[0].firstName); // "Daniel"
console.log(filtered[0].loginCount); // 0

// Delete a single row.
records.delete(1);

// Or drop the whole table.
records.drop();
```


## API

`const table = new LocalTable(store, tableName, options)` - Creates a new
`LocalTable`.

`table.create()` - Sets up the table in the `storage`.

`table.drop()` - Deletes the table from `storage`.

`table.get(id)` - Fetches a row from the table by ID.

`table.insert(id, data)` - Inserts a new row into the table.

`table.update(id, data)` - Updates (or inserts) a row in the table.

`table.delete(id)` - Deletes a row from the table.

`table.exists(id)` - Checks if a row is present in the table. Returns `true`
or `false`.

`table.count()` - Returns a count of the number of records in the table.

`table.all()` - Returns all records in the table.

`table.filter(filterDataOrFunc)` - Returns a filtered set of data from the
table. If a plain object is provided, an `AND`-style filtering of the data is
performed. If a function is provided, it should take a single `data` parameter
& should return `true`/`false` if the row should be included in the output.


## Testing

`npm test`


## Generating Docs

`jsdoc -r -d ~/Desktop/out --package package.json --readme README.md src`


## License

New BSD
