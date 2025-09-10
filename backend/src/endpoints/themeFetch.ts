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
      `SELECT id, owner_member_id as ownerMemberId, title, description, preview_image_url as previewImageUrl, svg, assets, download_count as downloadCount, created_at as createdAt, updated_at as updatedAt FROM themes WHERE id = ?`,
      id
    );
    if (!row) return new Response("Not Found", { status: 404 });
    return { success: true, theme: row };
  }
}
