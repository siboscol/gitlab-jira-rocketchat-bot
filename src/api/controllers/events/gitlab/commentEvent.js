const { getUser, getMRParticipants } = require('../../../services/gitlabAPI')
const GitlabEventsNotifier = require('../../../services/gitlabEventsNotifier')

module.exports = {
  async commentEvent(data) {
    const project = data.project || data.repository
    const comment = data.object_attributes
    const { user } = data

    try {
      if (data.merge_request) {
        const { merge_request: mr, project_id: projectId } = data
        const participants = await getMRParticipants(projectId, mr.iid)

        GitlabEventsNotifier.mrCommentEvent(comment, mr, user, participants, project)
      } else if (data.commit) {
        const { commit } = data
        const assignee = commit.assignee_id ? await getUser(commit.assignee_id) : ''

        GitlabEventsNotifier.commitCommentEvent(comment, commit, assignee, user, project)
      } else if (data.issue) {
        const { issue } = data
        const assignee = issue.assignee_id ? await getUser(issue.assignee_id) : ''

        GitlabEventsNotifier.issueCommentEvent(comment, issue, assignee, user, project)
      } else if (data.snippet) {
        // Not implemented yet
      }
    } catch (error) {
      console.error('commentEvent error', error)
    }
  },
}
