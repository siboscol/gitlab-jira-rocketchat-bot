/* jshint  esnext:true */
const RocketChat = require('../services/rocketchatAPI')

const DESC_MAX_LENGTH = 140
const JIRA_LOGO =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAACRElEQVRYhbWXsUscQRTGf4iIyHHIISIWIsHisMgfkNIiBJFwiKQIkipVqpA/wEZEggSxEkmZwiKI5A84REKKkIMQrINYBQmHBDmEHJdNMW+42dk3d3O76wcDu2/e973vZvfN7EF+PAfaMjYL6AzFJFBRYh0gkdEBpryciuQVwjPgFugCu068CvQcAz1g2pnfEc6taOTGL6dIAjxw5nad+FsnvuhxrosYuPbElrz5Rc8Ucu9yfhcxsAncYZZ4fwTeO+HcUcILWgFqOXg1si9vFBrAXB7iEMySfYQZzGCeWxdoAq+Bh8BYjoJjwn0jWrYrqsOIbdIvUQLseTmPgHXgiYx1ibnYU3RuYpyfKMQ/mNWx+KzkfHHmZ4Tj55zGGNhQiAlw5OQ8VeYbzvxRQCNqUxoHLgMCa07eRyd+4sTXAtwrYCLGAJje1URugLrkVIHvMuyLVZccjfsitrhFMyD0k36bTtA/cOZkTuOckaOTFtA7IgEuSG9ONeBHILctWrnwGNO/mvA3zAk4LddaThfTpoXwKiBuVyL0yxPhloLtAUVCY7us4hb7IxQ/KLu4xWFE8cP7Kg6mld4PKH5BvoNrZBMfBphohKnFMAusyvU48ClgoA3M34eBUynwUu6ngK8BE1Gn3ihYccR79Jd5nuyXsx0rZRo498Q7mK8dMDudZuC8rOLLgQI7Ts5xIGe5DANbinCP9AfmEul/SnZslWHgTBFuKnna8a3lpRCzadSVWMiAj6GPIMbAX+/+H9BS8loyN4ibwX9j/jIXDkk+pgAAAABJRU5ErkJggg=='

function stripDesc(str) {
  return str && str.length > DESC_MAX_LENGTH ? `${str.slice(0, DESC_MAX_LENGTH - 3)}...` : str
}

function prepareAttachment({ issue, user }, text) {
  const issueType = issue.fields.issuetype
  const res = {
    author_name: `${user.displayName}`,
    author_icon: user.avatarUrls['24x24'],
    thumb_url: issueType.iconUrl,
  }

  if (text) {
    res.text = text.replace(
      /\{\{(user|issue)\.([^a-z_0-9]+)\}\}/g,
      (m, type, key) => (type === 'user' ? user : issue)[key]
    )
  }

  return res
}

const capitalize = s => {
  if (typeof s !== 'string') return ''

  return s.charAt(0).toUpperCase() + s.slice(1)
}

module.exports = {
  async processIncomingRequest(req) {
    const data = req.body

    try {
      if (!data.issue || (data.user && data.user.name === 'gitlab')) {
        return
      }
      const { issue } = data
      const baseJiraUrl = issue.self.replace(/\/rest\/.*$/, '')
      const { user } = data
      const summary =
        (issue.fields.summary && issue.fields.summary.split('] ') && issue.fields.summary.split('] ')[1]) ||
        issue.fields.summary
      const issueSummary = `[${issue.key}](${baseJiraUrl}/browse/${issue.key}) ${summary}`

      const message = {
        icon_url:
          (issue.fields.project && issue.fields.project.avatarUrls && issue.fields.project.avatarUrls['48x48']) ||
          JIRA_LOGO,
        attachments: [],
      }

      if (data.webhookEvent === 'jira:issue_created') {
        message.text = `:warning: New Incident *created* :warning: ${issueSummary}`
        if (issue.fields.reporter) {
          message.text += `\nThe *incident manager* is @${issue.fields.reporter.name}`
        }
        message.attachments.push(prepareAttachment(data, `@here ${stripDesc(issue.fields.description || '')}`))
        const membersList = issue.fields.assignee ? [user, issue.fields.assignee] : [user]
        const customField = issue.fields.customfield_10700 || []

        // Check for CustomField
        if (issue.fields.customfield_10503) {
          customField.push(issue.fields.customfield_10503)
        }

        await RocketChat.createChannel(issue.key, membersList.concat(customField))
        await this.sendMessageToMainChannel(message, user)
        await this.sendMessageToIncidentChannel(message, user, issue.key)
      } else if (data.webhookEvent === 'jira:issue_deleted') {
        message.attachments.push(prepareAttachment(data, `*Deleted* ${issueSummary}`))
        await RocketChat.deleteChannel(issue.key)
        await this.sendMessageToMainChannel(message, user)
      } else if (data.webhookEvent === 'jira:issue_updated') {
        if (data.changelog && data.changelog.items) {
          // field update
          const logs = []

          data.changelog.items.forEach(async change => {
            if (!change.field.match('status|comment|description|assignee') && !change.fieldtype.match('custom')) {
              return
            }
            if (change.field === 'description') {
              logs.push(`Changed *description* to:\n${stripDesc(change.toString)}`)
            } else if (change.fromString) {
              logs.push(
                `*${capitalize(change.field)}* changed from __${change.fromString}__ to *${
                  change.toString || 'unassigned'
                }*`
              )
            } else {
              logs.push(`*${capitalize(change.field)}* changed to *${change.toString}*`)
            }

            if (change.field === 'assignee') {
              if (issue.fields.assignee) {
                const channelMembers = await RocketChat.getChannelMembers(issue.key)

                if (
                  Array.isArray(channelMembers) &&
                  !channelMembers.some(m => m.username === issue.fields.assignee.name)
                ) {
                  await RocketChat.inviteToChannel(issue.key, issue.fields.assignee.name)
                }
              }
            }

            if (change.field === 'Helpers/Cross Dev. Testers' || change.field === 'Dev') {
              const channelMembers = await RocketChat.getChannelMembers(issue.key)

              issue.fields.customfield_10700.forEach(async helper => {
                if (Array.isArray(channelMembers) && !channelMembers.some(m => m.username === helper.name)) {
                  await RocketChat.inviteToChannel(issue.key, helper.name)
                }
              })
            }

            if (change.field === 'status') {
              if (change.toString === 'Resolved') {
                message.text = `:clap: Incident *${issue.key}* is now resolved and service is back to normal. :clap:`
                if (logs.length && logs[0]) {
                  logs[0] = `@here ${logs[0]}`
                }
                await this.sendMessageToMainChannel(message, user)
              }
              if (change.toString === 'Closed') {
                await RocketChat.archiveChannel(issue.key)
              }
              if (change.toString === 'Reopened') {
                await RocketChat.unarchiveChannel(issue.key)
              }
              if (change.toString === 'In Progress') {
                await this.sendMessageToMainChannel(message, user)
              }
            }
          })
          if (logs.length) {
            message.attachments.push(prepareAttachment(data, `*Updated* ${issueSummary}\n  - ${logs.join('\n  - ')}`))
          }
        }

        if (data.comment) {
          // comment update
          const { comment } = data
          const action = comment.created !== comment.updated ? 'Updated comment' : 'Commented'

          message.attachments.push(
            prepareAttachment(data, `*${action}* on ${issueSummary}\n${stripDesc(comment.body)}`)
          )
        }
        // Send message to the Incident Channel
        await this.sendMessageToIncidentChannel(message, user, issue.key)
      }
    } catch (e) {
      console.log('jiraWebhookHandler Error', e)
    }
  },
  async sendMessageToMainChannel(message, user) {
    const messageCopy = { ...message }

    delete messageCopy.channel
    await RocketChat.post(messageCopy, user, true)
  },
  async sendMessageToIncidentChannel(message, user, channel) {
    const messageCopy = { ...message }

    messageCopy.channel = channel
    await RocketChat.post(messageCopy, user, true)
  },
}
