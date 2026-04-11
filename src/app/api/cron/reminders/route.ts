import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEventReminderEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  // Protect cron endpoint
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Get all unsent reminders for future events
  const reminders = await db.eventReminder.findMany({
    where: { sentAt: null, event: { startAt: { gt: now } } },
    include: {
      event: {
        include: {
          building: { select: { name: true } },
          attendees: {
            include: { user: { select: { email: true, name: true, username: true } } },
            where: { rsvp: { not: false } }, // exclude declines
          },
        },
      },
    },
  });

  let sent = 0;

  for (const reminder of reminders) {
    const { event } = reminder;

    // Calculate trigger time: event.startAt - reminder offset
    const offsetMs =
      reminder.unit === "MINUTES"
        ? reminder.amount * 60 * 1000
        : reminder.unit === "HOURS"
        ? reminder.amount * 60 * 60 * 1000
        : reminder.amount * 24 * 60 * 60 * 1000;

    const triggerAt = new Date(event.startAt.getTime() - offsetMs);

    if (now >= triggerAt) {
      // Send to all non-declined attendees
      for (const attendee of event.attendees) {
        try {
          await sendEventReminderEmail({
            to: attendee.user.email,
            eventTitle: event.title,
            startAt: event.startAt,
            buildingName: event.building.name,
            eventId: event.id,
          });
        } catch (err) {
          console.error(`Failed to send reminder to ${attendee.user.email}:`, err);
        }
      }

      await db.eventReminder.update({
        where: { id: reminder.id },
        data: { sentAt: now },
      });

      sent++;
    }
  }

  return NextResponse.json({ processed: reminders.length, sent });
}
