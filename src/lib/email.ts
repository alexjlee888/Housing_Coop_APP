import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM_EMAIL ?? "notifications@yourdomain.com";

export async function sendEventReminderEmail({
  to,
  eventTitle,
  startAt,
  buildingName,
  eventId,
}: {
  to: string;
  eventTitle: string;
  startAt: Date;
  buildingName: string;
  eventId: string;
}) {
  const dateStr = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(startAt);

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Reminder: ${eventTitle} — ${buildingName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
        <h2 style="margin-bottom: 4px;">${eventTitle}</h2>
        <p style="color: #666; margin-top: 0;">${buildingName}</p>
        <p>This is a reminder that <strong>${eventTitle}</strong> starts on <strong>${dateStr}</strong>.</p>
        <p style="font-size: 12px; color: #999;">You are receiving this because you were added as an attendee. Event ID: ${eventId}</p>
      </div>
    `,
  });
}

export async function sendTaskAssignedEmail({
  to,
  taskTitle,
  assignerName,
  buildingName,
  dueDate,
}: {
  to: string;
  taskTitle: string;
  assignerName: string;
  buildingName: string;
  dueDate?: Date | null;
}) {
  const dueDateStr = dueDate
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(dueDate)
    : null;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `New task assigned to you — ${buildingName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
        <h2>You have a new task</h2>
        <p><strong>${assignerName}</strong> assigned you a task in <strong>${buildingName}</strong>:</p>
        <p style="background: #f5f5f5; padding: 12px; border-radius: 6px;"><strong>${taskTitle}</strong></p>
        ${dueDateStr ? `<p>Due: <strong>${dueDateStr}</strong></p>` : ""}
      </div>
    `,
  });
}
