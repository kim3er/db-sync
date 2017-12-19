const { exec } = require('child_process'),
  path = require('path'),
  { promisify } = require('util');

const { DateTime } = require('luxon');

const fs = require('../helpers/fs');

const execAsync = promisify(exec);

const jobName = 'build_summaries';

module.exports = async function buildSummaries(targetDir, logger) {
  const jpgDir = path.join(targetDir, '..', 'mpg_tmp');
  const todaysDir = new DateTime.local().toFormat('yyyy-MM-dd');

  const dirs = await fs.readdir(jpgDir);
  for (let dir of dirs) {
    if (dir.startsWith('.')) {
      continue;
    }

    const dirPath = jpgDir + '/' + dir,
      dirStats = await fs.stat(dirPath);

    if (dirStats.isDirectory()) {
      const dateDirs = await fs.readdir(dirPath);
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

        if (dateDirStats.isDirectory()) {
          const files = await fs.readdir(dateDirPath);
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

          if (!files.length) {
            continue;
          }

          const outputDir = targetDir + '/' + dir + '/' + dateDir;

          try {
            await fs.mkdirp(outputDir);
          }
          catch (err) {
            logger.error(err.message, {
              job: jobName,
              doing: 'mkdirp',
              what: outputDir
            });

            continue;
          }

          const output = outputDir + '/ts-' + files[0].replace('.jpg', '.mp4'),
            cmd = `ffmpeg -loglevel panic -y -framerate 10 -pattern_type glob -i '*.jpg' -c:v libx264 -pix_fmt yuv420p ${output}`;
          
          try {
            await execAsync(cmd, {
              cwd: dateDirPath
            });
          }
          catch (err) {
            logger.error(err.message, {
              job: jobName,
              doing: 'ffmpeg',
              what: output
            });

            continue;
          }

          try {
            await execAsync(`rm ${dateDirPath}/*.jpg`);
          }
          catch (err) {
            logger.error(err.message, {
              job: jobName,
              doing: 'rm jpg',
              what: dateDirPath
            });
          }
        }
      }
    }
  }
};