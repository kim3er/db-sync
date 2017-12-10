const fs = require('fs'),
  { promisify } = require('util');

const Dropbox = require('dropbox'),
  { DateTime } = require('luxon'),
  winston = require('winston');

const readFile = promisify(fs.readFile),
  readdir = promisify(fs.readdir),
  stat = promisify(fs.stat),
  unlink = promisify(fs.unlink);

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    //
    // - Write to all logs with level `info` and below to `combined.log` 
    // - Write all logs error (and below) to `error.log`.
    //
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'exceptions.log' })
  ]
});

const TARGET_DIR = process.env.TARGET_DIR || '/home/pi/Cameras';

async function main() {
  const dbx = new Dropbox({ accessToken: process.env.ACCESS_TOKEN });
  
  const dirs = await readdir(TARGET_DIR);
  for (let dir of dirs) {
    if (dir.startsWith('.')) {
      continue;
    }

    const dirPath = TARGET_DIR + '/' + dir,
      dirStats = await stat(dirPath);

    if (dirStats.isDirectory()) {
      const files = await readdir(dirPath);
      for (let file of files) {
        if (file.startsWith('.')) {
          continue;
        }

        const filePath = dirPath + '/' + file,
          fileStats = await stat(filePath);

        if (fileStats.isFile()) {
          try {
            const dt = DateTime.fromJSDate(fileStats.ctime);

            const path = '/' + dir + '/' + dt.toFormat('yyyy-MM-dd') + '/' + file,
              contents = await readFile(filePath);

            const metaData = await dbx.filesUpload({ path, contents });
            
            await unlink(filePath);

            logger.info(`${path} uploaded`);
          }
          catch (err) {
            logger.error(err.message);
          }
        }
      }
    }
  }
}

process.on('unhandledRejection', (reason, p) => {
  logger.error(reason);
});

if (process.env.NODE_ENV === 'debug') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

main();