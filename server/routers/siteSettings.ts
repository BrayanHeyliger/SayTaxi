import { z } from "zod";
import { eq } from "drizzle-orm";
import { desc, asc } from "drizzle-orm";
import { publicProcedure, router, adminProcedure } from "../_core/trpc";
import fs from "node:fs/promises";
import sharp from "sharp";
import path from "node:path";
import { getDb } from "../db";
import { siteSettings, contactMessages } from "../../drizzle/schema";
import nodemailer from "nodemailer";

const SITE_CONFIG_KEY = "site_config";
const NEWS_POSTS_KEY = "news_posts";

const newsPostSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  content: z.string().min(1),
  imageUrl: z.string().optional(),
  publishedAt: z.string().min(1),
  author: z.string().min(1),
  tags: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  // Additional metadata
  slug: z.string().optional(),
  status: z.enum(["draft", "published", "scheduled"]).default("published"),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  category: z.string().optional(),
  order: z.number().optional(),
});

export const siteSettingsRouter = router({
  // Public news feed for "Novedades" page
  getNewsPosts: publicProcedure.query(async () => {
    try {
      // First try local fallback file (useful in dev without DB)
      try {
        const fallbackPath = path.resolve(process.cwd(), "server/_data/news_posts.json");
        const raw = await fs.readFile(fallbackPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch (fileErr) {
        // ignore file errors and continue to DB lookup
      }

      const db = await getDb();
      if (db) {
        const rows = await db
          .select()
          .from(siteSettings)
          .where(eq(siteSettings.key, NEWS_POSTS_KEY))
          .limit(1);
        if (rows.length > 0) {
          const parsed = JSON.parse(rows[0].value);
          if (Array.isArray(parsed)) return parsed;
        }
      }

      return [];
    } catch (err) {
      console.error("[siteSettings] getNewsPosts error:", err);
      return [];
    }
  }),

  // Save complete news list (admin UI uses this for create/edit/delete)
  saveNewsPosts: adminProcedure
    .input(z.object({ posts: z.array(newsPostSchema) }))
    .mutation(async ({ input }) => {
      const payload = JSON.stringify(input.posts);

      // Try to save to DB if available
      try {
        const db = await getDb();
        if (db) {
          try {
            await db
              .insert(siteSettings)
              .values({ key: NEWS_POSTS_KEY, value: payload })
              .onDuplicateKeyUpdate({ set: { value: payload } });
            return { success: true, savedTo: "db" };
          } catch (dbErr) {
            console.error("[siteSettings] DB write failed, falling back to file:", dbErr);
            // continue to file fallback
          }
        }
      } catch (err) {
        console.error("[siteSettings] getDb error (continuing to file fallback):", err);
      }

      // Fallback: write to local file so admin can edit content even without DB
      try {
        const fallbackPath = path.resolve(process.cwd(), "server/_data/news_posts.json");
        await fs.mkdir(path.dirname(fallbackPath), { recursive: true });
        await fs.writeFile(fallbackPath, payload, "utf-8");
        return { success: true, savedTo: "file" };
      } catch (fileErr) {
        console.error("[siteSettings] saveNewsPosts file write error:", fileErr);
        throw new Error("No se pudieron guardar las novedades");
      }
    }),

  // Get site config — public so the landing page can load it without auth
  getConfig: publicProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) return null;
      const rows = await db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, SITE_CONFIG_KEY))
        .limit(1);
      if (rows.length === 0) return null;
      return JSON.parse(rows[0].value);
    } catch (err) {
      console.error("[siteSettings] getConfig error:", err);
      return null;
    }
  }),

  // Save site config — admin only
  saveConfig: adminProcedure
    .input(z.object({ config: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        // Validate it's valid JSON
        JSON.parse(input.config);
        await db
          .insert(siteSettings)
          .values({ key: SITE_CONFIG_KEY, value: input.config })
          .onDuplicateKeyUpdate({ set: { value: input.config } });
        return { success: true };
      } catch (err) {
        console.error("[siteSettings] saveConfig error:", err);
        throw err;
      }
    }),

  // Send contact form email
  sendContactEmail: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      company: z.string().optional(),
      message: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      try {
        // Get config from DB to find notification email and SMTP settings
        const db = await getDb();
        let notificationEmail = "admin@whatsapptaxi.com";
        let smtpConfig: any = null;

        if (db) {
          const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, "site_config")).limit(1);
          if (rows.length > 0) {
            const cfg = JSON.parse(rows[0].value);
            if (cfg.notificationEmail) notificationEmail = cfg.notificationEmail;
            if (cfg.smtpHost && cfg.smtpUser && cfg.smtpPass) {
              smtpConfig = { host: cfg.smtpHost, port: parseInt(cfg.smtpPort || "587"), auth: { user: cfg.smtpUser, pass: cfg.smtpPass }, from: cfg.smtpFrom || cfg.smtpUser };
            }
          }
        }

        const subject = `[Passenger] Nuevo mensaje de ${input.name}${input.company ? ` (${input.company})` : ""}`;
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9fafb;border-radius:12px;">
            <div style="background:#25D366;padding:16px 20px;border-radius:8px 8px 0 0;">
              <h2 style="color:white;margin:0;font-size:18px;">🚕 Nuevo mensaje de contacto</h2>
            </div>
            <div style="background:white;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;">
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;width:120px;">Nombre:</td><td style="padding:8px 0;font-weight:600;color:#111827;">${input.name}</td></tr>
                <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Email:</td><td style="padding:8px 0;color:#2563eb;">${input.email}</td></tr>
                ${input.company ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Empresa:</td><td style="padding:8px 0;color:#111827;">${input.company}</td></tr>` : ""}
              </table>
              <div style="margin-top:16px;padding:16px;background:#f3f4f6;border-radius:8px;border-left:4px solid #25D366;">
                <p style="color:#6b7280;font-size:12px;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:0.05em;">Mensaje:</p>
                <p style="color:#111827;font-size:15px;line-height:1.6;margin:0;">${input.message.replace(/\n/g, "<br>")}</p>
              </div>
              <p style="color:#9ca3af;font-size:12px;margin-top:20px;text-align:center;">Enviado desde el formulario de contacto de Passenger</p>
            </div>
          </div>`;

        if (smtpConfig) {
          const transporter = nodemailer.createTransport({ host: smtpConfig.host, port: smtpConfig.port, secure: smtpConfig.port === 465, auth: smtpConfig.auth });
          await transporter.sendMail({ from: smtpConfig.from, to: notificationEmail, subject, html });
        } else {
          // Log to console if no SMTP configured (for development)
          console.log(`[Contact Form] New message from ${input.name} <${input.email}> to ${notificationEmail}:\n${input.message}`);
        }

        return { success: true, sentTo: notificationEmail };
      } catch (err) {
        console.error("[siteSettings] sendContactEmail error:", err);
        throw new Error("No se pudo enviar el mensaje. Por favor intenta de nuevo.");
      }

      // This line is unreachable but satisfies TS - actual save happens below
    }),

  // Save contact message to DB and send email (public)
  saveAndSendContact: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      company: z.string().optional(),
      message: z.string().min(1),
      ipAddress: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      let notificationEmail = "admin@whatsapptaxi.com";
      let smtpConfig: any = null;

      if (db) {
        // Get SMTP config
        const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, "site_config")).limit(1);
        if (rows.length > 0) {
          const cfg = JSON.parse(rows[0].value);
          if (cfg.notificationEmail) notificationEmail = cfg.notificationEmail;
          if (cfg.smtpHost && cfg.smtpUser && cfg.smtpPass) {
            smtpConfig = { host: cfg.smtpHost, port: parseInt(cfg.smtpPort || "587"), auth: { user: cfg.smtpUser, pass: cfg.smtpPass }, from: cfg.smtpFrom || cfg.smtpUser };
          }
        }

        // Save message to DB
        await db.insert(contactMessages).values({
          name: input.name,
          email: input.email,
          company: input.company || null,
          message: input.message,
          status: "unread",
          ipAddress: input.ipAddress || null,
        });
      }

      // Send email notification
      const subject = `[Passenger] Nuevo mensaje de ${input.name}${input.company ? ` (${input.company})` : ""}`;
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9fafb;border-radius:12px;">
          <div style="background:#25D366;padding:16px 20px;border-radius:8px 8px 0 0;">
            <h2 style="color:white;margin:0;font-size:18px;">🚕 Nuevo mensaje de contacto</h2>
          </div>
          <div style="background:white;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;">
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;width:120px;">Nombre:</td><td style="padding:8px 0;font-weight:600;color:#111827;">${input.name}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Email:</td><td style="padding:8px 0;color:#2563eb;">${input.email}</td></tr>
              ${input.company ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Empresa:</td><td style="padding:8px 0;color:#111827;">${input.company}</td></tr>` : ""}
            </table>
            <div style="margin-top:16px;padding:16px;background:#f3f4f6;border-radius:8px;border-left:4px solid #25D366;">
              <p style="color:#6b7280;font-size:12px;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:0.05em;">Mensaje:</p>
              <p style="color:#111827;font-size:15px;line-height:1.6;margin:0;">${input.message.replace(/\n/g, "<br>")}</p>
            </div>
            <p style="color:#9ca3af;font-size:12px;margin-top:20px;text-align:center;">Enviado desde el formulario de contacto de Passenger</p>
          </div>
        </div>`;

      if (smtpConfig) {
        try {
          const transporter = nodemailer.createTransport({ host: smtpConfig.host, port: smtpConfig.port, secure: smtpConfig.port === 465, auth: smtpConfig.auth });
          await transporter.sendMail({ from: smtpConfig.from, to: notificationEmail, subject, html });
        } catch (mailErr) {
          console.error("[Contact] Email send failed:", mailErr);
        }
      } else {
        console.log(`[Contact Form] New message from ${input.name} <${input.email}> to ${notificationEmail}:\n${input.message}`);
      }

      return { success: true, sentTo: notificationEmail };
    }),

  // Get all contact messages (admin only)
  getMessages: adminProcedure
    .input(z.object({
      status: z.enum(["all", "unread", "read", "replied", "archived"]).optional().default("all"),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { messages: [], total: 0 };
      try {
        let query = db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(input.limit).offset(input.offset);
        const messages = await query;
        return { messages, total: messages.length };
      } catch (err) {
        console.error("[siteSettings] getMessages error:", err);
        return { messages: [], total: 0 };
      }
    }),

  // Update message status
  updateMessageStatus: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["unread", "read", "replied", "archived"]),
      adminNotes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(contactMessages)
        .set({ status: input.status, adminNotes: input.adminNotes ?? null })
        .where(eq(contactMessages.id, input.id));
      return { success: true };
    }),

  // Delete message
  deleteMessage: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(contactMessages).where(eq(contactMessages.id, input.id));
      return { success: true };
    }),

  // Get unread count
  getUnreadCount: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { count: 0 };
    try {
      const messages = await db.select().from(contactMessages).where(eq(contactMessages.status, "unread"));
      return { count: messages.length };
    } catch {
      return { count: 0 };
    }
  }),

  // Test SMTP connection
  testSmtp: adminProcedure
    .input(z.object({
      smtpHost: z.string().min(1),
      smtpPort: z.string().default("587"),
      smtpUser: z.string().email(),
      smtpPass: z.string().min(1),
      smtpFrom: z.string().optional(),
      testEmail: z.string().email(),
    }))
    .mutation(async ({ input }) => {
      try {
        const transporter = nodemailer.createTransport({
          host: input.smtpHost,
          port: parseInt(input.smtpPort),
          secure: parseInt(input.smtpPort) === 465,
          auth: { user: input.smtpUser, pass: input.smtpPass },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
        });
        // Verify connection
        await transporter.verify();
        // Send test email
        await transporter.sendMail({
          from: input.smtpFrom || input.smtpUser,
          to: input.testEmail,
          subject: "✅ Prueba de conexión SMTP — Passenger",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
              <div style="background:#25D366;padding:16px;border-radius:8px 8px 0 0;">
                <h2 style="color:white;margin:0;">✅ Conexión SMTP exitosa</h2>
              </div>
              <div style="background:#f9fafb;padding:20px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;">
                <p style="color:#374151;">Tu configuración SMTP está funcionando correctamente.</p>
                <table style="width:100%;border-collapse:collapse;margin-top:12px;">
                  <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Servidor:</td><td style="padding:6px 0;font-weight:600;">${input.smtpHost}:${input.smtpPort}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Usuario:</td><td style="padding:6px 0;font-weight:600;">${input.smtpUser}</td></tr>
                </table>
                <p style="color:#9ca3af;font-size:12px;margin-top:16px;">Passenger — Panel de Administración</p>
              </div>
            </div>`,
        });
        return { success: true, message: `Email de prueba enviado a ${input.testEmail}` };
      } catch (err: any) {
        console.error("[SMTP Test] Error:", err);
        throw new Error(`Error de conexión SMTP: ${err.message || "Verifica host, puerto y credenciales"}`);
      }
    }),

  // Upload image for news (admin only). Expects a data URL (base64) and saves to client/public/uploads
  uploadNewsImage: adminProcedure
    .input(z.object({ dataUrl: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const matches = input.dataUrl.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);
        if (!matches) throw new Error("Formato de imagen no reconocido. Usa PNG/JPEG/WebP en base64.");
        const mime = matches[1];
        const ext = mime.split("/")[1] === "jpeg" ? "jpg" : mime.split("/")[1];
        const base64 = matches[3];
        const buffer = Buffer.from(base64, "base64");

        const uploadsDir = path.resolve(process.cwd(), "server/uploads");
        await fs.mkdir(uploadsDir, { recursive: true });
        const filename = `news_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const filePath = path.join(uploadsDir, filename);
        await fs.writeFile(filePath, buffer);
        // Create a thumbnail (max width 800px) and small thumb
        try {
          const thumbPath = path.join(uploadsDir, `thumb_${filename}`);
          await sharp(buffer).resize({ width: 1200, withoutEnlargement: true }).toFile(filePath);
          await sharp(buffer).resize({ width: 400, withoutEnlargement: true }).toFile(thumbPath);
        } catch (imgErr) {
          // Image processing is optional; log and continue
          console.warn("[siteSettings] image processing failed:", imgErr);
        }
        // Return web-accessible path
        const publicPath = `/uploads/${filename}`;
        return { success: true, url: publicPath };
      } catch (err) {
        console.error("[siteSettings] uploadNewsImage error:", err);
        throw new Error("No se pudo subir la imagen");
      }
    }),

  // List uploaded media (admin)
  getMediaList: adminProcedure.query(async () => {
    try {
        const uploadsDir = path.resolve(process.cwd(), "server/uploads");
      const files = await fs.readdir(uploadsDir);
      const items = await Promise.all(
        files.map(async (f) => {
          const fp = path.join(uploadsDir, f);
          const stat = await fs.stat(fp);
          return { filename: f, url: `/uploads/${f}`, size: stat.size, mtime: stat.mtime.toISOString() };
        })
      );
      return { items };
    } catch (err) {
      return { items: [] };
    }
  }),

  // Delete an uploaded media file (admin)
  deleteMedia: adminProcedure
    .input(z.object({ filename: z.string().min(1) }))
    .mutation(async ({ input }) => {
      try {
        const uploadsDir = path.resolve(process.cwd(), "server/uploads");
        const fp = path.join(uploadsDir, input.filename);
        await fs.unlink(fp);
        return { success: true };
      } catch (err) {
        console.error("[siteSettings] deleteMedia error:", err);
        throw new Error("No se pudo borrar el archivo");
      }
    }),
});
