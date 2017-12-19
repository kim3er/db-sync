const Dropbox = require('dropbox'),
  { DateTime } = require('luxon');

const jobName = 'cleanup_dropbox';

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

module.exports = async function cleanDropbox(targetDir, logger) {
  let foldersRemoved = 0;

  const dbx = new Dropbox({ accessToken: process.env.ACCESS_TOKEN });

  const now = new DateTime.local();

  let cameraResponse;
  try {
    cameraResponse = await dbx.filesListFolder({
      path: ''
    });
  }
  catch (err) {
    logger.error(getErrorMessage(err), {
      job: jobName,
      doing: 'filesListFolder',
      what: 'root'
    });

    return;
  }

  for (let camera of cameraResponse.entries) {
    if (camera['.tag'] !== 'folder') {
      continue;
    }

    let dateResponse;
    try {
      dateResponse = await dbx.filesListFolder({
        path: camera.path_lower
      });
    }
    catch (err) {
      logger.error(getErrorMessage(err), {
        job: jobName,
        doing: 'filesListFolder',
        what: camera.path_lower
      });

      continue;
    }

    for (let date of dateResponse.entries) {
      const folderDate = DateTime.fromString(date.name, 'yyyy-MM-dd'),
        dateDiff = Math.round(now.diff(folderDate, 'days').days);
        
      if (dateDiff <= 14) {
        continue;
      }

      try {
        await dbx.filesDelete({ path: date.path_lower });
      }
      catch (err) {
        logger.error(getErrorMessage(err), {
          job: jobName,
          doing: 'filesDelete',
          what: date.path_lower
        });

        continue;
      }

      foldersRemoved++;
    }
  }

  logger.info(`${foldersRemoved} ${foldersRemoved === 1 ? 'folder' : 'folders'} removed.`);
};