// main.gs — Entry point for the Google Apps Script web app
// Deploy as: Execute as "Me", Who has access "Anyone" (or restricted as needed).
// QStash will POST to the deployed web app URL.

/**
 * Handle incoming POST requests from QStash.
 *
 * Expected headers:
 *   x-timestamp  — Unix ms timestamp (string)
 *   x-signature  — HMAC-SHA256 hex signature
 *
 * Expected body (JSON):
 *   Deposit:     { transactionType:'deposit',     transactionDate, capital, transactionId }
 *   Certificate: { transactionType:'certificate', transactionDate, numberOfCertificates, price, transactionId }
 *
 * @param {GoogleAppsScript.Events.DoPost} e
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function doPost(e) {
  try {
    // 1. Verify HMAC signature
    verifyHmac(e);

    // 2. Parse body
    var body = e.postData && e.postData.contents ? e.postData.contents : '';
    if (!body) {
      return jsonResponse_({ success: false, error: 'Empty request body' }, 400);
    }

    var payload;
    try {
      payload = JSON.parse(body);
    } catch (parseErr) {
      return jsonResponse_({ success: false, error: 'Invalid JSON body' }, 400);
    }

    // 3. Write to sheet
    appendTransaction(payload);

    // 4. Return success
    return jsonResponse_({ success: true });

  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);

    // Auth failures → 401
    if (
      message.indexOf('Missing required headers') !== -1 ||
      message.indexOf('Invalid timestamp') !== -1 ||
      message.indexOf('timestamp outside') !== -1 ||
      message.indexOf('Invalid signature') !== -1
    ) {
      return jsonResponse_({ success: false, error: message }, 401);
    }

    // Everything else → 500
    Logger.log('doPost error: ' + message);
    return jsonResponse_({ success: false, error: 'Internal server error' }, 500);
  }
}

/**
 * Build a JSON ContentService response.
 *
 * @param {Object} data
 * @param {number} [statusCode] - Unused in GAS (web apps always return 200),
 *   but included in the body for the caller to inspect.
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function jsonResponse_(data, statusCode) {
  var body = Object.assign({ statusCode: statusCode || 200 }, data);
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
