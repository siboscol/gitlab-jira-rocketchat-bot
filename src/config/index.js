require('dotenv').config()

const { checkEnvironmentVariables } = require('../utils/env')

const envVariables = []

checkEnvironmentVariables(envVariables)

const env = process.env.NODE_ENV || 'development'
const isProduction = env === 'production'
const isDevelopment = !isProduction

module.exports = {
  // Server options
  host: '0.0.0.0',
  port: parseInt(process.env.PORT, 10) || 8080,

  // Application environment
  env,
  isProduction,
  isDevelopment,
}
