const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
const Statistic = require('./statisticModel');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { dbName: 'db_stats' });

// Swagger options
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Stats API',
            version: '1.0.0',
            description: 'API documentation for statistics of the main cart service.',
        },
        externalDocs: {
            url: "/swagger.json"
        },
        servers: [
            {
                url: process.env.SWAGGER_URI,
            },
        ],
    },
    apis: ['index.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});
app.get('/v3/api-docs', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Check if the service is running.
 *     responses:
 *       200:
 *         description: Service is running.
 *       500:
 *         description: Service is not running.
 */
app.get('/health', (req, res) => {
    try {
        // You can add more sophisticated health-check logic here if needed
        res.status(200).json({ status: 'Service is running' });
    } catch (error) {
        res.status(500).json({ error: 'Service is not running' });
    }
});

/**
 * @swagger
 * /stats/latest:
 *   get:
 *     summary: Get the latest accessed endpoint.
 *     responses:
 *       200:
 *         description: Successful response with the latest accessed endpoint.
 *       500:
 *         description: Internal Server Error.
 */
app.get('/stats/latest', async (req, res) => {
    try {
        const latestStat = await Statistic.findOne().sort({ timestamp: -1 }).limit(1);
        res.status(200).json(latestStat);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /stats/most-called:
 *   get:
 *     summary: Get the most called endpoint.
 *     responses:
 *       200:
 *         description: Successful response with the most called endpoint.
 *       500:
 *         description: Internal Server Error.
 */
app.get('/stats/most-called', async (req, res) => {
    try {
        const mostCalledStat = await Statistic.aggregate([
            { $group: { _id: "$url", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 1 },
            { $project: { url: "$_id", count: 1, _id: 0 } }

        ]);

        if (mostCalledStat.length === 0) {
            return res.status(404).json({ error: 'No statistics available' });
        }

        res.status(200).json(mostCalledStat[0]);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/**
 * @swagger
 * /stats/endpoint-counts:
 *   get:
 *     summary: Get the count of individual calls for each endpoint.
 *     responses:
 *       200:
 *         description: Successful response with the count of individual calls for each endpoint.
 *       500:
 *         description: Internal Server Error.
 */
app.get('/stats/endpoint-counts', async (req, res) => {
    try {
        const endpointCounts = await Statistic.aggregate([
            { $group: { _id: "$url", count: { $sum: 1 } } },
            { $project: { url: "$_id", count: 1, _id: 0 } }

        ]);

        if (endpointCounts.length === 0) {
            return res.status(404).json({ error: 'No statistics available' });
        }

        res.status(200).json(endpointCounts);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/**
 * @swagger
 * /stats:
 *   post:
 *     summary: Update statistics based on a remote service call.
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: klicanaStoritev
 *         required: true
 *         description: The endpoint called by the remote service.
 *         schema:
 *           type: object
 *           properties:
 *             klicanaStoritev:
 *               type: string
 *     responses:
 *       200:
 *         description: Successful update. Returns updated statistics.
 *       500:
 *         description: Internal Server Error.
 */
app.post('/stats', async (req, res) => {
    try {
        const { calledService } = req.body;
        const newStatistic = new Statistic({
            url: calledService,
            timestamp: new Date().toLocaleString(),
        });

        await newStatistic.save();

        res.status(201).json(newStatistic);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
        console.log(error)
    }
});


// Start the server
app.listen(port, () => {
    console.log(`Stats Server is running on port ${port}`);
});
