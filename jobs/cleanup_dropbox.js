const Dropbox = require('dropbox'),
  { DateTime } = require('luxon');

module.exports = async function uploadMovies(targetDir, logger) {
  const dbx = new Dropbox({ accessToken: process.env.ACCESS_TOKEN });

  const now = new DateTime.local();

  const cameras = (await dbx.filesListFolder({
    path: ''
  })).entries;

  for (let camera of cameras) {
    if (camera['.tag'] !== 'folder') {
      continue;
    }

    const dates = (await dbx.filesListFolder({
      path: camera.path_lower
    })).entries;

    for (let date of dates) {
      const folderDate = DateTime.fromString(date.name, 'yyyy-MM-dd'),
        dateDiff = Math.round(now.diff(folderDate, 'days').days);
      if (dateDiff <= 14) {
        continue;
      }

      try {
        await dbx.filesDelete({ path: date.path_lower });
        logger.info(date.path_display + ' deleted.');
      }
      catch (err) {
        logger.error(err.error ? err.error : err.message);
        continue;
      }
    }
  }
};