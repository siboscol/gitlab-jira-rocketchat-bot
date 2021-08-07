const GitlabEventsNotifier = require('../../../services/gitlabEventsNotifier')

const { IGNORE_CONFIDENTIAL } = process.env

module.exports = {
  issueEvent(data, event) {
    if (event === 'Confidential Issue Hook' && IGNORE_CONFIDENTIAL) {
      return
    }
    const project = data.project || data.repository
    const issue = data.object_attributes
    const { action, state } = issue
    const { assignees, changes, user } = data
    let userAction = action === 'update' ? 'updated' : state

    userAction = action === 'reopen' ? 'reopened' : userAction

    GitlabEventsNotifier.issueEvent(issue, changes, userAction, assignees, user, project)
  },
}
