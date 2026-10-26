import nodemailer from "nodemailer";
import type { Application, Job, Profile } from "../src/lib/db/schema";
import type { AllSettings } from "../src/lib/settings";

export function smtpReady() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendEmailApplication(input: {
  job: Job;
  app: Application;
  profile: Profile;
  settings: AllSettings;
  resume: { name: string; mime: string; buffer: Buffer } | null;
}) {
  const { job, app, profile, settings, resume } = input;
  if (!job.applyEmail) throw new Error("This job has no application email");
  const port = Number(process.env.SMTP_PORT || 465);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  const subject = settings.apply.emailSubject.replace("{title}", job.title).replace("{company}", job.company);
  const links = [profile.linkedin, profile.github, profile.portfolio].filter(Boolean).join("\n");
  await transport.sendMail({
    from: `"${profile.fullName}" <${process.env.SMTP_USER}>`,
    replyTo: profile.email,
    to: job.applyEmail,
    subject,
    text: `${app.coverLetter}\n\n${profile.phone ? `${profile.phone}\n` : ""}${links}`.trim(),
    attachments: resume ? [{ filename: resume.name, content: resume.buffer, contentType: resume.mime }] : [],
  });
}
