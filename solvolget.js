import { MongoClient, ServerApiVersion } from 'mongodb';
import config from './config.json' assert { type: "json" };

const client = new MongoClient(config.mongo, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

export default async function solvolget() {
    try {
        await client.connect();
        const req = await client.db('solana').collection('solvol').find().sort({ _id: -1 }).limit(1).toArray();
        // console.log(req[0]);
        return req[0];
    } finally {
        // await client.close();
    }
}
// solvolget();