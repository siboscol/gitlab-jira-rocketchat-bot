const RocketChatAPI = require('./rocketchatAPI')
const { getProjectMilestone } = require('./gitlabAPI')

const { IN_DEV_LABEL = 'In Dev', IN_REVIEW_LABEL = 'In Review', NOTIF_COLOR } = process.env

// RocketChat reference payload
// const example = {
//   alias: 'Gruggy',
//   avatar: 'http://res.guggy.com/logo_128.png',
//   channel: '@sberto',
//   emoji: ':smirk:',
//   roomId: 'Xnb2kLD2Pnhdwe3RH',
//   text: 'Sample message at @sberto',
//   attachments: [
//     {
//       audio_url: 'http://www.w3schools.com/tags/horse.mp3',
//       author_icon: 'https://avatars.githubusercontent.com/u/850391?v=3',
//       author_link: 'https://rocket.chat/',
//       author_name: 'Bradley Hilton',
//       collapsed: false,
//       color: '#ff0000',
//       fields: [
//         {
//           short: true,
//           title: 'Test',
//           value: 'Testing out something or other',
//         },
//         {
//           short: true,
//           title: 'Another Test',
//           value: '[Link](https://google.com/) something and this and that.',
//         },
//       ],
//       image_url: 'http://res.guggy.com/logo_128.png',
//       message_link: 'https://google.com',
//       text: 'Yay for gruggy! @sberto',
//       thumb_url: 'http://res.guggy.com/logo_128.png',
//       title: 'Attachment Example',
//       title_link: 'https://youtube.com',
//       title_link_download: true,
//       ts: '2016-12-09T16:53:06.761Z',
//       video_url: 'http://www.w3schools.com/tags/movie.mp4',
//     },
//   ],
// }

// const refParser = ref => ref.replace(/^refs\/(?:tags|heads)\/(.+)$/, '$1')
const displayName = name => name && name.split(' ')[0]
const atName = user => (user && user.username ? `@${displayName(user.username)}` : '')
const makeAttachment = (author, text, color) => {
  return {
    author_name: author ? author.name : '',
    author_icon: author ? author.avatar_url : '',
    text,
    color: color || NOTIF_COLOR,
  }
}
const capitalize = s => {
  if (typeof s !== 'string') return ''

  return s.charAt(0).toUpperCase() + s.slice(1)
}

const getAssigneesAtList = (assignees = []) => {
  if (assignees && assignees.length) {
    const assigneesList = assignees.map(assignee => atName(assignee))

    return assigneesList.join(', ')
  }

  return []
}

const getChangesDescList = async (changes, projectId) => {
  const updates = []
  const types = Object.keys(changes)

  /* eslint-disable no-await-in-loop */
  for (let i = 0; i < types.length; i += 1) {
    const type = types[i]
    const currentChange = changes[type].current

    if (type === 'labels') {
      const labelList = currentChange.map(l => l.title).join(', ')

      updates.push(`*${capitalize(type)}*: ${labelList || 'No Labels'}`)
    } else if (type === 'description') {
      updates.push(`*${capitalize(type)}*: \n${currentChange}`)
    } else if (type === 'milestone_id') {
      if (currentChange && projectId) {
        const milestone = await getProjectMilestone(projectId, currentChange)

        updates.push(`*Milestone*: ${milestone.title}`)
      } else {
        updates.push('*Milestone*: No Milestone')
      }
    } else if (type === 'assignees') {
      const assigneesList = getAssigneesAtList(currentChange)

      if (assigneesList && assigneesList.length) {
        updates.push(`*${capitalize(type)}*: ${assigneesList}`)
      }
    }
  }

  /* eslint-enable no-await-in-loop */
  return updates
}

const hasLabel = (changes, label) => {
  if (changes.labels && changes.labels.current) {
    return !!changes.labels.current.find(l => l.title === label)
  }

  return false
}

const isInDev = changes => {
  return hasLabel(changes, IN_DEV_LABEL)
}

const isInReview = changes => {
  return hasLabel(changes, IN_REVIEW_LABEL)
}

const buildUpdatesList = async (changes, projectId) => {
  let updatesList = ''
  const changesList = await getChangesDescList(changes, projectId)

  if (changesList.length) {
    updatesList = `*Updates:*\n- ${changesList.join('\n- ')}`
  }

  return updatesList
}

const prepareMessage = (project, user, text, details) => {
  return {
    username: `gitlab/${project.name}`,
    icon_url: user.avatar_url || project.avatar_url || '',
    text,
    attachments: [makeAttachment(user, details)],
  }
}

const prepareEventDescription = (user, type, action, target, projectName, status) => {
  return `${user ? displayName(user.name) : ''} *${action}* \
  the ${type} [#${target.iid} ${target.title.replace('"', '')}](${target.url}) on *${projectName}*.
  ${status}`
}

// const addUrlToUpdates = (updates, url) => {
//   let eventDetails = ''

//   if (updates && url) {
//     eventDetails = `${updates}
//       *See*: ${url}`
//   } else if (url) {
//     eventDetails = `*See*: ${url}`
//   }

//   return eventDetails
// }

const inDevelopBy = (changes, type, author) => {
  return isInDev(changes) && author ? `The ${type} is currently in *Development* by ${atName(author)}` : ''
}

const inReviewTo = (changes, type, assignees = []) => {
  const assigneesList = getAssigneesAtList(assignees)

  return isInReview(changes) && assignees && assignees.length
    ? `The ${type} is available for *Review* to ${assigneesList}`
    : ''
}

const assignedTo = (assignees = []) => {
  const assigneesList = getAssigneesAtList(assignees)

  return assignees && assignees.length ? `*Assigned to*: ${assigneesList}` : ''
}

const createdBy = author => {
  return author ? `*Created by*: ${atName(author)}` : ''
}

const getProjectChannelName = (projectName = '') => {
  return projectName ? `${projectName}_alert` : ''
}

module.exports = {
  async send(message, user, projectName = '') {
    try {
      // Sending to the project channel
      const channelName = getProjectChannelName(projectName)
      const finalMessage = message

      if (channelName) {
        finalMessage.channel = channelName
      }
      await RocketChatAPI.post(finalMessage, user)

      // If user is not in the channel, invite him
      const channelMembers = await RocketChatAPI.getChannelMembers(channelName)

      if (channelMembers.length) {
        if (!channelMembers.some(m => m.username === user.username)) {
          await RocketChatAPI.inviteToChannel(channelName, user.username)
        }
      }
    } catch (error) {
      this.logError(error, 'SEND')
    }
  },
  logError(error, method) {
    if (error) {
      const methodInfo = method ? `[${method}]` : ''

      console.log(`GitlabEventsNotifier ${methodInfo} Error:`, error.message)
      if (error.response && error.response.data) {
        let message = error.response.data.error ? error.response.data.error : ''

        message = error.response.data.message ? error.response.data.message : message
        console.log(`GitlabEventsNotifier ${methodInfo} Error Details:`, message)
      }
    }
  },
  async issueEvent(issue, changes, action, assignees, user, project) {
    try {
      if (Object.keys(changes).length) {
        const assigned = assignedTo(assignees)
        const inDevelop = inDevelopBy(changes, 'issue', user)
        const inReview = inReviewTo(changes, 'issue', assignees)
        const status = inDevelop || inReview || assigned

        const updatesList = await buildUpdatesList(changes, project.id)

        const eventDescription = prepareEventDescription(user, 'issue', action, issue, project.name, status)

        const message = prepareMessage(project, user, eventDescription, updatesList)

        if (user.username !== 'gitlab-butler') {
          await this.send(message, user, project.name)
        }
      }
    } catch (error) {
      this.logError(error, 'issueEvent')
    }
  },
  async issueCommentEvent(comment, issue, assignee, user, project) {
    try {
      // Notify user assigned to the issue except if himself
      const assigned = assignee && user.username !== assignee.username ? ` assigned to ${atName(assignee)}` : ''
      const text = `${displayName(user.name)} *commented* on issue [#${issue.id} ${issue.title}](${comment.url})\
        ${assigned}`

      const eventsDetails = `*Comment*: ${comment.description}`

      const message = prepareMessage(project, user, text, eventsDetails)

      await this.send(message, user, project.name)
    } catch (error) {
      this.logError(error, 'issueCommentEvent')
    }
  },
  async mrCommentEvent(comment, mr, user, participants, project) {
    try {
      let assigned = ''

      if (participants && participants.length) {
        const assignedToList = assignedTo(participants)

        assigned = assignedToList && assignedToList.length ? `\n${assignedToList}` : ''
      }
      const text = `${displayName(user.name)} *commented* on MR [#${mr.id} ${mr.title}](${comment.url})${assigned}`
      const eventsDetails = `*Comment*: ${comment.description}`

      const message = prepareMessage(project, user, text, eventsDetails)

      await this.handleMRChannel(message, 'updated', participants, user, project.name, mr.iid)
    } catch (error) {
      this.logError(error, 'mrCommentEvent')
    }
  },
  async commitCommentEvent(comment, commit, assignee, user, project) {
    try {
      // const commitMessage = commit.message.replace(/\n[^\s\S]+/, '...').replace(/\n$/, '')

      let created = ''

      if (assignee.username !== user.username) {
        created = ` created by ${atName(assignee)}`
      }

      const text = `${displayName(user.name)} *commented* on commit [${commit.id.slice(0, 8)}]\
        (${comment.url})${created}`

      const eventsDetails = `*Comment*: ${comment.description}`

      const message = prepareMessage(project, user, text, eventsDetails)

      await this.send(message, user, project.name)
    } catch (error) {
      this.logError(error, 'commitCommentEvent')
    }
  },
  async mrEvent(mr, changes, action, assignees, author, user, project) {
    try {
      if (Object.keys(changes).length) {
        const assigned = assignedTo(assignees)
        const created = createdBy(author)
        const inDevelop = inDevelopBy(changes, 'MR', author)
        const inReview = inReviewTo(changes, 'MR', assignees)
        const status = inDevelop || inReview || assigned || created

        const updatesList = await buildUpdatesList(changes, project.id)

        const eventDescription = prepareEventDescription(user, 'MR', action, mr, project.name, status)

        const message = prepareMessage(project, user, eventDescription, updatesList)

        // Updated action is not needed to be send on the main channel as it would become crowded
        if (action !== 'updated') {
          await this.send(message, user, project.name)
        }
        await this.handleMRChannel(message, action, assignees, author, project.name, mr.iid)
      }
    } catch (error) {
      this.logError(error, 'mrEvent')
    }
  },
  async handleMRChannel(message, action, assignees = [], author, projectName, mrId) {
    try {
      const channelName = `${projectName}_MR${mrId}`
      const finalMessage = message

      finalMessage.channel = channelName
      let membersList = []

      // MR Channel members: author + assignees
      if (assignees && assignees.length) {
        const assigneesList = assignees.map(a => {
          return {
            name: a.username,
          }
        })

        membersList = membersList.concat(assigneesList)
      }
      if (author && author.username && !membersList.some(m => m.name === author.username)) {
        membersList.push({ name: author.username })
      }

      if (action === 'opened' || action === 'reopened') {
        if (membersList.length > 1) {
          await RocketChatAPI.createChannel(channelName, membersList)
        }
        // Send message to the channel
        await RocketChatAPI.post(finalMessage)
      } else if (action === 'closed') {
        await RocketChatAPI.deleteChannel(channelName)
      } else if (action === 'merged') {
        await RocketChatAPI.deleteChannel(channelName)
      } else if (action === 'updated') {
        let channelMembers = []

        if (membersList.length > 1) {
          channelMembers = await RocketChatAPI.getChannelMembers(channelName)
          if (channelMembers.length) {
            membersList.forEach(async member => {
              if (Array.isArray(channelMembers) && !channelMembers.some(m => m.username === member.name)) {
                await RocketChatAPI.inviteToChannel(channelName, member.name)
              }
            })
          } else {
            // This case is when user add an assignee that is not himself, so it create the channel
            await RocketChatAPI.createChannel(channelName, membersList)
          }
        }
        // Send message to the channel
        await RocketChatAPI.post(finalMessage)
      }
    } catch (error) {
      this.logError(error, 'handleMRChannel')
    }
  },
}
