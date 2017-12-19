const path = require('path');

const Dropbox = require('dropbox'),
  { DateTime } = require('luxon');

const fs = require('../helpers/fs');

const jobName = 'upload_movies';

function getErrorMessage(err) {
  if (err.message) {
    return err.message;
  }
  else if (err.error) {
    return err.error;
  }
  else {
    return err;
  }
}

module.exports = async function uploadMovies(movieDir, logger) {
  const dbx = new Dropbox({ accessToken: process.env.ACCESS_TOKEN });

  const todaysDir = new DateTime.local().toFormat('yyyy-MM-dd');

  let dirs;
  try {
    dirs = await fs.readdir(movieDir);
  }
  catch (err) {
    logger.error(err.message, {
      job: jobName,
      doing: 'readdir',
      what: movieDir
    });

    return;
  }

  for (let dir of dirs) {
    if (dir.startsWith('.')) {
      continue;
    }

    const dirPath = movieDir + '/' + dir;

    let dirStats;
    try {
      dirStats = await fs.stat(dirPath);
    }
    catch (err) {
      logger.error(err.message, {
        job: jobName,
        doing: 'stat',
        what: dirPath
      });

      continue;
    }

    if (!dirStats.isDirectory()) {
      continue;
    }

    let dateDirs;
    try {
      dateDirs = await fs.readdir(dirPath);
    }
    catch (err) {
      logger.error(err.message, {
        job: jobName,
        doing: 'readdir',
        what: dirPath
      });

      continue;
    }

    for (let dateDir of dateDirs) {
      if (dateDir.startsWith('.') || dateDir.startsWith('lastsnap')) {
        continue;
      }

      const dateDirPath = dirPath + '/' + dateDir;

      let dateDirStats;
      try {
        dateDirStats = await fs.stat(dateDirPath);
      }
      catch (err) {
        logger.error(err.message, {
          job: jobName,
          doing: 'stat',
          what: dateDirPath
        });

        continue;
      }

      if (!dateDirStats.isDirectory()) {
        continue;
      }

      let files;
      try {
        files = await fs.readdir(dateDirPath);
      }
      catch (err) {
        logger.error(err.message, {
          job: jobName,
          doing: 'readdir',
          what: dateDirPath
        });

        continue;
      }

      if (!files.length && dateDir !== todaysDir) {
        try {
          await fs.rmdir(dateDirPath);
        }
        catch (err) {
          logger.error(err.message, {
            job: jobName,
            doing: 'rmdir',
            what: dateDirPath
          });
        }

        continue;
      }

      const jpgDir = path.join(movieDir, '..', 'mpg_tmp', dir, dateDir);

      try {
        await fs.mkdirp(jpgDir);
      }
      catch (err) {
        logger.error(err.message, {
          job: jobName,
          doing: 'mkdirp',
          what: jpgDir
        });

        continue;
      }

      for (let file of files) {
        if (file.startsWith('.')) {
          continue;
        }

        const filePath = dateDirPath + '/' + file;

        if (file.endsWith('.jpg')) {
          try {
            await fs.copyFile(filePath, path.join(jpgDir, file));
          }
          catch (err) {
            logger.error(err.message, {
              job: jobName,
              doing: 'copyFile',
              what: filePath
            });

            continue;
          }

          try {
            await fs.unlink(filePath);
          }
          catch (err) {
            logger.error(err.message, {
              job: jobName,
              doing: 'unlink',
              what: filePath
            });
          }

          continue;
        }

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

        const moviePath = '/' + dir + '/' + dateDir + '/' + file;

        let contents;
        try {
          contents = await fs.readFile(filePath);
        }
        catch (err) {
          logger.error(err.message, {
            job: jobName,
            doing: 'readFile',
            what: filePath
          });

          continue;
        }

        try {
          await dbx.filesUpload({ path: moviePath, contents, mode: 'overwrite' });
        }
        catch (err) {
          logger.error(getErrorMessage(err), {
            job: jobName,
            doing: 'filesUpload',
            what: moviePath
          });

          continue;
        }

        try {
          await fs.unlink(filePath);
        }
        catch (err) {
          logger.error(err.message, {
            job: jobName,
            doing: 'unlink',
            what: filePath
          });

          continue;
        }
      }
    }
  }
};