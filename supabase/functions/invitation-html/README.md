# HTML invitation scanner handoff

Set the server-side secrets SCANNER_SUBMIT_URL, SCANNER_API_KEY and
SCANNER_CALLBACK_URL. The submission URL must be a trusted HTTPS scanner
adapter that accepts a bearer-authenticated multipart POST with file, scan_id
and callback_url, and acknowledges queueing with a 2xx response. Configure
the callback URL as the deployed /functions/v1/html-scan-callback endpoint.
This interface requires an adapter when the provider assigns its own job IDs.

The callback must authenticate its sender and apply a verdict only where
scan_id matches the pending design. Each upload uses a fresh storage object
and job ID. Failed submissions stay private and can be replaced by re-upload.
