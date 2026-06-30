type EmailPayload = {
  to: string;
  subject: string;
  body: string;
};

export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean }> {
  if (process.env.NODE_ENV === "development") {
    console.log("\n");
    console.log("─".repeat(50));
    console.log("📧 EMAIL FROM LEGAL TECH");
    console.log("─".repeat(50));
    console.log(`TO:      ${payload.to}`);
    console.log(`SUBJECT: ${payload.subject}`);
    console.log("─".repeat(50));
    console.log(payload.body);
    console.log("─".repeat(50));
    console.log("\n");
    return { success: true };
  }

  // Production: integrate Resend or SendGrid here
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: "noreply@yourdomain.com",
  //   to: payload.to,
  //   subject: payload.subject,
  //   text: payload.body,
  // });
  return { success: true };
}
