import { MongoClient, ServerApiVersion } from 'mongodb';
import config from './config.json' assert { type: "json" };

const client = new MongoClient(config.mongo, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

export default async function saveToMongo(db, table, data) {
    try {
        await client.connect();
        const req = await client.db(db).collection(table).insertOne(data)
        console.log(req.acknowledged, req.insertedId, new Date())
    } finally {
        // await client.close();
    }
}
// saveToMongo({ name: 'John', age: 25 });