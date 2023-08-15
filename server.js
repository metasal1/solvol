import { Server } from 'socket.io';
import config from './config.json' assert { type: "json" };
import solvolget from './solvolget.js';
import solvolput from './solvolput.js';
import express from 'express';
import http from 'http';
import https from 'https';
import fetch from 'node-fetch';
import fs from 'fs';
import cors from 'cors';

const cert = '/etc/letsencrypt/live/cd.milysec.com/cert.pem'
const key = '/etc/letsencrypt/live/cd.milysec.com/privkey.pem'
const chain = '/etc/letsencrypt/live/cd.milysec.com/chain.pem'
const privateKey = fs.readFileSync(key, 'utf8');
const certificate = fs.readFileSync(cert, 'utf8');
const ca = fs.readFileSync(chain, 'utf8');

const credentials = { key: privateKey, cert: certificate, ca: ca };

const WAIT = 60000
const app = express();
app.use(cors());

const server = https.createServer(credentials, app)
const io = new Server(server, { cors: { origin: '*' } });
const STATIC_KEY = 'salim';

const fetchData = async (socket) => {
    let json;
    try {
        const response = await fetch('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=SOL', {
            headers: {
                'X-CMC_PRO_API_KEY': config.key
            }
        })

        if (response.status === 429) {
            console.log('Too Many Requests');
            return; // or handle it as required
        }

        if (!response.ok) {
            console.log(`HTTP error: ${response.status}`);
            return; // or handle it as required
        }

        json = await response.json();
    } catch (error) {
        console.log(error);
    }

    // json = {
    //     "data": {
    //         "SOL": {
    //             "id": 5426,
    //             "name": "Solana",
    //             "symbol": "SOL",
    //             "slug": "solana",
    //             "num_market_pairs": 497,
    //             "date_added": "2020-04-10T00:00:00.000Z",
    //             "tags": [
    //                 "pos",
    //                 "platform",
    //                 "solana-ecosystem",
    //                 "cms-holdings-portfolio",
    //                 "kenetic-capital-portfolio",
    //                 "alameda-research-portfolio",
    //                 "multicoin-capital-portfolio",
    //                 "okex-blockdream-ventures-portfolio",
    //                 "layer-1",
    //                 "ftx-bankruptcy-estate",
    //                 "sec-security-token",
    //                 "alleged-sec-securities"
    //             ],
    //             "max_supply": null,
    //             "circulating_supply": 406100531.9893281,
    //             "total_supply": 554933083.3837498,
    //             "is_active": 1,
    //             "infinite_supply": true,
    //             "platform": null,
    //             "cmc_rank": 9,
    //             "is_fiat": 0,
    //             "self_reported_circulating_supply": null,
    //             "self_reported_market_cap": null,
    //             "tvl_ratio": null,
    //             "last_updated": "2023-08-15T11:08:00.000Z",
    //             "quote": {
    //                 "USD": {
    //                     "price": Math.random() * 10,
    //                     "volume_24h": 391186741.3763091,
    //                     "volume_change_24h": 32.4083,
    //                     "percent_change_1h": -0.15742248,
    //                     "percent_change_24h": 1.70167141,
    //                     "percent_change_7d": 6.81969717,
    //                     "percent_change_30d": -10.30669602,
    //                     "percent_change_60d": 68.83689813,
    //                     "percent_change_90d": 20.85517375,
    //                     "market_cap": 10119668738.784985,
    //                     "market_cap_dominance": 0.8643,
    //                     "fully_diluted_market_cap": 13828445258.44,
    //                     "tvl": null,
    //                     "last_updated": new Date().toISOString()
    //                 }
    //             }
    //         }
    //     }
    // }

    const sol = json.data.SOL.quote.USD;

    // calculate sales volume
    sol.volume = Math.round(sol.volume_24h / sol.price);
    const last = await solvolget();

    // volume difference in SOL
    sol.diffsol = Math.round(sol.volume - last.volume);

    // volume difference in USD
    sol.diffusd = Math.round(sol.volume_24h - last.volume_24h);

    const current = {
        timestamp: sol.last_updated,
        volume: Math.round(sol.volume_24h / sol.price),
        price: (sol.price).toFixed(2),
        diffsol: sol.diffsol,
        diffusd: sol.diffusd
    };
    console.log(current);
    socket.emit('data', current);
    // await solvolput("solana", "solvol", current);
};

io.on('connection', (socket) => {
    const clientKey = socket.handshake.query.key;

    if (clientKey !== STATIC_KEY) {
        console.log('Unauthorized connection attempt');
        socket.disconnect();
        return;
    }

    console.log('Client connected');

    // Fetch data immediately on connection
    fetchData(socket);

    // Set an interval to fetch the data every minute
    const interval = setInterval(() => fetchData(socket), WAIT);

    // Clear the interval when the client disconnects
    socket.on('disconnect', () => {
        clearInterval(interval);
    });
});

server.listen(8080);
