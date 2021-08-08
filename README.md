# Gitlab/Jira RocketChat Bot for notifications and group collaboration

The idea of this bot is to enable notifications from Gitlab and Jira to be send to RocketChat for dev teams.
In order to improve the workflow of a team, this bot enables team members to be up to date with Gitlab events by being notified directly on the main company chat (RocketChat).
This bot allows developers to have a one-stop-shop place for being always informed with what's going on in the project they are working on and to enhance collaboration among them during the development by creating group channels for code reviews.

In addition, the bot integrates with Jira to enable and facilitate incidents management. Similar approach to Gitlab events has being used in order to notify the team in case of creation of incidents and enhance collaboration among a group of developers assigned to solve the incidents. This way developers are notified when they need to take part of incident resolution.

## Features
- Gitlab events notification
  - Automatically create projects channels to allow events to be notify to the team 
  - Issues events and Merge Requests are sent to the project alert channel
- Gitlab Group notifications
  - When Merge Request are created and reviewers are assigned, a new channel in RocketChat is created with the participents involved and all events regarding the MR are sent to the channel where collaboration is establish.
- Jira Incidents events notification
  - Send Jira issues events to the main channel
- Jira Incident Group notification
  - Automatically create RocketChat channel with issue incidents members in order to allow better collaboration against resolution of the incident and allow a one-stop-shop place to discuss about the incident


- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Main commands](#main-commands)
    - [Development](#development)
    - [Production](#production)
    - [Lint](#lint)
- [Contributing](#contributing)

## Getting started

### Prerequisites

**Node.js** is required to run the application.

Visit [this page](https://nodejs.org/en/download/) for download instructions.

### Installation

Install the required dependencies:

`$ npm install`

### Configuration

The application relies on environment variables to connect to various services.

To configure these variables:

- Copy and rename the `.env.example` to `.env`
- Open the `.env` file and fill in the required values

### Main commands

#### Development

Start a local development server with the following command:

`$ npm run dev`

This will:

- Fire up a local web server at `localhost` on port 8080 or `PORT` if defined
- Set the `NODE_ENV` variable to `development`
- Watch for changes in the source files allowing the server to reload automatically

#### Production

For production use, start the server with:

`$ npm run start`

**NOTE:** the application makes use of the `NODE_ENV` environment variable do determine its running environment.

#### Lint

Check for linting errors with:

`$ npm run lint`

Automatically fix linting errors with:

`$ npm run lint:fix`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## References

- https://docs.rocket.chat/api/rest-api/methods/chat/postmessage
- https://github.com/RocketChat/docs/blob/master/guides/administrator-guides/integrations/gitlab.md
- https://github.com/axios/axios
- https://docs.gitlab.com/ee/api/README.html
- https://docs.gitlab.com/ee/api/api_resources.html
- https://git.gva.dapm.ch/help/user/project/integrations/webhooks
- https://about.gitlab.com/blog/2016/08/19/applying-gitlab-labels-automatically/
- https://about.gitlab.com/blog/2016/08/17/using-gitlab-labels/
