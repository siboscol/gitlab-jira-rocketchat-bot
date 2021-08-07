const axios = require('axios').default

const gitlab = axios.create({
  baseURL: process.env.GITLAB_HOST ? `${process.env.GITLAB_HOST}/api/v4` : 'http://localhost/api/v4',
  headers: { 'PRIVATE-TOKEN': process.env.GITLAB_ACCESS_TOKEN },
})

module.exports = {
  async addLabelsToIssue(projectId, issueId, labels = []) {
    try {
      if (!(projectId && issueId && labels.length)) {
        throw new Error('Missing parameters')
      }
      await gitlab.put(`/projects/${projectId}/issues/${issueId}`, {
        labels: labels.join(),
      })

      console.log(`Added labels ${labels.join()} to Issue ${issueId}`)
    } catch (error) {
      this.logError(error, 'ADD-LABEL-TO-ISSUE')
    }
  },
  async addLabelsToMR(projectId, mrId, labels = []) {
    try {
      if (!(projectId && mrId && labels.length)) {
        throw new Error('Missing parameters')
      }
      await gitlab.put(`/projects/${projectId}/merge_requests/${mrId}`, {
        labels: labels.join(),
      })

      console.log(`Added labels ${labels.join()} to MR ${mrId}`)
    } catch (error) {
      this.logError(error, 'ADD-LABEL-TO-MR')
    }
  },
  async getProjectMilestone(projectId, milestoneId) {
    try {
      if (!(projectId && milestoneId)) {
        throw new Error('Missing parameters')
      }
      const res = await gitlab.get(`/projects/${projectId}/milestones/${milestoneId}`)

      return res.data
    } catch (error) {
      const errorTypeName = 'GET-PROJECT-MILESTONE'

      this.logError(error, errorTypeName)
      throw new Error(errorTypeName + error.message)
    }
  },
  async getUser(userId) {
    try {
      if (!userId) {
        throw new Error('Missing parameters')
      }
      const res = await gitlab.get(`/users/${userId}`)

      return res.data
    } catch (error) {
      const errorTypeName = 'GET-USER'

      this.logError(error, errorTypeName)
      throw new Error(errorTypeName + error.message)
    }
  },
  async getMRParticipants(projectId, mrId) {
    try {
      if (!projectId || !mrId) {
        throw new Error(`Missing parameters, ${projectId}, ${mrId}`)
      }
      const res = await gitlab.get(`/projects/${projectId}/merge_requests/${mrId}/participants`)

      return res.data
    } catch (error) {
      const errorTypeName = 'GET-MR-PARTICIPANTS'

      this.logError(error, errorTypeName)
      throw new Error(errorTypeName + error.message)
    }
  },
  logError(error, method) {
    if (error) {
      const methodInfo = method ? `[${method}]` : ''

      console.log(`Gitlab ${methodInfo} Error:`, error.message)
      if (error.response && error.response.data) {
        let message = error.response.data.error ? error.response.data.error : ''

        message = error.response.data.message ? error.response.data.message : message
        console.log('Error details:', message)
      }
    }
  },
}
