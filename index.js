const cron = require('node-cron'),
  { createLogger, format, transports } = require('winston'),
  { combine, timestamp, label, json } = format;

const uploadMovies = require('./jobs/upload_movies'),
  buildSummaries = require('./jobs/build_summaries'),
  copyLocal = require('./jobs/copy_local'),
  cleanupDropbox = require('./jobs/cleanup_dropbox');

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
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' })
  ],
  exceptionHandlers: [
    new transports.File({ filename: 'logs/exceptions.log' })
  ]
});

const TARGET_DIR = process.env.TARGET_DIR || '/home/pi/Cameras',
  COPY_MINUTES = 5;

process.on('unhandledRejection', (reason, p) => {
  logger.error(reason);
});

if (process.env.NODE_ENV === 'debug') {
  logger.add(new transports.Console({
    format: format.simple()
  }));
}

(async function() {
  await copyLocal(TARGET_DIR, COPY_MINUTES, logger);
  await uploadMovies(TARGET_DIR, logger);
  await buildSummaries(TARGET_DIR, logger);
  await cleanupDropbox(TARGET_DIR, logger);

  let uploadingMovies = false;
  cron.schedule(`*/${COPY_MINUTES} * * * *`, async function () {
    if (uploadingMovies) {
      return;
    }

    uploadingMovies = true;

    try {
      await copyLocal(TARGET_DIR, COPY_MINUTES, logger);
      await uploadMovies(TARGET_DIR, logger);
    }
    catch(err) {
      logger.error('Error while uploading movies: ' +  err.message);
    }

    uploadingMovies = false;
  });

  let buildingSummaries = false;
  cron.schedule('0 0,6,12,18 * * *', async function () {
    if (buildingSummaries) {
      return;
    }

    buildingSummaries = true;

    try {
      await buildSummaries(TARGET_DIR, logger);
    }
    catch (err) {
      logger.error('Error while building summaries: ' + err.message);
    }

    buildSummaries = false;
  });

  let cleaningUpDropbox = false;
  cron.schedule('@daily', async function () {
    if (cleaningUpDropbox) {
      return;
    }

    cleaningUpDropbox = true;

    try {
      await cleanupDropbox(TARGET_DIR, logger);
    }
    catch (err) {
      logger.error('Error while cleaning up Dropbox: ' + err.message);
    }

    cleaningUpDropbox = false;
  });
})();