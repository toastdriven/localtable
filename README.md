# localtable

A thin NoSQL-like wrapper over `window.localStorage`.

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
            { name: "loginCount", type: "int", default: 0 },
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

let dl = records.get(1);

console.log(`Hello, ${dl.firstName}!`);

for(const record of records.all()) {
    console.log(`Saw #${record.id}: ${record.firstName} - ${record.loginCount}`);
}

records.update(2, {
    firstName: "Jenn",
    loginCount: 3,
});

records.filter({
    createdAt: {">=": Date.parse("2021-11-24")},
    loginCount: {"<": "2"},
});

records.delete(1);
```


## License

New BSD
