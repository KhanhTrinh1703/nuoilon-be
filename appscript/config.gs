// config.gs — Application-wide constants
// Copy ACTIVE_SECRET from your backend's ACTIVE_SECRET environment variable.
// Never commit a real secret; replace the placeholder before deploying.

var CONFIG = {
  // Must match the backend's ACTIVE_SECRET env var
  ACTIVE_SECRET: 'REPLACE_WITH_YOUR_ACTIVE_SECRET',

  // Google Sheet tab name to write transactions into
  SHEET_NAME: 'Transactions',

  // Must match backend's HmacSignatureGuard window (5 minutes in ms)
  ALLOWED_TIME_WINDOW_MS: 5 * 60 * 1000,

  // Column headers — order defines column positions written by sheet.gs
  DEPOSIT_HEADERS: ['transactionDate', 'capital', 'transactionId', 'createdAt'],
  CERTIFICATE_HEADERS: ['transactionDate', 'numberOfCertificates', 'price', 'transactionId', 'createdAt'],
};
