// auth.gs — HMAC-SHA256 request verification
// Mirrors the backend's HmacSignatureGuard algorithm exactly.
// String to sign: METHOD\nPATH\nQUERY\nTIMESTAMP\nBODY

/**
 * Verify the HMAC signature of an incoming POST request.
 * Throws an Error with a descriptive message on any validation failure.
 *
 * @param {GoogleAppsScript.Events.DoPost} e - The doPost event object.
 */
function verifyHmac(e) {
  var headers = e.parameter || {};
  // Apps Script exposes headers via e.headers (ExecutionAPI) or via
  // the X-* forwarded headers as parameters; use postData path for the URL.
  var requestHeaders = getHeaders_(e);

  var timestamp = requestHeaders['x-timestamp'];
  var signature = requestHeaders['x-signature'];

  if (!timestamp || !signature) {
    throw new Error('Missing required headers: x-timestamp and x-signature');
  }

  validateTimestamp_(timestamp);
  validateSignature_(e, timestamp, signature);
}

/**
 * Extract headers from the doPost event.
 * Apps Script web apps surface headers in e.parameter for GET but not POST;
 * however QStash forwards custom headers which Apps Script exposes via the
 * ContentService request context. We read them from e.headers when available,
 * falling back to lowercase keys in e.parameter.
 *
 * @param {GoogleAppsScript.Events.DoPost} e
 * @returns {Object} headers map (lowercase keys)
 */
function getHeaders_(e) {
  // When deployed as a web app, Apps Script provides headers via e.headers
  if (e.headers) {
    var normalized = {};
    var keys = Object.keys(e.headers);
    for (var i = 0; i < keys.length; i++) {
      normalized[keys[i].toLowerCase()] = e.headers[keys[i]];
    }
    return normalized;
  }
  // Fallback: read from e.parameter (lowercase)
  return e.parameter || {};
}

/**
 * Validate that the request timestamp is within the allowed time window.
 * @param {string} timestamp - Unix timestamp in milliseconds as string.
 */
function validateTimestamp_(timestamp) {
  var requestTime = parseInt(timestamp, 10);
  if (isNaN(requestTime)) {
    throw new Error('Invalid timestamp format');
  }

  var diff = Math.abs(Date.now() - requestTime);
  if (diff > CONFIG.ALLOWED_TIME_WINDOW_MS) {
    throw new Error('Request timestamp outside allowed window');
  }
}

/**
 * Compute expected HMAC and compare with received signature.
 * @param {GoogleAppsScript.Events.DoPost} e
 * @param {string} timestamp
 * @param {string} receivedSignature - Hex-encoded HMAC-SHA256.
 */
function validateSignature_(e, timestamp, receivedSignature) {
  var method = 'POST';
  var fullUrl = ScriptApp.getService().getUrl();
  var urlParts = fullUrl.split('?');
  var path = urlParts[0].replace(/^https?:\/\/[^\/]+/, '');
  var query = urlParts.length > 1 ? urlParts[1] : '';
  var body = e.postData ? e.postData.contents : '';

  var stringToSign = buildStringToSign_(method, path, query, timestamp, body);
  var expectedSignature = computeHmac_(CONFIG.ACTIVE_SECRET, stringToSign);

  if (!safeCompare_(expectedSignature, receivedSignature)) {
    throw new Error('Invalid signature');
  }
}

/**
 * Build the canonical string to sign.
 * Format: METHOD\nPATH\nQUERY\nTIMESTAMP\nBODY
 *
 * @param {string} method
 * @param {string} path
 * @param {string} query
 * @param {string} timestamp
 * @param {string} body
 * @returns {string}
 */
function buildStringToSign_(method, path, query, timestamp, body) {
  return [method, path, query, timestamp, body].join('\n');
}

/**
 * Compute HMAC-SHA256 and return hex-encoded string.
 * Uses Apps Script's Utilities.computeHmacSha256Signature.
 *
 * @param {string} secret
 * @param {string} data
 * @returns {string} hex string
 */
function computeHmac_(secret, data) {
  var signatureBytes = Utilities.computeHmacSha256Signature(data, secret);
  return hexEncode_(signatureBytes);
}

/**
 * Encode a byte array (signed integers) to a lowercase hex string.
 * @param {number[]} bytes
 * @returns {string}
 */
function hexEncode_(bytes) {
  return bytes
    .map(function (b) {
      return ((b + 256) % 256).toString(16).padStart(2, '0');
    })
    .join('');
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function safeCompare_(a, b) {
  if (a.length !== b.length) return false;
  var result = 0;
  for (var i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
