import { Bool, Num, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../types";
import { queryOne } from "../utils/db";

export class ThemeFetch extends OpenAPIRoute {
  schema = {
    tags: ["Themes"],
    summary: "Get theme by id",
    request: { params: z.object({ id: Num() }) },
    responses: {
      "200": { description: "Theme", content: { "application/json": { schema: z.object({ success: Bool(), theme: z.any() }) } } },
      "404": { description: "Not found" },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const id = data.params.id;
    const row = await queryOne<any>(
      c.env.DB,
      `SELECT 
        t.id,
        t.owner_member_id as ownerMemberId,
        m.nickname as ownerNickname,
        t.title,
        t.description,
        t.preview_image_url as previewImageUrl,
        t.svg,
        t.assets,
        t.download_count as downloadCount,
        t.created_at as createdAt,
        t.updated_at as updatedAt
      FROM themes t
      LEFT JOIN members m ON m.id = t.owner_member_id
      WHERE t.id = ?`,
      id
    );
    if (!row) return new Response("Not Found", { status: 404 });
    return { success: true, theme: row };
  }
}
