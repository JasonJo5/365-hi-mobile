/**
 * Google Sheets -> Firestore sync for the 365 Hi Mobile customer portal.
 *
 * SETUP (one-time):
 * 1. In your Google Sheet: Extensions > Apps Script. Paste this whole file in,
 *    replacing the placeholder code.
 * 2. Get a Firebase service account key:
 *    Firebase Console > Project Settings > Service accounts > Generate new private key.
 *    This downloads a JSON file with fields like "project_id", "client_email", "private_key".
 * 3. In the Apps Script editor: Project Settings (gear icon) > Script Properties > Add:
 *      FIREBASE_PROJECT_ID    = <the "project_id" value from the JSON>
 *      FIREBASE_CLIENT_EMAIL  = <the "client_email" value from the JSON>
 *      FIREBASE_PRIVATE_KEY   = <the "private_key" value from the JSON, including
 *                                the literal \n characters - paste it exactly as-is>
 * 4. Run `syncToFirestore` once from the Apps Script editor (▶ button next to the
 *    function name). The first run will ask you to authorize the script - approve it.
 * 5. Optional: Apps Script > Triggers (clock icon) > Add Trigger > run
 *    `syncToFirestore` on a time-based schedule (e.g. every hour), so you don't have
 *    to remember to click "run" after every edit.
 *
 * SHEET FORMAT (main tab - name it "Customers"):
 *   phoneNumber | name | birthdate | arcNumber | country | carrier | simType
 *   | currentPlanName | contractStart | contractEnd | firstPurchaseDate
 *
 *   - phoneNumber must be in E.164 format, e.g. +821012345678
 *   - date columns (birthdate, contractStart, contractEnd, firstPurchaseDate)
 *     should be plain text in YYYY-MM-DD format (format the column as "Plain text"
 *     to stop Sheets from auto-converting it to a date object)
 *
 * SHEET FORMAT (second tab - name it "PlanHistory"):
 *   phoneNumber | planName | carrier | simType | startDate | endDate
 *
 *   Add a row here BEFORE changing a customer's current plan on the Customers tab,
 *   to preserve their old plan as an archived record.
 */

function syncToFirestore() {
  const props = PropertiesService.getScriptProperties();
  const projectId = props.getProperty('FIREBASE_PROJECT_ID');
  const clientEmail = props.getProperty('FIREBASE_CLIENT_EMAIL');
  const privateKey = props.getProperty('FIREBASE_PRIVATE_KEY');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing script properties. See setup instructions at the top of this file.');
  }

  const accessToken = getFirestoreAccessToken(clientEmail, privateKey);
  const baseUrl = 'https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents';

  syncCustomers_(baseUrl, accessToken);
  syncPlanHistory_(baseUrl, accessToken);

  SpreadsheetApp.getActiveSpreadsheet().toast('Sync complete.');
}

function syncCustomers_(baseUrl, accessToken) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Customers');
  if (!sheet) throw new Error('No sheet tab named "Customers" found.');

  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const fieldNames = [
    'phoneNumber', 'name', 'birthdate', 'arcNumber', 'country', 'carrier',
    'simType', 'currentPlanName', 'contractStart', 'contractEnd', 'firstPurchaseDate'
  ];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const record = {};
    fieldNames.forEach(function (name) {
      const colIndex = headers.indexOf(name);
      record[name] = colIndex >= 0 ? String(row[colIndex] || '') : '';
    });

    if (!record.phoneNumber) continue; // skip blank rows

    const docPath = baseUrl + '/customers/' + encodeURIComponent(record.phoneNumber);
    const firestoreFields = {};
    fieldNames.forEach(function (name) {
      firestoreFields[name] = { stringValue: record[name] };
    });

    const payload = { fields: firestoreFields };

    UrlFetchApp.fetch(docPath, {
      method: 'patch',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + accessToken },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  }
}

function syncPlanHistory_(baseUrl, accessToken) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('PlanHistory');
  if (!sheet) return; // optional tab

  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const fieldNames = ['phoneNumber', 'planName', 'carrier', 'simType', 'startDate', 'endDate'];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const record = {};
    fieldNames.forEach(function (name) {
      const colIndex = headers.indexOf(name);
      record[name] = colIndex >= 0 ? String(row[colIndex] || '') : '';
    });

    if (!record.phoneNumber) continue;

    // Use a deterministic doc ID (planName+startDate) so re-running the sync
    // doesn't create duplicate history entries.
    const entryId = (record.planName + '_' + record.startDate).replace(/[^a-zA-Z0-9_-]/g, '_');
    const docPath = baseUrl + '/customers/' + encodeURIComponent(record.phoneNumber) +
      '/planHistory/' + encodeURIComponent(entryId);

    const firestoreFields = {};
    fieldNames.forEach(function (name) {
      firestoreFields[name] = { stringValue: record[name] };
    });

    UrlFetchApp.fetch(docPath, {
      method: 'patch',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + accessToken },
      payload: JSON.stringify({ fields: firestoreFields }),
      muteHttpExceptions: true
    });
  }
}

/**
 * Exchanges the service account credentials for a short-lived Firestore access token.
 * (Implements the standard Google OAuth2 JWT bearer flow.)
 */
function getFirestoreAccessToken(clientEmail, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const base64url = function (obj) {
    return Utilities.base64EncodeWebSafe(JSON.stringify(obj)).replace(/=+$/, '');
  };

  const toSign = base64url(header) + '.' + base64url(claimSet);
  const signatureBytes = Utilities.computeRsaSha256Signature(toSign, privateKey);
  const signature = Utilities.base64EncodeWebSafe(signatureBytes).replace(/=+$/, '');
  const jwt = toSign + '.' + signature;

  const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    },
    muteHttpExceptions: true
  });

  const result = JSON.parse(response.getContentText());
  if (!result.access_token) {
    throw new Error('Failed to get access token: ' + response.getContentText());
  }
  return result.access_token;
}
