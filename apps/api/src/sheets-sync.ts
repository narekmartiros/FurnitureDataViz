import { google } from 'googleapis';
import { createGoogleOAuthClient } from './google-oauth';

/**
 * Dual-Layer Google Sheets Fetcher (FORMULAS + UNFORMATTED_VALUE)
 * Preserves live spreadsheet formulas (=B1-2*B5) while reading evaluated dimensions.
 */
export async function fetchSheetDualLayer(
  accessToken: string,
  spreadsheetId: string,
  range = 'Sheet20!A1:G27'
) {
  const auth = createGoogleOAuthClient();
  auth.setCredentials({ access_token: accessToken });
  const sheets = google.sheets({ version: 'v4', auth });

  const [formulaRes, valueRes] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
      valueRenderOption: 'FORMULA'
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
      valueRenderOption: 'UNFORMATTED_VALUE'
    })
  ]);

  return {
    formulas: formulaRes.data.values || [],
    values: valueRes.data.values || []
  };
}

/**
 * Two-Way Batch Sync Back to Google Sheets
 * Writes updated cabinet/table parameters and 3D railing coordinates (Rows 24-27) back to Google Sheets.
 */
export async function pushSheetUpdates(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  rows: (string | number)[][]
) {
  const auth = createGoogleOAuthClient();
  auth.setCredentials({ access_token: accessToken });
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows }
  });

  return res.data;
}
