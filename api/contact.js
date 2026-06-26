const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || "p.cruz8@yahoo.com";
const CONTACT_FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || "PABLO.DEV <onboarding@resend.dev>";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return response.status(500).json({ error: "Email service is not configured." });
  }

  let body = request.body || {};

  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return response.status(400).json({ error: "Invalid request body." });
    }
  }

  const { name, email, message } = body;
  const trimmedName = String(name || "").trim();
  const trimmedEmail = String(email || "").trim();
  const trimmedMessage = String(message || "").trim();

  if (!trimmedName || !isValidEmail(trimmedEmail) || !trimmedMessage) {
    return response.status(400).json({ error: "Please provide a valid name, email, and message." });
  }

  let resendResponse;

  try {
    resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: CONTACT_FROM_EMAIL,
        to: CONTACT_TO_EMAIL,
        reply_to: trimmedEmail,
        subject: `Portfolio contact from ${trimmedName}`,
        text: [
          `Name: ${trimmedName}`,
          `Email: ${trimmedEmail}`,
          "",
          trimmedMessage
        ].join("\n"),
        html: `
          <h2>New portfolio contact</h2>
          <p><strong>Name:</strong> ${escapeHtml(trimmedName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(trimmedEmail)}</p>
          <p><strong>Message:</strong></p>
          <p>${escapeHtml(trimmedMessage).replace(/\n/g, "<br>")}</p>
        `
      })
    });
  } catch (error) {
    console.error("Resend request failed:", error);
    return response.status(502).json({ error: "Email failed to send." });
  }

  if (!resendResponse.ok) {
    const errorDetails = await resendResponse.text();
    console.error("Resend email failed:", errorDetails);
    return response.status(502).json({ error: "Email failed to send." });
  }

  return response.status(200).json({ ok: true });
};
