const path = require('path');

const Dropbox = require('dropbox'),
  { DateTime } = require('luxon');

const fs = require('../helpers/fs');

module.exports = async function uploadMovies(movieDir, logger) {
  const dbx = new Dropbox({ accessToken: process.env.ACCESS_TOKEN });

  const todaysDir = new DateTime.local().toFormat('yyyy-MM-dd');
  const dirs = await fs.readdir(movieDir);
  for (let dir of dirs) {
    if (dir.startsWith('.')) {
      continue;
    }

    const dirPath = movieDir + '/' + dir,
      dirStats = await fs.stat(dirPath);

    if (dirStats.isDirectory()) {
      const dateDirs = await fs.readdir(dirPath);
      for (let dateDir of dateDirs) {
        if (dateDir.startsWith('.') || dateDir.startsWith('lastsnap')) {
          continue;
        }

        const dateDirPath = dirPath + '/' + dateDir,
          dateDirStats = await fs.stat(dateDirPath);

        if (dateDirStats.isDirectory()) {
          const files = await fs.readdir(dateDirPath);
          if (!files.length && dateDir !== todaysDir) {
            await fs.rmdir(dateDirPath);
            continue;
          }

          const jpgDir = path.join(movieDir, '..', 'mpg_tmp', dir, dateDir);
          await fs.mkdirp(jpgDir);

          for (let file of files) {
            if (file.startsWith('.')) {
              continue;
            }

            const filePath = dateDirPath + '/' + file;

            if (file.endsWith('.jpg')) {
              await fs.copyFile(filePath, path.join(jpgDir, file));
              await fs.unlink(filePath);
              continue;
            }

            const fileStats = await fs.stat(filePath);

            if (fileStats.isFile()) {
              try {
                const path = '/' + dir + '/' + dateDir + '/' + file,
                  contents = await fs.readFile(filePath);

                const metaData = await dbx.filesUpload({ path, contents });

                await fs.unlink(filePath);

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
  }
};