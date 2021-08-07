const axios = require('axios').default

module.exports = {
  userId: '',
  authToken: '',
  attempts: 0,
  async post(message, user = '', isFromJira = false) {
    try {
      const webhookUrl = isFromJira ? process.env.ROCKETCHAT_JIRA_WEBHOOK : process.env.ROCKETCHAT_WEBHOOK

      await axios.post(webhookUrl, message, {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      this.logError(error, 'POST')
      if (error.response && error.response.data && error.response.data.error === 'invalid-channel') {
        if (this.attempts < 2) {
          this.attempts = this.attempts + 1
          await this.invalidChannel(message, user)
        }
      }
    }
  },
  async login() {
    if (!this.userId && !this.authToken) {
      const user = process.env.ROCKETCHAT_USER
      const password = process.env.ROCKETCHAT_PASSWORD

      try {
        console.log('Loggin in to RocketChat')
        const res = await axios.post(
          `${process.env.ROCKETCHAT_BASEURL}/api/v1/login`,
          { user, password },
          {
            headers: { 'Content-Type': 'application/json' },
          }
        )

        console.log(`${user} Logged in to RocketChat`, res.data.data)
        this.userId = res.data.data.userId
        this.authToken = res.data.data.authToken
      } catch (error) {
        this.logError(error, 'LOGIN')
      }
    }
  },
  async createChannel(name = '', members = []) {
    try {
      if (!members.length) {
        throw new Error('Missing members to create the channel')
      }
      await this.login()
      const payload = {
        name,
        members: members && members.length ? members.map(m => m.name) : members,
      }

      payload.members = [...new Set(payload.members)]

      console.log(`Creating new ${name} RocketChat channel`)
      const res = await axios.post(`${process.env.ROCKETCHAT_BASEURL}/api/v1/channels.create`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': this.userId,
          'X-Auth-Token': this.authToken,
        },
      })

      console.log('RocketChat channel created!', res.data.channel)
    } catch (error) {
      this.logError(error, 'CREATE-CHANNEL')
    }
  },
  async deleteChannel(name) {
    await this.login()
    const payload = {
      roomName: name,
    }

    console.log(`Deleting ${name} RocketChat channel`)
    try {
      await axios.post(`${process.env.ROCKETCHAT_BASEURL}/api/v1/channels.delete`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': this.userId,
          'X-Auth-Token': this.authToken,
        },
      })

      console.log('RocketChat channel deleted!', name)
    } catch (error) {
      this.logError(error, 'DELETE-CHANNEL')
    }
  },
  async archiveChannel(channel) {
    try {
      await this.login()
      const channelInfo = await this.getChannelInfo(channel)

      if (channelInfo) {
        const payload = {
          /* eslint no-underscore-dangle: 0 */
          roomId: channelInfo._id,
        }

        console.log(`Archiving ${channel} RocketChat channel`)
        await axios.post(`${process.env.ROCKETCHAT_BASEURL}/api/v1/channels.archive`, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': this.userId,
            'X-Auth-Token': this.authToken,
          },
        })

        console.log('RocketChat channel archived!', channel)
      }
    } catch (error) {
      this.logError(error, 'ARCHIVE-CHANNEL')
    }
  },
  async unarchiveChannel(channel) {
    try {
      await this.login()
      const channelInfo = await this.getChannelInfo(channel)

      if (channelInfo) {
        const payload = {
          /* eslint no-underscore-dangle: 0 */
          roomId: channelInfo._id,
        }

        console.log(`Unarchiving ${channel} RocketChat channel`)
        await axios.post(`${process.env.ROCKETCHAT_BASEURL}/api/v1/channels.unarchive`, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': this.userId,
            'X-Auth-Token': this.authToken,
          },
        })

        console.log('RocketChat channel Unarchived!', channel)
      }
    } catch (error) {
      this.logError(error, 'UNARCHIVE-CHANNEL')
    }
  },
  async inviteToChannel(channel, username) {
    try {
      await this.login()
      const channelInfo = await this.getChannelInfo(channel)
      const userInfo = await this.getUserInfo(username)

      if (channelInfo && userInfo) {
        const payload = {
          /* eslint no-underscore-dangle: 0 */
          roomId: channelInfo._id,
          /* eslint no-underscore-dangle: 0 */
          userId: userInfo._id,
        }

        console.log(`Adding user ${username} to RocketChat channel ${channel}`)
        await axios.post(`${process.env.ROCKETCHAT_BASEURL}/api/v1/channels.invite`, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': this.userId,
            'X-Auth-Token': this.authToken,
          },
        })

        console.log(`Added user ${username} to RocketChat channel ${channel}`)
      }
    } catch (error) {
      this.logError(error, 'INVITE-TO-CHANNEL')
    }
  },
  async getChannelInfo(channel) {
    console.log(`Getting ${channel} RocketChat channel`)
    try {
      const res = await axios.get(`${process.env.ROCKETCHAT_BASEURL}/api/v1/channels.info?roomName=${channel}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': this.userId,
          'X-Auth-Token': this.authToken,
        },
      })

      console.log('RocketChat Channel info:', res.data.channel)

      return res.data.channel
    } catch (error) {
      this.logError(error, 'GET-CHANNEL-INFO')

      return null
    }
  },
  async getChannelMembers(channel) {
    await this.login()
    console.log(`Getting ${channel} RocketChat channel members list`)
    try {
      const res = await axios.get(`${process.env.ROCKETCHAT_BASEURL}/api/v1/channels.members?roomName=${channel}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': this.userId,
          'X-Auth-Token': this.authToken,
        },
      })

      console.log(`RocketChat ${channel} Channel members list:`, res.data.members)

      return res.data.members
    } catch (error) {
      this.logError(error, 'GET-CHANNEL-MEMBER-LIST')

      return []
    }
  },
  async getUserInfo(username) {
    console.log(`Getting ${username} RocketChat user info`)
    try {
      const res = await axios.get(`${process.env.ROCKETCHAT_BASEURL}/api/v1/users.info?username=${username}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': this.userId,
          'X-Auth-Token': this.authToken,
        },
      })

      console.log('RocketChat User info:', res.data.user)

      return res.data.user
    } catch (error) {
      this.logError(error, 'GET-USER-INFO')

      return null
    }
  },
  logError(error, method) {
    if (error) {
      const methodInfo = method ? `[${method}]` : ''

      console.log(`RocketChat ${methodInfo} Error:`, error.message)
      if (error.response && error.response.data) {
        let message = error.response.data.error ? error.response.data.error : ''

        message = error.response.data.message ? error.response.data.message : message
        console.log(`RocketChat ${methodInfo} Error Details:`, message)
      }
    }
  },
  async invalidChannel(message, members = '') {
    try {
      if (!message.channel || !members) {
        throw new Error('Missing channel name or members')
      }

      // If channel invalid, create new one and post a message
      const membersList = members && members.length ? members : [members]

      await this.createChannel(message.channel, membersList)
      await this.post(message)
      // Resetting attemps to create a channel
      this.attempts = 0
    } catch (error) {
      this.logError(error, 'INVALID-CHANNEL')
    }
  },
}
