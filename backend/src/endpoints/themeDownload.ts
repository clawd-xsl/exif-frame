import { Bool, Num, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../types";
import { queryOne, run } from "../utils/db";

export class ThemeDownload extends OpenAPIRoute {
  schema = {
    tags: ["Themes"],
    summary: "Increment theme download count",
    request: { params: z.object({ id: Num() }) },
    responses: {
      "200": {
        description: "New download count",
        content: { "application/json": { schema: z.object({ success: Bool(), downloadCount: Num() }) } },
      },
      "404": { description: "Not found" },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const { id } = data.params;
    // Increment
    await run(
      c.env.DB,
      `UPDATE themes SET download_count = download_count + 1 WHERE id = ?`,
      id
    );
    // Fetch new count
    const row = await queryOne<{ downloadCount: number }>(
      c.env.DB,
      `SELECT download_count as downloadCount FROM themes WHERE id = ?`,
      id
    );
    if (!row) return new Response("Not Found", { status: 404 });
    return { success: true, downloadCount: Number(row.downloadCount ?? 0) };
  }
}
