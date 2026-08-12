import { z } from "zod";
import { publicProcedure, router, adminProcedure } from "../_core/trpc";
import { rawQuery, rawMutate } from "../db";

interface SafetyTip {
  id: number;
  audience: string;
  category: string;
  title: string;
  tip: string;
  icon: string;
  priority: number;
  active: number;
  createdAt: number;
}

export const safetyTipsRouter = router({
  // Get tips for a specific audience
  getByAudience: publicProcedure
    .input(z.object({ audience: z.enum(["clients", "drivers", "fleet"]) }))
    .query(async ({ input }) => {
      return rawQuery<SafetyTip>(
        `SELECT * FROM safetyTips WHERE audience = ? AND active = 1 ORDER BY priority DESC, id ASC`,
        [input.audience]
      );
    }),

  // Get all tips for admin
  getAll: adminProcedure.query(async () => {
    return rawQuery<SafetyTip>(
      `SELECT * FROM safetyTips ORDER BY audience, category, priority DESC`
    );
  }),

  // Create tip
  create: adminProcedure
    .input(z.object({
      audience: z.enum(["clients", "drivers", "fleet"]),
      category: z.string().min(1).max(100),
      title: z.string().min(1).max(255),
      tip: z.string().min(1),
      icon: z.string().max(10).default("💡"),
      priority: z.number().default(5),
    }))
    .mutation(async ({ input }) => {
      await rawMutate(
        `INSERT INTO safetyTips (audience, category, title, tip, icon, priority, active, createdAt) VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        [input.audience, input.category, input.title, input.tip, input.icon, input.priority, Date.now()]
      );
      return { success: true };
    }),

  // Update tip
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      category: z.string().optional(),
      title: z.string().optional(),
      tip: z.string().optional(),
      icon: z.string().optional(),
      priority: z.number().optional(),
      active: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...fields } = input;
      const sets: string[] = [];
      const vals: unknown[] = [];
      if (fields.category !== undefined) { sets.push("category = ?"); vals.push(fields.category); }
      if (fields.title !== undefined) { sets.push("title = ?"); vals.push(fields.title); }
      if (fields.tip !== undefined) { sets.push("tip = ?"); vals.push(fields.tip); }
      if (fields.icon !== undefined) { sets.push("icon = ?"); vals.push(fields.icon); }
      if (fields.priority !== undefined) { sets.push("priority = ?"); vals.push(fields.priority); }
      if (fields.active !== undefined) { sets.push("active = ?"); vals.push(fields.active ? 1 : 0); }
      if (sets.length === 0) return { success: true };
      vals.push(id);
      await rawMutate(`UPDATE safetyTips SET ${sets.join(", ")} WHERE id = ?`, vals);
      return { success: true };
    }),

  // Delete tip
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await rawMutate(`DELETE FROM safetyTips WHERE id = ?`, [input.id]);
      return { success: true };
    }),
});
