const express = require('express');
const bodyParser = require('body-parser');
const { scrapeData } = require('./scraper');
const { downloadFiles } = require('./downloader');

const app = express();

// Middleware
app.use(bodyParser.json());

// Routes
app.post('/scrape', scrapeData);
app.post('/download', downloadFiles);

// Health check route
app.get('/', (req, res) => {
    res.send('API is up and running!');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});