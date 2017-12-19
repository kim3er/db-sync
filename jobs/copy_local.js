const { DateTime } = require('luxon');

const fs = require('../helpers/fs');

const SRC_DIR = process.env.SRC_DIR || '/var/lib/motioneye/WorkRoom',
  CAMERA_DIR = '/WorkRoom';

module.exports = async function copyLocal(targetDir, minutes, logger) {
  const now = DateTime.local();

  const dates = await fs.readdir(SRC_DIR);
  for (let dateName of dates) {
    if (dateName.startsWith('.')) {
      continue;
    }

    const dateDir = SRC_DIR + '/' + dateName,
      dateStats = await fs.stat(dateDir);

    if (!dateStats.isDirectory()) {
      continue;
    }

    const dateModified = DateTime.fromJSDate(dateStats.mtime),
      dateDiff = Math.round(now.diff(dateModified, 'hours').hours);
    if (dateDiff > 24) {
      continue;
    }

    const files = await fs.readdir(dateDir);
    for (let fileName of files) {
      if (fileName.startsWith('.')) {
        continue;
      }

      const filePath = dateDir + '/' + fileName,
        fileStats = await fs.stat(filePath);

      if (!fileStats.isFile()) {
        continue;
      }

      const fileModified = DateTime.fromJSDate(fileStats.mtime),
        fileDiff = Math.round(now.diff(fileModified, 'minutes').minutes);
      if (fileDiff > minutes || fileDiff < 1) {
        continue;
      }

      const targetPath = targetDir + CAMERA_DIR + '/' + dateName + '/';
      await fs.mkdirp(targetPath);

      try {
        await fs.copyFile(filePath, targetPath + fileName);
        logger.info(targetPath + fileName + ' copied.');
      }
      catch (err) {
        logger.error(`Couldn't copy ${fileName}. ${err.message}`);
      }
    }
  }
};