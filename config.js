// Supabase connection. These two values are PUBLIC by design:
// the "publishable" key only lets visitors do what the Row Level Security
// rules in supabase/schema.sql allow (read rooms, send a request).
// NEVER put a "secret" or "service_role" key in this file.
window.QAREEB_SUPABASE = {
  url: "https://oumkuzpwpgpjalmsmsbv.supabase.co",
  key: "sb_publishable_-yHJ89zN4c9dV4iLBP4cJA_k3ODWVre",
};
