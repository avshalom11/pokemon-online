import "server-only";

import { sendEmail } from "@/lib/email/send-email";

// The one place the account-deletion confirmation email's content is
// defined — same split as password-reset-email.ts (template vs. generic
// Resend transport in send-email.ts).
export async function sendAccountDeletionEmail(to: string, confirmUrl: string): Promise<void> {
  const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1e293b;">
      <h2 style="margin: 0 0 16px;">אישור מחיקת חשבון</h2>
      <p style="margin: 0 0 16px; line-height: 1.6;">
        ביקשת למחוק את החשבון שלך. מחיקת החשבון היא פעולה בלתי הפיכה. לחץ על הכפתור הבא רק אם ברצונך למחוק את החשבון לצמיתות.
      </p>
      <p style="margin: 0 0 24px;">
        <a href="${confirmUrl}" style="display: inline-block; background: #ef4444; color: #ffffff; font-weight: bold; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
          אישור מחיקת החשבון
        </a>
      </p>
      <p style="margin: 0 0 16px; line-height: 1.6; font-size: 13px; color: #64748b;">
        הקישור תקף לזמן מוגבל ואינו ניתן לשימוש חוזר. אם לא ביקשת למחוק את החשבון, אפשר להתעלם מהודעה זו — החשבון שלך יישאר פעיל וללא שינוי.
      </p>
    </div>
  `.trim();

  await sendEmail({ to, subject: "אישור מחיקת חשבון — Monster Online", html });
}
