import { z } from "zod";
import { publicProcedure, router, adminProcedure } from "../_core/trpc";
import { rawQuery, rawMutate } from "../db";

interface Announcement {
  id: number;
  title: string;
  message: string;
  type: string;
  target: string;
  active: number;
  pinned: number;
  expiresAt: number | null;
  createdAt: number;
  createdBy: string;
}

export const announcementsRouter = router({
  // Get active announcements for a specific target
  getActive: publicProcedure
    .input(z.object({ target: z.enum(["clients", "drivers", "fleet", "all"]) }))
    .query(async ({ input }) => {
      const now = Date.now();
      return rawQuery<Announcement>(
        `SELECT * FROM announcements 
         WHERE active = 1 
         AND (target = 'all' OR target = ?)
         AND (expiresAt IS NULL OR expiresAt > ?)
         ORDER BY pinned DESC, createdAt DESC
         LIMIT 10`,
        [input.target, now]
      );
    }),

  // Get all announcements for admin panel
  getAll: adminProcedure.query(async () => {
    return rawQuery<Announcement>(
      `SELECT * FROM announcements ORDER BY createdAt DESC LIMIT 50`
    );
  }),

  // Create a new announcement
  create: adminProcedure
    .input(z.object({
      title: z.string().min(1).max(255),
      message: z.string().min(1),
      type: z.enum(["info", "warning", "success", "urgent"]),
      target: z.enum(["all", "drivers", "clients", "fleet"]),
      pinned: z.boolean().default(false),
      expiresAt: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      await rawMutate(
        `INSERT INTO announcements (title, message, type, target, active, pinned, expiresAt, createdAt, createdBy)
         VALUES (?, ?, ?, ?, 1, ?, ?, ?, 'admin')`,
        [input.title, input.message, input.type, input.target, input.pinned ? 1 : 0, input.expiresAt ?? null, Date.now()]
      );
      return { success: true };
    }),

  // Toggle active status
  toggleActive: adminProcedure
    .input(z.object({ id: z.number(), active: z.boolean() }))
    .mutation(async ({ input }) => {
      await rawMutate(
        `UPDATE announcements SET active = ? WHERE id = ?`,
        [input.active ? 1 : 0, input.id]
      );
      return { success: true };
    }),

  // Delete announcement
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await rawMutate(`DELETE FROM announcements WHERE id = ?`, [input.id]);
      return { success: true };
    }),
});
