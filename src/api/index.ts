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
const axios = require("axios");

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
        // Grabs the video ID from a YouTube link and convert it into an embed link
        embedHelper: (url: string) => {
            if (url.includes("youtube.com")) {
                return `https://www.youtube.com/embed/${url.split("?v=").pop()}`;
            }
            if (url.includes("youtu.be")) {
                return `https://www.youtube.com/embed/${url.split("/").pop()}`;
            }
            return url;
        },
        // Return true if items equal
        ifEquals: (item1: any, item2: any) => {
            return item1 == item2;
        },
        // Return true if either item equal
        logicalOr: (item1: any, item2: any) => {
            return (item1 || item2);
        },
        // Return true if any object in array has specified key/value pair
        anyInArrayHasKeyValue: (array: [], key: string | number, value: any) => {
            for (const item of array) {
                if (item[key] == value) { return true; }
            }
            return false;
        },
        // Format number of pennies as "£XX.XX" string
        priceFormat: (num: number | string, size: number = 3, after: boolean = true) => {
            num = String(num);
            while (num.length < size) {
                num = after ? num + "0" : "0" + num;
            }
            return "£" + num.substring(0, num.length-  2) + "." + num.substring(num.length - 2);
        },
        // Return difference between two numbers
        difference: (num1: number, num2: number) => {
            return Math.abs(num1 - num2);
        },
        // Return alphabetically-sorted array of all keys from input object
        sortDictAlphabetically: (dict: object) => {
            let sorted = Object.keys(dict);
            sorted.sort();
            return sorted;
        },
        // Return price (as number) of lowest-price product
        lowestPriceFromProducts: (products: Array<any>) => {
            let prices = products.map(x => x.price ?? 0);
            prices.sort((a: any, b: any) => a - b);
            return prices[0];
        },
        // Return price (as number) of highest-price product
        highestPriceFromProducts: (products: Array<any>) => {
            let prices = products.map(x => x.price);
            prices.sort((a: any, b: any) => a - b);
            return prices[prices.length - 1];
        },
        // Convert string to title case
        // e.g. "thIS is a StrINg" -> "This Is A String"
        titleCase: (string: string) => {
            return string.replace(/\w\S*/g, (text) => {
                return text.charAt(0).toUpperCase() + text.substring(1).toLowerCase();
            });
        },
        // Get full name of game platform
        // e.g. "ps4" -> "PlayStation 4"
        getFullPlatformName: (shortname: string) => {
            return getFullPlatformName(shortname);
        },
        // Total price of all items in user cart
        cartDataTotalPrice: (cartdata: any) => {
            let totalPrice = 0;
            for (const item of cartdata) {
                totalPrice += item.price;
            }
            return totalPrice;
        },
        // Split string on char, returning specified segment
        splitString: (inputString: string, splitChar: string, segment: number) => {
            const splitString = inputString.split(splitChar);
            return splitString[segment];
        }
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

// Administration page
app.get('/admin', async (req: any, res: any) => {
    if (!req.session.loggedin) {
        req.session.forward = "/admin";
        req.session.save();
        res.redirect("authwall");
        return;
    }

    let params: { photoURL?: string } = {}

    try {
        params.photoURL = req.session.user.photoURL;
    } catch (error: any) {};

    try {
        await checkIfUserIsAdmin(req.session.user.uid);
        res.render("admin", { pageName: "Admin", ...params});
    } catch (error) {
        res.redirect("/");
    }
})

// Login page
app.get('/authwall', async (req: any, res: any) => {
    // Forward user if already logged in
    if (req.session.loggedin) {
        const forward = req.session.forward;
        if (forward) {
            res.redirect(forward);
        } else {
            res.redirect("back");
        }
    } else {
        res.render("authwall", { pageName: "Auth Wall" });
    }
})

// Search for games
app.get('/search', async (req: any, res: any) => {
    let responseCode: number = 200;
	const term = req.query.term || "";
    const sort = req.query.sort || "relevance";
    const genre = req.query.genre || "all";
    const platform = req.query.platform || "all";
    const pageLen = parseInt(req.query.pagelen) || 5;
    const from = parseInt(req.query.from) || 0;

    let store_cache = await getStoreCache();
    store_cache.shift();

    // Genre filter
    if (genre !== "all") {
        store_cache = store_cache.filter((item: any) => item.genres.includes(genre));
    }

    // Platform filter
    if (platform !== "all") {
        store_cache = store_cache.filter((item: any) => item.platforms.includes(platform));
    }

    const results = store_cache.length;

    // Sort results
    switch (sort) {
        case "relevance":
            // Very simple ranked search by game title
            for (let item of store_cache) {
                let score = 0;
                const name = item.name.toLowerCase();
                const indexSearch = name.indexOf(term.toLowerCase());
        
                if (indexSearch == 0) {
                    score = 3;
                } else if (indexSearch > 0) {
                    score = 2;
                } else {
                    score = 1;
                }
        
                item.score = score;
            }
            store_cache.sort((a: any, b: any) => b.score - a.score);
            break;
        case "releasedateasc":
            store_cache.sort((a: any, b: any) => a.releaseDate - b.releaseDate);
            break;
        case "releasedatedesc":
            store_cache.sort((a: any, b: any) => b.releaseDate - a.releaseDate);
            break;
        case "priceasc":
            store_cache.sort((a: any, b: any) => a.priceRange[0] - b.priceRange[0]);
            break;
        case "pricedesc":
            store_cache.sort((a: any, b: any) => b.priceRange[0] - a.priceRange[0]);
            break;
    }

    // Pagination
    store_cache = store_cache.slice(from, from + pageLen);

    if (store_cache.length == 0) {
        responseCode = 400;
    }

    res.status(responseCode).json([{ results }, ...store_cache]);
})

// Express config
app.listen(port, () => {
    console.log(`AD Games listening on port ${port}`);
})
app.use(express.static(__dirname + "/public"));
app.set('view engine', 'hbs');
app.set('views', __dirname + '\\private\\views\\');

// Add new game to Firebase database, or overwrite if already exists
app.post('/addgame', async (req: any, res: any) => {
    // Check user is logged in
    if (!req.session.loggedin) {
        res.status(401).send(`Not logged in`);
        return;
    }

    // Check user is administrator
    try {
        await checkIfUserIsAdmin(req.session.user.uid);
    } catch (error) {
        res.status(403).send(`Not an administrator`);
        return;
    }

    let responseCode: number = 200;
    let products = [];

    // Array of products relating to the game
    // "product" == "SKU"
    for (const product of req.body.products) {
        products.push({
            msrp: parseInt(product.msrp),
            platform: product.platform,
            price: parseInt(product.price),
            stock: parseInt(product.stock)
        })
    }

    const gameData = {
        description: req.body.desc,
        genres: req.body.genres.replace(", ", ",").split(","),
        images: {
            coverTall: req.body.coverTall,
            coverWide: req.body.coverWide ?? req.body.coverTall
        },
        name: req.body.name,
        pegi: parseInt(req.body.pegi) ?? null,
        releaseDate: req.body.releaseDate,
        slug: req.body.slug,
        studio: {
            name: req.body.studioName,
            url: req.body.studioUrl
        },
        trailer: req.body.trailer,
        products: products
    }

    // Search for existing game with matching slug
    const gamesRef = db.collection("games");
    const query = gamesRef.where('slug', '==', req.body.slug);
    const snapshot = await query.count().get();
    const count = await snapshot.data().count;

    // Update game if exists
    if (count < 1) {
        try {
            await gamesRef.doc().set(gameData);
            res.status(responseCode).send(`Item '${req.body.slug}' added`);
        } catch (error: any) {
            responseCode = 400;
            res.status(responseCode).send(`Error adding item: ${error}`);
        }
    // Add game if not exists
    } else {
        const games = await query.get();
        await games.forEach(async (game: any) => {
            try {
                await gamesRef.doc(game.id).update(gameData);
                res.status(responseCode).send(`Item '${req.body.slug}' updated`);
            } catch (error: any) {
                responseCode = 400;
                res.status(responseCode).send(`Error updating item: ${error}`);
            }
        });
    }
})

// Delete game from Firebase database
app.post('/deletegame', async (req: any, res: any) => {
    // Check user is logged in
    if (!req.session.loggedin) {
        res.status(401).send(`Not logged in`);
        return;
    }

    // Check user is administrator
    try {
        await checkIfUserIsAdmin(req.session.user.uid);
    } catch (error) {
        res.status(403).send(`Not an administrator`);
        return;
    }

    // Firebase search
    const gamesRef = db.collection("games");
    const games = await gamesRef.where('slug', '==', req.body.slug).get();

    games.forEach(async (game: any) => {
        try {
            await game.ref.delete()
            res.status(200).send(`Item '${req.body.slug}' deleted`);
        } catch (error: any) {
            res.status(400).send(`Error deleting item '${req.body.slug}'`);
        }
    });
})

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

// Resolve if user is administrator
async function checkIfUserIsAdmin(uid: string) {
    return new Promise<boolean>((resolve, reject) => {
        const sql = `SELECT * FROM administrators WHERE UID = ${mysql.escape(uid)}`;
        connection.query(sql, async (error: any, result: any) => {
            if (error) {
                reject(false);
            }

            if (result.length >= 1) {
                resolve(true);
            }

            reject(false);
        });
	})
}

// Stripe config
const stripe = require("stripe")(stripe_creds.privateKey);

app.post("/create-checkout-session", async (req: any, res: any) => {
    if (!req.session.loggedin) {
        res.status(401).send("Not logged in");
        return;
    }

    const uid = req.session.user.uid;

    let cartItems: Array<any> = [];
    let metadata: any = {};

    const sql = `SELECT * FROM carts WHERE UID = '${uid}';`;
    await connection.query(sql, async (error: any, result: any) => {
        if (error) {
            console.log(error);
            return;
        }

        for (const item of result) {
            const docRef = db.collection("games").doc(item.ProductID);
            const doc = await docRef.get();
            const docData = doc.data();

            if (!docData) {
                continue;
            }

            const docProducts = docData.products;
            const docProduct = docProducts.filter((product: any) => product.platform == item.ProductPlatform)[0];
            
            cartItems.push({
                price_data: {
                    currency: 'gbp',
                    product_data: {
                        name: docData.name + " - " + getFullPlatformName(item.ProductPlatform)
                    },
                    unit_amount: docProduct.price
                },
                quantity: 1
            })

            metadata[item.ProductID + "/-/" + item.ProductPlatform] = String(docProduct.price) + "/-/" + docData.name;
        }

        try {
            const params = {
                payment_method_types: ['card'],
                mode: 'payment',
                success_url: req.protocol + '://' + req.get('host') + "/success",
                cancel_url: req.protocol + '://' + req.get('host') + "/cart",
                line_items: cartItems,
                metadata: metadata
            };

            console.log(params);

            const session = await stripe.checkout.sessions.create(params)
            req.session.stripeSessionId = session.id;
            req.session.save();
            res.status(301).send(session.url);
        } catch (error: any) {
            console.log(error);
            res.status(500).send(error);
        }
    });
});

// Return full name of platform from short name
// e.g. "xboxone" -> "Xbox One"
function getFullPlatformName(shortname: string) {
    const platforms: any = {
        "ps4": "PlayStation 4",
        "ps5": "PlayStation 5",
        "xboxone": "Xbox One",
        "xboxseries": "Xbox Series X|S",
        "pc": "PC",
        "switch": "Nintendo Switch"
    }

    if (platforms.hasOwnProperty(shortname)) {
        return platforms[shortname];
    }

    return shortname;
}

// Success page loaded after successful transaction
app.get('/success', async (req: any, res: any) => {
    // Check user is logged in and has a payment session in progress
    if (!req.session.loggedin || !req.session.stripeSessionId) {
        res.redirect("/");
        return;
    }

    const sessionId: string = req.session.stripeSessionId;

    let params: { gamedata: Array<any>, metadata?: any, photoURL?: string } = {
        gamedata: []
    }

    const apilink = "https://api.stripe.com/v1/checkout/sessions/" + sessionId;

    // Get payment session details from Stripe
    const session = await axios.get(apilink, {
        headers: {
            Authorization: `Bearer ${stripe_creds.privateKey}`
        }
    });

    // Verify session is paid
    if (session.data.status === "complete") {    
        for (const key of Object.keys(session.data.metadata)) {
            const uid = req.session.user.uid;
            const value = session.data.metadata[key];
            const price = parseInt(value.split("/-/")[0])
            const itemID = key.split("/-/")[0];
            const itemPlatform = key.split("/-/")[1];
            // Move items from 'cart' to 'purchases'
            await connection.query(`DELETE FROM carts WHERE UID = ${mysql.escape(uid)}' AND ProductID = ${mysql.escape(itemID)} AND ProductPlatform = ${mysql.escape(itemPlatform)};`, async (error: any, result: any) => {});
            await connection.query(`INSERT INTO purchases (UID, ProductID, ProductPlatform, Price) VALUES (${mysql.escape(uid)}, ${mysql.escape(itemID)}, ${mysql.escape(itemPlatform)}, ${mysql.escape(price)})`, async (error: any, result: any) => {});
            try {
                params.metadata = session.data.metadata
            } catch (error: any) {};
            // Clear payment session
            req.session.stripeSessionId = null;
            req.session.metadata = null;
        }
    }

    try {
        params.photoURL = req.session.user.photoURL
    } catch (error: any) {};
    
    res.render("success", { pageName: "Success", ...params });
})

async function addToCart(e: any) {
    const platform = e.attributes.platform.value;
    const slug = e.attributes.slug.value;


    const response = await axios.post("../addtocart", {
        platform,
        slug
    }, {
        validateStatus: false
    })

    switch (response.status) {
        case 401:
            window.location.href = '/authwall';
            break;
        case 400:
            if (response.data.includes("already in cart")) {
                alert("Item already in cart");
            }
            break;
        case 200:
            alert("Item added to cart");
            break;
    }

    console.log(response);
}

async function removeFromCart(e: any) {
    const parentNode = e.parentNode;
    const itemID = parentNode.attributes.productid.value;
    const itemPlatform = parentNode.attributes.platform.value;

    const response = await axios.post("../removefromcart", {
        itemID,
        itemPlatform
    }, {
        validateStatus: false
    })

    if (response.status == 200) {
        const cartItems = document.querySelectorAll(".cart-item").length;
        if (cartItems <= 1) {
            location.reload();
        } else {
            parentNode.remove();
            const newCartItems = document.querySelectorAll(".cart-item");
            let newTotalPrice = 0;
            for (const item of newCartItems) {
                let priceStr = item.querySelector(".cart-item-price").innerHTML;
                priceStr = priceStr.replace(/\D/g,'');
                newTotalPrice += parseInt(priceStr);
            }
            document.querySelector("#purchase-total").innerHTML = priceFormat(newTotalPrice);
        }
    }
}

function priceFormat(num: any, size = 3, after = true) {
    num = String(num);
    while (num.length < size) {
        num = after ? num + "0" : "0" + num;
    }
    return "£" + num.substring(0, num.length-  2) + "." + num.substring(num.length - 2);
}

// Add item to user's cart
app.post('/addtocart', async (req: any, res: any) => {
    let responseCode: number = 200;
    
    // Check user is logged in
    if (req.session.loggedin) {
        const platform: string = req.body.platform;
        const slug: string = req.body.slug;
        const uid: string = req.session.user.uid;
        let gameID: string = undefined;

        // Firebase search for game by slug
        const gamesRef = db.collection("games");
        const query = gamesRef.where('slug', '==', slug);
        const snapshot = await query.count().get();
        const count = await snapshot.data().count;
        
        // Add to cart if exists
        if (count < 1) {
            responseCode = 404;
            res.status(responseCode).send(`Error adding item '${slug}' to cart, unable to find item`);
        } else {
            const games = await query.get();
            await games.forEach(async (game: any) => {
                gameID = game.id;
            });
        }

        // Add item to carts table in SQL database
        const sql = `INSERT INTO carts VALUES (${mysql.escape(uid)}, ${mysql.escape(gameID)}, ${mysql.escape(platform)});`;
        connection.query(sql, (error: any, result: any) => {
            if (error) {
                responseCode = 400;
                if (error.code == "ER_DUP_ENTRY") {
                    res.status(responseCode).send(`Error adding item '${slug}' to cart, item already in cart`);
                } else {
                    res.status(responseCode).send(`Error adding item '${slug}' to cart, ${error.code}`);
                }
                return;
            }

            res.status(responseCode).send(`Added item '${slug}' to cart`);
        });
    } else {
        responseCode = 401;
        res.status(responseCode).send("Not logged in");
    }
})

// Remove item from user cart
app.post('/removefromcart', async (req: any, res: any) => {
    let responseCode: number = 200;
    
    // Check user is logged in
    if (req.session.loggedin) {
        const platform: string = req.body.itemPlatform;
        const id: string = req.body.itemID;
        const uid: string = req.session.user.uid;

        // Delte item from carts table in SQL database
        const sql = `DELETE FROM carts WHERE UID = ${mysql.escape(uid)} AND ProductID = ${mysql.escape(id)} AND ProductPlatform = ${mysql.escape(platform)}`;
        connection.query(sql, (error: any, result: any) => {
            if (error) {
                responseCode = 400;
                res.status(responseCode).send(`Unable to remove item from cart`);
                return;
            }

            res.status(responseCode).send(`Item removed from cart:${id}:${platform}`);
        });
    } else {
        responseCode = 401;
        res.status(responseCode).send("Not logged in");
    }
})

// Change user details (username, avatar)
app.post('/changedetails', async (req: any, res: any) => {
    let responseCode: number = 200;
    const uname: string = req.body.uname || null;
    const photoURL: string = req.body.photoURL;
    const uid: any = req.session.user.uid;

    let updates: { displayName?: string, photoURL?: string } = {};

    if (uname) {
        updates.displayName = uname;
    }

    if (photoURL) {
        updates.photoURL = photoURL;
    }

    const user = await getAuth().updateUser(uid, updates)
    
    req.session.user = user;
    req.session.save();
    res.status(responseCode).send("Success");
})

// Catch 404's
app.get('*', function(req: any, res: any){
    res.render("404");
});