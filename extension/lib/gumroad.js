// Gumroad license key verification.
//
// Why Gumroad: it's a zero-backend way to charge $1 for an extension. You
// create a product on Gumroad, enable license keys, and paste the product
// permalink into config.js. The user buys the product, Gumroad emails them a
// license key, they paste it into Clippy's popup, and the extension calls
// Gumroad's public verify endpoint to confirm it's real.
//
// Docs: https://help.gumroad.com/article/76-license-keys

const GUMROAD_VERIFY_URL = "https://api.gumroad.com/v2/licenses/verify";

/**
 * Verifies a license key against the configured Gumroad product. Returns
 * { ok: true } on success and { ok: false, reason } on any kind of failure.
 *
 * The `incrementUsesCount` parameter is set to false so repeat verifications
 * (for example, when Clippy starts up) don't inflate the Gumroad uses
 * counter.
 */
export async function verifyGumroadLicenseKey({ productPermalink, licenseKey }) {
  if (!productPermalink || productPermalink === "REPLACE_WITH_YOUR_GUMROAD_PERMALINK") {
    return {
      ok: false,
      reason: "Clippy hasn't been configured with a Gumroad product yet. See PUBLISHING.md.",
    };
  }

  if (!licenseKey || licenseKey.trim().length === 0) {
    return { ok: false, reason: "Please paste your license key." };
  }

  const requestBodyForm = new URLSearchParams();
  requestBodyForm.set("product_permalink", productPermalink);
  requestBodyForm.set("license_key", licenseKey.trim());
  requestBodyForm.set("increment_uses_count", "false");

  let response;
  try {
    response = await fetch(GUMROAD_VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: requestBodyForm.toString(),
    });
  } catch (networkError) {
    return { ok: false, reason: `Couldn't reach Gumroad: ${networkError.message}` };
  }

  let parsedResponse;
  try {
    parsedResponse = await response.json();
  } catch {
    return { ok: false, reason: "Gumroad returned an unreadable response." };
  }

  if (!response.ok || parsedResponse.success !== true) {
    const gumroadMessage = parsedResponse && parsedResponse.message
      ? parsedResponse.message
      : "License key not accepted.";
    return { ok: false, reason: gumroadMessage };
  }

  // Refunded / chargeback purchases still return success:true but mark the
  // purchase as refunded. Block those.
  const purchase = parsedResponse.purchase || {};
  if (purchase.refunded === true || purchase.chargebacked === true) {
    return { ok: false, reason: "This license key was refunded and is no longer valid." };
  }

  return { ok: true };
}
