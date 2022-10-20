// Load modules
const express = require('express')
const app = express()
const port = 3000
const fs = require('fs');

// Index page
app.get('/', async (req: any, res: any) => {    
    const index = await readFile(__dirname + "/private/views/index.html");
    res.send(index);
})

// Express config
app.listen(port, () => {
    console.log(`AD Games listening on port ${port}`);
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