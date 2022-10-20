// Load modules
const express = require('express')
const app = express()
const port = 3000

// Index page
app.get('/', async (req: any, res: any) => {    
    res.send("Hello World!");
})

// Express config
app.listen(port, () => {
    console.log(`AD Games listening on port ${port}`);
})