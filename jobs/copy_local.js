const { DateTime } = require('luxon');

const fs = require('../helpers/fs');

const SRC_DIR = process.env.SRC_DIR || '/var/lib/motioneye/WorkRoom',
  CAMERA_DIR = '/WorkRoom';

const jobName = 'copy_local';

module.exports = async function copyLocal(targetDir, minutes, logger) {
  let filesCopied = 0;

  const now = DateTime.local();

  let dates;
  try {
    dates = await fs.readdir(SRC_DIR);
  }
  catch (err) {
    logger.error(err.message, {
      job: jobName,
      doing: 'readdir',
      what: SRC_DIR
    });

    return;
  }

  for (let dateName of dates) {
    if (dateName.startsWith('.')) {
      continue;
    }

    const dateDir = SRC_DIR + '/' + dateName;

    let dateStats;
    try {
      dateStats = await fs.stat(dateDir);
    }
    catch (err) {
      logger.error(err.message, {
        job: jobName,
        doing: 'stat',
        what: dateDir
      });

      continue;
    }

    if (!dateStats.isDirectory()) {
      continue;
    }

    const dateModified = DateTime.fromJSDate(dateStats.mtime),
      dateDiff = Math.round(now.diff(dateModified, 'hours').hours);

    if (dateDiff > 24) {
      continue;
    }

    let files;
    try {
      files = await fs.readdir(dateDir);
    }
    catch (err) {
      logger.error(err.message, {
        job: jobName,
        doing: 'readdir',
        what: dateDir
      });

      continue;
    }

    for (let fileName of files) {
      if (fileName.startsWith('.')) {
        continue;
      }

      const filePath = dateDir + '/' + fileName;
      
      let fileStats;
      try {
        fileStats = await fs.stat(filePath);
      }
      catch (err) {
        logger.error(err.message, {
          job: jobName,
          doing: 'stat',
          what: filePath
        });

        continue;
      }

      if (!fileStats.isFile()) {
        continue;
      }

      const fileModified = DateTime.fromJSDate(fileStats.mtime),
        fileDiff = Math.round(now.diff(fileModified, 'minutes').minutes);
      if (fileDiff > minutes || fileDiff < 1) {
        continue;
      }

      const targetPath = targetDir + CAMERA_DIR + '/' + dateName + '/';

      try {
        await fs.mkdirp(targetPath);
      }
      catch (err) {
        logger.error(err.message, {
          job: jobName,
          doing: 'mkdirp',
          what: targetPath
        });

        continue;
      }

      try {
        await fs.copyFile(filePath, targetPath + fileName);
      }
      catch (err) {
        logger.error(err.message, {
          job: jobName,
          doing: 'copyFile',
          what: filePath
        });

        continue;
      }

      filesCopied++;
    }
  }

  logger.info(`${filesCopied} ${filesCopied === 1 ? 'file' : 'files'} copied.`);
};