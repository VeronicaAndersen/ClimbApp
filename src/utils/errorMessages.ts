/**
 * Converts technical error messages into user-friendly Swedish messages
 */
export function getUserFriendlyError(error: unknown): string {
  // Handle null/undefined
  if (!error) {
    return "Ett oväntat fel uppstod. Försök igen.";
  }

  // Extract error message
  let errorMessage = "";
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === "string") {
    errorMessage = error;
  } else {
    return "Ett oväntat fel uppstod. Försök igen.";
  }

  // Convert to lowercase for easier matching
  const msg = errorMessage.toLowerCase();

  // Network and connection errors
  if (msg.includes("network") || msg.includes("fetch")) {
    return "Kunde inte ansluta till servern. Kontrollera din internetanslutning.";
  }

  if (msg.includes("timeout")) {
    return "Servern svarade inte i tid. Försök igen om en stund.";
  }

  // Authentication errors
  if (msg.includes("401") || msg.includes("unauthorized") || msg.includes("autentisering")) {
    return "Din session har gått ut. Logga in igen.";
  }

  if (msg.includes("403") || msg.includes("forbidden")) {
    return "Du har inte behörighet att utföra denna åtgärd.";
  }

  if (msg.includes("invalid credentials") || msg.includes("wrong password")) {
    return "Felaktigt användarnamn eller lösenord.";
  }

  // Validation errors
  if (msg.includes("ifsc: top implies zone") || msg.includes("got_bonus must be true")) {
    return "Enligt IFSC-regler måste bonus uppnås innan topp. Sätt bonusvärde först.";
  }

  if (msg.includes("attempts_to_top must be >= attempts_to_bonus")) {
    return "Antal försök till topp kan inte vara färre än försök till bonus.";
  }

  if (msg.includes("attempts_to_bonus cannot exceed attempts_total")) {
    return "Försök till bonus kan inte överstiga totalt antal försök.";
  }

  if (msg.includes("attempts_to_top cannot exceed attempts_total")) {
    return "Försök till topp kan inte överstiga totalt antal försök.";
  }

  if (msg.includes("required") || msg.includes("obligatorisk")) {
    return "Alla obligatoriska fält måste fyllas i.";
  }

  if (msg.includes("duplicate") || msg.includes("already exists")) {
    return "Denna post finns redan. Använd ett annat värde.";
  }

  // Database/server errors
  if (msg.includes("404") || msg.includes("not found")) {
    return "Kunde inte hitta den begärda informationen.";
  }

  if (msg.includes("500") || msg.includes("internal server")) {
    return "Ett serverfel uppstod. Försök igen senare.";
  }

  if (msg.includes("bad request") || msg.includes("400")) {
    return "Ogiltig förfrågan. Kontrollera att alla uppgifter är korrekta.";
  }

  // Password validation
  if (msg.includes("password") && msg.includes("length")) {
    return "Lösenordet måste innehålla minst 6 tecken.";
  }

  // Competition/registration errors
  if (msg.includes("redan anmäld") || msg.includes("already registered")) {
    return "Du är redan anmäld till denna tävling.";
  }

  if (msg.includes("tävling") && msg.includes("full")) {
    return "Tävlingen är fullbokad.";
  }

  // If we have a Swedish error message, use it
  if (
    msg.includes("misslyckades") ||
    msg.includes("kunde inte") ||
    msg.includes("fel uppstod") ||
    msg.includes("gick fel")
  ) {
    return errorMessage; // Already user-friendly
  }

  // Default: Clean up the error message a bit
  // Remove technical prefixes like "Error:", "TypeError:", etc.
  const cleanedMessage = errorMessage
    .replace(/^(Error|TypeError|ReferenceError|NetworkError):\s*/i, "")
    .trim();

  // If the cleaned message is very short or looks technical, use a generic message
  if (cleanedMessage.length < 10 || /^[A-Z_]+$/.test(cleanedMessage)) {
    return "Ett fel uppstod. Försök igen eller kontakta support om problemet kvarstår.";
  }

  return cleanedMessage;
}
