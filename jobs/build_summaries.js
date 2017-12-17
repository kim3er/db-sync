const { exec } = require('child_process'),
  path = require('path'),
  { promisify } = require('util');

const { DateTime } = require('luxon');

const fs = require('../helpers/fs');

const execAsync = promisify(exec);

module.exports = async function buildSummaries(targetDir, logger) {
  // ffmpeg -loglevel panic -y -framerate 10 -pattern_type glob -i '*.jpg' -c:v libx264 -pix_fmt yuv420p out.mp4

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

        const dateDirPath = dirPath + '/' + dateDir,
          dateDirStats = await fs.stat(dateDirPath);

        if (dateDirStats.isDirectory()) {
          const files = await fs.readdir(dateDirPath);
          if (!files.length && dateDir !== todaysDir) {
            await fs.rmdir(dateDirPath);
            continue;
          }

          if (!files.length) {
            continue;
          }

          console.log(files);

          const output = targetDir + '/' + dir + '/' + dateDir + '/' + files[0].replace('.jpg', '.mp4'),
            cmd = `ffmpeg -loglevel panic -y -framerate 10 -pattern_type glob -i '*.jpg' -c:v libx264 -pix_fmt yuv420p ${output}`;
          await execAsync(cmd, {
            cwd: dateDirPath
          });
        }
      }
    }
  }
};