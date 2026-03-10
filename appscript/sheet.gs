// sheet.gs — Google Sheet write logic

/**
 * Dispatch to the correct append function based on transactionType.
 *
 * @param {Object} payload - Parsed JSON body from the QStash request.
 *   Deposit shape:     { transactionType:'deposit',     transactionDate, capital, transactionId }
 *   Certificate shape: { transactionType:'certificate', transactionDate, numberOfCertificates, price, transactionId }
 */
function appendTransaction(payload) {
  var sheet = getOrCreateSheet_();

  if (payload.transactionType === 'deposit') {
    appendDepositRow_(sheet, payload);
  } else if (payload.transactionType === 'certificate') {
    appendCertificateRow_(sheet, payload);
  } else {
    throw new Error('Unknown transactionType: ' + payload.transactionType);
  }
}

/**
 * Append a deposit transaction row.
 * Columns: transactionDate | capital | transactionId | createdAt
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {Object} payload
 */
function appendDepositRow_(sheet, payload) {
  ensureHeaders_(sheet, CONFIG.DEPOSIT_HEADERS);
  sheet.appendRow([
    payload.transactionDate,
    payload.capital,
    payload.transactionId,
    new Date().toISOString(),
  ]);
}

/**
 * Append a certificate transaction row.
 * Columns: transactionDate | numberOfCertificates | price | transactionId | createdAt
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {Object} payload
 */
function appendCertificateRow_(sheet, payload) {
  ensureHeaders_(sheet, CONFIG.CERTIFICATE_HEADERS);
  sheet.appendRow([
    payload.transactionDate,
    payload.numberOfCertificates,
    payload.price,
    payload.transactionId,
    new Date().toISOString(),
  ]);
}

/**
 * Return the target sheet by name. Creates it if it does not exist.
 *
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getOrCreateSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
  }
  return sheet;
}

/**
 * Write header row if the sheet is empty (first row has no content).
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string[]} headers
 */
function ensureHeaders_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
}
