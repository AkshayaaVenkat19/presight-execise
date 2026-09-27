const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const healthRoutes = require('./routes/health.routes');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');
const { requestLogger } = require('./middleware/logging.middleware');

const app = express();
app.disable('x-powered-by');
app.use(requestLogger);
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use('/health', healthRoutes);
app.use('/api', routes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
