import * as crypto from 'crypto';

export interface SignRequestParams {
  method: string;
  path: string;
  query: string;
  body: string;
  secret: string;
}

export interface SignRequestResult {
  timestamp: string;
  signature: string;
}

/**
 * Sign an outgoing HTTP request using the same algorithm as HmacSignatureGuard.
 * Produces `x-timestamp` and `x-signature` headers for HMAC validation.
 *
 * String to sign: METHOD\nPATH\nQUERY\nTIMESTAMP\nBODY
 */
export function signRequest(params: SignRequestParams): SignRequestResult {
  const { method, path, query, body, secret } = params;
  const timestamp = String(Date.now());

  const stringToSign = [
    method.toUpperCase(),
    path,
    query,
    timestamp,
    body,
  ].join('\n');

  const signature = crypto
    .createHmac('sha256', secret)
    .update(stringToSign)
    .digest('hex');

  return { timestamp, signature };
}
