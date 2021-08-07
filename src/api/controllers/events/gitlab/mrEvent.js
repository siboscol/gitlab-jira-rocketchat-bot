const GitlabAPI = require('../../../services/gitlabAPI')
const GitlabEventsNotifier = require('../../../services/gitlabEventsNotifier')

const { IN_DEV_LABEL = 'In Dev', IN_REVIEW_LABEL = 'In Review' } = process.env

const applyLabelsToIssueMR = async (projectId, issueId, mrId, labels) => {
  if (issueId) {
    await GitlabAPI.addLabelsToIssue(projectId, issueId, labels)
  }
  await GitlabAPI.addLabelsToMR(projectId, mrId, labels)
}

module.exports = {
  async mergeRequestEvent(data) {
    const mr = data.object_attributes
    const { action, state, description, author_id: authorId, work_in_progress: WIP } = mr
    const { changes, user, project, labels, assignees } = data
    const labelsList = labels ? labels.map(l => l.title) : []
    const issueId = description.match(/\d+/) && description.match(/\d+/)[0] ? description.match(/\d+/)[0] : ''

    let userAction = action === 'update' ? 'updated' : state

    userAction = action === 'reopen' ? 'reopened' : userAction

    console.log('MR user action:', userAction)

    try {
      if (action === 'open' && WIP && issueId) {
        // Apply in development label
        labelsList.push(IN_DEV_LABEL)
        // Remove In review label if present
        const cleanList = labelsList.filter(l => l !== IN_REVIEW_LABEL)

        await applyLabelsToIssueMR(project.id, issueId, mr.iid, cleanList)
      } else if (action === 'update' && !WIP && !labelsList.includes(IN_REVIEW_LABEL) && issueId) {
        // Apply In review label
        labelsList.push(IN_REVIEW_LABEL)
        // Remove In dev label if present
        const cleanList = labelsList.filter(l => l !== IN_DEV_LABEL)

        await applyLabelsToIssueMR(project.id, issueId, mr.iid, cleanList)
      } else if (action === 'update' && WIP && !labelsList.includes(IN_DEV_LABEL) && issueId) {
        // Apply In review label
        labelsList.push(IN_DEV_LABEL)
        // Remove In dev label if present
        const cleanList = labelsList.filter(l => l !== IN_REVIEW_LABEL)

        await applyLabelsToIssueMR(project.id, issueId, mr.iid, cleanList)
      }
      // Send notification to RocketChat
      const author = authorId ? await GitlabAPI.getUser(authorId) : ''

      GitlabEventsNotifier.mrEvent(mr, changes, userAction, assignees, author, user, project)
    } catch (error) {
      console.error('mergeRequestEvent error', error)
    }
  },
}
