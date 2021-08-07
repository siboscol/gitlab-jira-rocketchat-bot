const { Router } = require('express')
const { NotFound } = require('http-errors')
const morgan = require('morgan')

const logger = require('../config/logger')
const gitlabWebhookHandler = require('./controllers/gitlabWebhookHandler')
const jiraWebhookHandler = require('./controllers/jiraWebhookHandler')

const router = Router()

/**
 * Router configuration
 */
router.use(
  morgan(':status - [:method :url - :remote-addr] :response-time ms', {
    stream: {
      write: message => logger.info(message),
    },
    skip: (req, res) => res.statusCode >= 400,
  })
)

/**
 * API routes
 */
router.get('/jira', (req, res) => res.sendStatus(200))

router.post('/jira', (req, res) => {
  res.sendStatus(200)
  jiraWebhookHandler.processIncomingRequest(req, res)
})

router.get('/', (req, res) => res.sendStatus(200))

router.post('/', (req, res) => {
  res.sendStatus(200)
  gitlabWebhookHandler.processIncomingRequest(req, res)
})

/**
 * 404 error handling
 */
router.use((req, res, next) => {
  const { baseUrl, url, method } = req

  next(new NotFound(`The route '${method} ${baseUrl}${url}' doesn't exist.`))
})

module.exports = router
