import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../types";
import { run } from "../utils/db";
import { verifyJWT } from "../utils/jwt";

export class ThemeCreate extends OpenAPIRoute {
  schema = {
    tags: ["Themes"],
    summary: "Create theme (self)",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              title: Str(),
              description: Str({ required: false }),
              previewImageUrl: Str({ required: false }),
              svg: Str({ required: false }),
              assets: Str({ required: false }), // JSON string
            }),
          },
        },
      },
    },
    responses: {
      "200": { description: "Created theme", content: { "application/json": { schema: z.object({ success: Bool(), id: z.number() }) } } },
      "400": { description: "Bad Request" },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden" },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const auth = c.req.header('authorization');
    if (!auth || !auth.toLowerCase().startsWith('bearer ')) return new Response("Unauthorized", { status: 401 });
    const token = auth.split(' ')[1] || '';
    let payload: any;
    try { payload = await verifyJWT(token, c.env.JWT_SECRET); } catch { return new Response("Unauthorized", { status: 401 }); }
    const ownerId = Number(payload.sub);
    const now = Date.now();
    // Validate non-empty assets if provided
    if (data.body.assets !== undefined && data.body.assets !== null && String(data.body.assets).trim().length === 0) {
      return c.json({ success: false, error: 'assets must not be empty' }, 400);
    }
    const id = await run(
      c.env.DB,
      `INSERT INTO themes (owner_member_id, title, description, preview_image_url, svg, assets, download_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      ownerId,
      data.body.title,
      data.body.description ?? null,
      data.body.previewImageUrl ?? null,
      data.body.svg ?? null,
      data.body.assets ?? null,
      now,
      now
    );
    return { success: true, id };
  }
}
