const cron = require('node-cron'),
  winston = require('winston');

const uploadMovies = require('./jobs/upload_movies'),
  buildSummaries = require('./jobs/build_summaries'),
  copyLocal = require('./jobs/copy_local');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    //
    // - Write to all logs with level `info` and below to `combined.log` 
    // - Write all logs error (and below) to `error.log`.
    //
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ]
});

const TARGET_DIR = process.env.TARGET_DIR || '/home/pi/Cameras',
  COPY_MINUTES = 5;

process.on('unhandledRejection', (reason, p) => {
  logger.error(reason);
});

if (process.env.NODE_ENV === 'debug') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

(async function() {
  await copyLocal(TARGET_DIR, COPY_MINUTES, logger);
  await uploadMovies(TARGET_DIR, logger);
  await buildSummaries(TARGET_DIR, logger);

  let uploadingMovies = false;
  cron.schedule(`*/${COPY_MINUTES} * * * *`, async function () {
    if (uploadingMovies) {
      return;
    }

    uploadingMovies = true;

    await copyLocal(TARGET_DIR, COPY_MINUTES, logger);
    await uploadMovies(TARGET_DIR, logger);

    uploadingMovies = false;
  });

  let buildingSummaries = false;
  cron.schedule('0 */6 * * *', async function () {
    if (buildingSummaries) {
      return;
    }

    buildingSummaries = true;

    await buildSummaries(TARGET_DIR, logger);

    buildSummaries = false;
  });
})();