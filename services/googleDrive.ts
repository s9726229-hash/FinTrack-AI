
// services/googleDrive.ts
import { getFullDataJson, importData } from './storage';

const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const BACKUP_FILENAME = 'fintrack_backup.json';

// Declare global Google variables
declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

let tokenClient: any;
let accessToken: string | null = null;
let gapiInited = false;
let gisInited = false;

// Initialize the API client library
export const initGapi = () => {
    return new Promise<void>((resolve, reject) => {
        if (window.gapi) {
            window.gapi.load('client', async () => {
                await window.gapi.client.init({
                    // apiKey: API_KEY, // Not needed for Drive file scope with just token
                    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                });
                gapiInited = true;
                resolve();
            });
        } else {
            reject("Google API script not loaded");
        }
    });
};

// Initialize the Google Identity Services client
export const initGis = (clientId: string) => {
    return new Promise<void>((resolve, reject) => {
        if (window.google) {
            tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: SCOPES,
                callback: (tokenResponse: any) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        accessToken = tokenResponse.access_token;
                    }
                },
            });
            gisInited = true;
            resolve();
        } else {
            reject("Google Identity script not loaded");
        }
    });
};

// Trigger Login Flow
export const handleAuthClick = () => {
    return new Promise<string>((resolve, reject) => {
        if (!tokenClient) {
            reject("Token Client not initialized");
            return;
        }

        // Override callback for this specific request to capture resolution
        tokenClient.callback = (resp: any) => {
            if (resp.error) {
                reject(resp);
            }
            accessToken = resp.access_token;
            resolve(resp.access_token);
        };

        if (accessToken === null) {
            // Prompt the user to select a Google Account and ask for consent to share their data
            // when no access token is available.
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            // Skip display of account chooser and consent dialog for an existing session.
            tokenClient.requestAccessToken({ prompt: '' });
        }
    });
};

// --- Drive Operations ---

// 1. Find existing backup file (Internal)
const findBackupFile = async () => {
    try {
        const response = await window.gapi.client.drive.files.list({
            'pageSize': 1,
            'fields': "files(id, name, modifiedTime)",
            'q': `name = '${BACKUP_FILENAME}' and trashed = false`
        });
        const files = response.result.files;
        if (files && files.length > 0) {
            return files[0];
        }
        return null;
    } catch (err) {
        console.error("Error finding file", err);
        throw err;
    }
};

// New: Get Backup Metadata (Public) for Auto-Discovery
export const getBackupMetadata = async (): Promise<{id: string, modifiedTime: string} | null> => {
    if (!accessToken) throw new Error("Not authenticated");
    const file = await findBackupFile();
    if (file) {
        return { id: file.id, modifiedTime: file.modifiedTime };
    }
    return null;
};

// 2. Upload (Create or Update)
export const uploadToDrive = async (): Promise<void> => {
    if (!accessToken) throw new Error("Not authenticated");

    const fileContent = getFullDataJson();
    const file = await findBackupFile();
    const fileId = file?.id;
    
    const fileMetadata = {
        'name': BACKUP_FILENAME,
        'mimeType': 'application/json'
    };

    const multipartRequestBody =
        `--foo_bar_baz\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(fileMetadata)}\r\n` +
        `--foo_bar_baz\r\n` +
        `Content-Type: application/json\r\n\r\n` +
        `${fileContent}\r\n` +
        `--foo_bar_baz--`;

    try {
        if (fileId) {
            // Update existing file
            await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'multipart/related; boundary=foo_bar_baz'
                },
                body: multipartRequestBody
            });
        } else {
            // Create new file
            await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'multipart/related; boundary=foo_bar_baz'
                },
                body: multipartRequestBody
            });
        }
    } catch (e) {
        console.error("Upload failed", e);
        throw e;
    }
};

// 3. Download (Restore)
export const downloadFromDrive = async (): Promise<boolean> => {
    if (!accessToken) throw new Error("Not authenticated");

    const file = await findBackupFile();
    const fileId = file?.id;
    
    if (!fileId) {
        throw new Error("找不到雲端備份檔");
    }

    try {
        const response = await window.gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });
        
        // gapi client returns body in result
        const jsonString = typeof response.body === 'string' ? response.body : JSON.stringify(response.result);
        return importData(jsonString);
    } catch (e) {
        console.error("Download failed", e);
        throw e;
    }
};
