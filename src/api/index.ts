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
    res.render("index", { pageName: null });
})

// Games page
app.get('/games', async (req: any, res: any) => {
    res.render("games", { pageName: "Games" });
})

// Game page (one specific game by ID)
app.get('/games/:gameID', async (req: any, res: any) => {
    res.render("game", { pageName: "Game" });
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