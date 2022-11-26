// Load modules
const express = require('express')
const app = express()
const port = 3000
const fs = require('fs');
const handlebars = require('express-handlebars');
const mysql = require("mysql");
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { firebase } = require('firebase-admin');

// Load credentials
const serviceAccount = require('../config/advanced-development-s5208752-firebase-adminsdk-r1azo-550af01131.json');
const stripe_creds = require('../config/stripe-credentials.json');
const sql_creds = require("../config/sql-credentials.json");

// Create SQL connection
const connection = mysql.createConnection(sql_creds);

// Attempt to connect to SQL database
// Reconnect up to maximumAttemps times if connection failed
async function attemptSQLConnection(maximumAttempts: number) {
    let connectionAttempts = 0;

    const sqlConnection = () => {
        console.log("Attempting connection to SQL server...");
        return new Promise<string | void>((resolve, reject) => {
            connection.connect((error: any) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        })
    }

    do {
        try {
            await sqlConnection();
            console.log("Connected to SQL server");
            break;
        } catch (error: any) {
            console.error(error);
        }
        connectionAttempts++;
    } while (connectionAttempts < maximumAttempts)
}
attemptSQLConnection(2);

// Handlebars config
app.engine('.hbs', handlebars.engine({
    extname: ".hbs",
    defaultLayout: "main",
    helpers: {
        // Return true if items equal
        ifEquals: (item1: any, item2: any) => {
            return item1 == item2;
        },
    }
}));

// Firebase config
initializeApp({
    credential: cert(serviceAccount)
});
const db = getFirestore();
const auth = getAuth();

// Index page
app.get('/', async (req: any, res: any) => {    
    let params: { featuredItems: Array<any>, displayName?: string, photoURL?: string } = {
        featuredItems: []
    }

    // Search Firebase for featured games
    const gamesRef = db.collection("games");
    const games = await gamesRef.where('featured', '==', true).get();

    games.forEach((game: any) => {
        params.featuredItems.push(game.data());
    });

    // Shuffle order of featured games
    params.featuredItems = shuffleArray(params.featuredItems);

    try {
        params.displayName = req.session.user.displayName
    } catch (error: any) {};

    try {
        params.photoURL = req.session.user.photoURL
    } catch (error: any) {};

    res.render("index", params);
})

// Games page
app.get('/games', async (req: any, res: any) => {
    const games = await db.collection("games").get();

    let params: { gamedata: Array<any>, photoURL?: string } = {
        gamedata: []
    }

    // Get all games from Firebase
    let foundGames: Array<any> = [];
    games.forEach((game: any) => {
        foundGames.push(game.data());
    });
    params.gamedata = foundGames;

    try {
        params.photoURL = req.session.user.photoURL
    } catch (error: any) {};

    res.render("games", { pageName: "Games", ...params });
})

// Game page (one specific game by ID)
app.get('/games/:gameID', async (req: any, res: any) => {
    // Firebase query by slug
    const gamesRef = db.collection("games");
    const games = await gamesRef.where('slug', '==', req.params.gameID).get();

    let params: { gamedata: any, photoURL?: string } = {
        gamedata: undefined
    }

    games.forEach((game: any) => {
        params.gamedata = game.data();
    });

    try {
        params.photoURL = req.session.user.photoURL
    } catch (error: any) {};

    // Return game data if request is for JSON, otherwise render game page
    if (req.query.type === "json") {
        res.json(params.gamedata);
    } else {
        if (params.gamedata) {
            console.log({ pageName: params.gamedata.name, ...params });
            res.render("game", { pageName: params.gamedata.name, ...params });
        } else {
            console.error("No game found with slug", req.params.gameID);
            res.render("404");
        }
    }
})

// About page
app.get('/about', async (req: any, res: any) => {
    res.render("about", { pageName: "About" });
})

// Get user's cart items
app.get('/cart', async (req: any, res: any) => {
    res.render("cart", { pageName: "Cart" });
})

// Express config
app.listen(port, () => {
    console.log(`AD Games listening on port ${port}`);
})
app.use(express.static(__dirname + "/public"));
app.set('view engine', 'hbs');
app.set('views', __dirname + '\\private\\views\\');

// Return contents of file
function readFile(path: string) {
	return new Promise<string>((resolve, reject) => {
		fs.readFile(path, 'utf8', (err: any, data: any) => {
			try {
				resolve(data);
			} catch (err) {
                console.error("Error reading file " + path);
                reject(err);
			}
		})
	})
}

// Write content to file
function writeFile(path: string, content: string) {
	return new Promise((resolve, reject) => {
		fs.writeFile(path, content, (err: any) => {
			if (err) {
                console.error(err);
                reject(err);
            } else {
                resolve(true);
            }
		})
	})
}

// Return shuffled array contents
function shuffleArray(array: Array<any>) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Get Locally-cached copy of entire Firebase database
app.get('/store_cache', async (req: any, res: any) => {
	res.json(await getStoreCache());
})

// Locally-cached copy of entire Firebase database
// Purpose: Avoid making unecessary reads to Firebase database.
// REST calls are much cheaper than Firebase queries, plus this helps avoid rate limits
async function getStoreCache() {
    let currentTime = Date.now();
    let store_cache = String(await readFile(__dirname + '/private/data/store_cache.json'));

    if (!store_cache || store_cache == "undefined") {
        store_cache = await rebuildStoreCache();
    }

    let data = JSON.parse(store_cache);
    let timestamp = data[0].last_updated;
    const cacheTime = 600000; // Caches expire after 600000ms (10 minutes)

    // If cache has expired, rebuild cache
    if (currentTime - timestamp >= cacheTime) {
        // Debounce
        if (currentTime - rebuildLastRun >= rebuildTimeout) {
            store_cache = String(await rebuildStoreCache());
            data = JSON.parse(store_cache);    
        }
    }
    return data;
}

// Rebuilds locally-cached copy of Firebase database
const rebuildTimeout = 1000;
let rebuildLastRun = 0;
async function rebuildStoreCache() {
    rebuildLastRun = Date.now();
    console.log("Rebuilding store cache");
    const games = await db.collection("games").get();

    let foundGames: any[] = [];

    games.forEach((game: any) => {
        const resultData = game.data();

        let lowestPrice = Infinity;
        let highestPrice = 0;
        let platforms = [];
        let genres = [];

        for (const product of resultData.products) {
            lowestPrice = Math.min(lowestPrice, product.price);
            highestPrice = Math.max(highestPrice, product.price);
            platforms.push(product.platform);
        }

        for (const genre of resultData.genres) {
            genres.push(genre.toLowerCase());
        }

        foundGames.push({
            name: resultData.name,
            slug: resultData.slug,
            image: resultData.images.coverTall,
            releaseDate: resultData.releaseDate,
            priceRange: [lowestPrice, highestPrice],
            platforms,
            genres
        });
    });

    const store_cache = [{last_updated: Date.now()}, ...foundGames];

    // Write entire contents of Firebase database to store_cache file
    await writeFile(__dirname + '/private/data/store_cache.json', JSON.stringify(store_cache));
    return JSON.stringify(store_cache);
}