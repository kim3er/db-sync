const cron = require('node-cron'),
  { createLogger, format, transports } = require('winston'),
  { combine, timestamp, label, json } = format,
  DailyRotateFile = require('winston-daily-rotate-file');

const uploadMovies = require('./jobs/upload_movies'),
  buildSummaries = require('./jobs/build_summaries'),
  copyLocal = require('./jobs/copy_local');

const logger = createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    json()
  ),
  transports: [
    //
    // - Write to all logs with level `info` and below to `combined.log` 
    // - Write all logs error (and below) to `error.log`.
    //
    new DailyRotateFile({ filename: 'logs/error.log', level: 'error', maxDays: 14 }),
    new DailyRotateFile({ filename: 'logs/combined.log', maxDays: 14 })
  ],
  exceptionHandlers: [
    new DailyRotateFile({ filename: 'logs/exceptions.log', maxDays: 14 })
  ]
});