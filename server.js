const express = require('express');
const bodyParser = require('body-parser');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const queue = require('express-queue');
const { scrapeData } = require('./scraper');
const { downloadFiles } = require('./downloader');

// Configuração para múltiplos workers
if (cluster.isMaster) {
    console.log(`Master process ${process.pid} is running`);

    // Fork workers baseado no número de CPUs
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
        // Reinicia o worker se ele morrer
        cluster.fork();
    });
} else {
    const app = express();

    // Configuração otimizada da fila para single client
    const queueMw = queue({ 
        activeLimit: 10,     // Aumentado para permitir mais requisições simultâneas
        queuedLimit: 100     // Fila maior para requisições pendentes
    });

    // Middleware
    app.use(bodyParser.json({ limit: '50mb' }));

    // Headers CORS
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
    });

    // Routes com fila otimizada
    app.post('/scrape', queueMw, scrapeData);
    app.post('/download', queueMw, downloadFiles);

    // Health check route
    app.get('/', (req, res) => {
        res.send('API is up and running!');
    });

    // Status da fila
    app.get('/queue-status', (req, res) => {
        const queueStatus = {
            activeRequests: queueMw.queue.active,
            queuedRequests: queueMw.queue.queued.length,
            totalProcessed: queueMw.queue.total
        };
        res.json(queueStatus);
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).json({
            message: 'Internal Server Error',
            error: process.env.NODE_ENV === 'production' ? {} : err
        });
    });

    // Start the server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Worker ${process.pid} started - Server is running on port ${PORT}`);
    });
}