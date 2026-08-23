import "server-only";

import { sendEmail } from "@/lib/email/send-email";

// The one place the password-reset email's content is defined — kept
// separate from send-email.ts (the generic provider transport) so a future
// second email (e.g. a welcome email) never has to touch the Resend
// wiring, and this template never has to know how delivery works.
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1e293b;">
      <h2 style="margin: 0 0 16px;">איפוס סיסמה</h2>
      <p style="margin: 0 0 16px; line-height: 1.6;">
        קיבלנו בקשה לאיפוס הסיסמה לחשבונך ב-Monster Online. לחץ על הכפתור למטה כדי לבחור סיסמה חדשה.
      </p>
      <p style="margin: 0 0 24px;">
        <a href="${resetUrl}" style="display: inline-block; background: #fbbf24; color: #0f172a; font-weight: bold; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
          איפוס סיסמה
        </a>
      </p>
      <p style="margin: 0 0 16px; line-height: 1.6; font-size: 13px; color: #64748b;">
        הקישור תקף לזמן מוגבל ואינו ניתן לשימוש חוזר. אם לא ביקשת לאפס את הסיסמה, אפשר להתעלם מהודעה זו — הסיסמה הנוכחית שלך תישאר בתוקף.
      </p>
    </div>
  `.trim();

  await sendEmail({ to, subject: "איפוס סיסמה — Monster Online", html });
}
