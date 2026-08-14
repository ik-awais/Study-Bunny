const BOUNDARY = '-------314159265358979323846';
const MIME_TYPE = 'application/json';
const FILE_NAME = 'study-bunny-backup.json';

export const backupToDrive = async (token: string, data: any): Promise<void> => {
  // 1. Check if file exists
  let fileId = null;
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${FILE_NAME}'`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) fileId = searchData.files[0].id;

  const metadata = { name: FILE_NAME, parents: ['appDataFolder'], mimeType: MIME_TYPE };
  const payload = JSON.stringify(data);
  
  const body = `\r\n--${BOUNDARY}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${BOUNDARY}\r\nContent-Type: ${MIME_TYPE}\r\n\r\n${payload}\r\n--${BOUNDARY}--`;

  const method = fileId ? 'PATCH' : 'POST';
  const url = fileId 
    ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;

  await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${BOUNDARY}`,
      'Content-Length': body.length.toString()
    },
    body
  });
};

export const restoreFromDrive = async (token: string): Promise<any> => {
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${FILE_NAME}'`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const searchData = await searchRes.json();
  if (!searchData.files || searchData.files.length === 0) throw new Error("No backup found on Google Drive.");
  
  const fileId = searchData.files[0].id;
  const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  return await fileRes.json();
};