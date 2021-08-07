const bodyParser = require('body-parser')
const express = require('express')
const expressErrorHandler = require('@kazaar/express-error-handler')
const helmet = require('helmet')

const api = require('./api')
const { host, port, env } = require('./config')
const logger = require('./config/logger')

const { httpErrorHandler, handleServerError } = expressErrorHandler(logger)

/**
 * Express server initialization
 */
const app = express()

app.set('host', host)
app.set('port', port)

/**
 * Application configuration
 */
app.use(bodyParser.json())
app.use(helmet())

/**
 * API routes
 */
app.use('/webhooks', api)

/**
 * Base route
 */
app.get('/', (req, res) => res.sendStatus(200))

/**
 * Error handling
 */
Error.stackTraceLimit = 10

app.use(httpErrorHandler)

/**
 * Server start
 */
app
  .listen(port, host, () => {
    logger.info(`App is running at ${host}:${port} in ${env} mode`)
  })
  .on('error', handleServerError)

module.exports = app
