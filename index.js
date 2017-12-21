const cron = require('node-cron'),
  { createLogger, format, transports } = require('winston'),
  { combine, timestamp, json, simple } = format;

const uploadMovies = require('./jobs/upload_movies'),
  buildSummaries = require('./jobs/build_summaries'),
  copyLocal = require('./jobs/copy_local'),
  cleanupDropbox = require('./jobs/cleanup_dropbox');

const logger = createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    simple()
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
  logger.error(reason, {
    when: 'unhandledRejection',
    what: p
  });
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
    }
    catch(err) {
      logger.error(err.message, {
        job: 'copy_local',
        where: 'cron'
      });
    }

    try {
      await uploadMovies(TARGET_DIR, logger);
    }
    catch (err) {
      logger.error(err.message, {
        job: 'upload_movies',
        doing: 'cron'
      });
    }

    uploadingMovies = false;
  });

  let buildingSummaries = false;
  cron.schedule('0 */3 * * *', async function () {
    if (buildingSummaries) {
      return;
    }

    buildingSummaries = true;

    try {
      await buildSummaries(TARGET_DIR, logger);
    }
    catch (err) {
      logger.error(err.message, {
        job: 'build_summaries',
        doing: 'cron'
      });
    }

    buildingSummaries = false;
  });

  let cleaningUpDropbox = false;
  cron.schedule('0 0 * * *', async function () {
    if (cleaningUpDropbox) {
      return;
    }

    cleaningUpDropbox = true;

    try {
      await cleanupDropbox(TARGET_DIR, logger);
    }
    catch (err) {
      logger.error(err.message, {
        job: 'cleanup_dropbox',
        doing: 'cron'
      });
    }

    cleaningUpDropbox = false;
  });
})();