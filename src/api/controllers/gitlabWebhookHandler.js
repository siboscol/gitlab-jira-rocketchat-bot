const { issueEvent } = require('./events/gitlab/issueEvent')
const { mergeRequestEvent } = require('./events/gitlab/mrEvent')
const { commentEvent } = require('./events/gitlab/commentEvent')

module.exports = {
  processIncomingRequest(req) {
    try {
      // const { channel } = req.url.query;
      const event = req.headers['x-gitlab-event']
      const { body } = req

      console.log('Event triggered:', event)

      switch (event) {
        case 'Confidential Issue Hook':
        case 'Issue Hook':
          issueEvent(body, event)
          break
        case 'Merge Request Hook':
          mergeRequestEvent(body)
          break
        case 'Note Hook':
          commentEvent(body)
          break
        default:
          break
      }
    } catch (err) {
      console.log('gitlab event error', err)
    }
  },
}
