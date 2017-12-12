const Dropbox = require('dropbox');

const fs = require('../helpers/fs');

module.exports = async function uploadMovies(movieDir, logger) {
  logger.info('Main process starting');

  const dbx = new Dropbox({ accessToken: process.env.ACCESS_TOKEN });

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
          for (let file of files) {
            if (file.startsWith('.')) {
              continue;
            }

            const filePath = dateDirPath + '/' + file,
              fileStats = await fs.stat(filePath);

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

  logger.info('Main process finishing');
};