import { Bool, Num, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../types";
import { queryOne, run } from "../utils/db";
import { verifyJWT } from "../utils/jwt";

export class ThemeUpdate extends OpenAPIRoute {
  schema = {
    tags: ["Themes"],
    summary: "Update theme",
    request: {
      params: z.object({ id: Num() }),
      body: {
        content: {
          "application/json": {
            schema: z.object({
              title: Str({ required: false }),
              description: Str({ required: false }),
              previewImageUrl: Str({ required: false }),
              svg: Str({ required: false }),
              assets: Str({ required: false }),
            }),
          },
        },
      },
    },
    responses: {
      "200": { description: "Updated", content: { "application/json": { schema: z.object({ success: Bool() }) } } },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden" },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const { id } = data.params;
    const auth = c.req.header('authorization');
    if (!auth || !auth.toLowerCase().startsWith('bearer ')) return new Response("Unauthorized", { status: 401 });
    const token = auth.split(' ')[1] || '';
    let payload: any;
    try { payload = await verifyJWT(token, c.env.JWT_SECRET); } catch { return new Response("Unauthorized", { status: 401 }); }
    const userId = Number(payload.sub);
    // Ensure ownership
    const existing = await queryOne<{ ownerMemberId: number }>(
      c.env.DB,
      `SELECT owner_member_id as ownerMemberId FROM themes WHERE id = ?`,
      id
    );
    if (!existing || existing.ownerMemberId !== userId) return c.json({ success: false, error: 'Forbidden' }, 403);
    const updates: string[] = [];
    const params: unknown[] = [];
    const b = data.body ?? {};
    if (b.title !== undefined) { updates.push('title = ?'); params.push(b.title); }
    if (b.description !== undefined) { updates.push('description = ?'); params.push(b.description); }
    if (b.previewImageUrl !== undefined) { updates.push('preview_image_url = ?'); params.push(b.previewImageUrl); }
    if (b.svg !== undefined) { updates.push('svg = ?'); params.push(b.svg); }
    if (b.assets !== undefined) { updates.push('assets = ?'); params.push(b.assets); }
    updates.push('updated_at = ?'); params.push(Date.now());
    params.push(id);
    await run(c.env.DB, `UPDATE themes SET ${updates.join(', ')} WHERE id = ?`, ...params);
    return { success: true };
  }
}
