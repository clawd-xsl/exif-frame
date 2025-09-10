import { Bool, Num, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../types";
import { queryAll, queryOne } from "../utils/db";
import { verifyJWT } from "../utils/jwt";

export class ThemeList extends OpenAPIRoute {
  schema = {
    tags: ["Themes"],
    summary: "List my themes",
    request: {
      query: z.object({
        // CSV of ids, e.g., "1,2,3"
        ids: Str({ required: false }),
        // Title substring search
        title: Str({ required: false }),
        // Sort by downloadCount when provided
        sort: Str({ required: false, example: "downloadCount" }),
        order: Str({ required: false, example: "desc" }),
        page: Num({ required: false, default: 1 }),
        pageSize: Num({ required: false, default: 20 }),
      }),
    },
    responses: {
      "200": {
        description: "Themes list",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              page: Num(),
              pageSize: Num(),
              total: Num(),
              themes: z.array(z.any()),
            }),
          },
        },
      },
      "401": { description: "Unauthorized" },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    // Auth to get my owner id
    const auth = c.req.header('authorization');
    if (!auth || !auth.toLowerCase().startsWith('bearer ')) return new Response("Unauthorized", { status: 401 });
    const token = auth.split(' ')[1] || '';
    let payload: any;
    try { payload = await verifyJWT(token, c.env.JWT_SECRET); } catch { return new Response("Unauthorized", { status: 401 }); }
    const ownerId = Number(payload.sub);
    const { ids, title, sort, order, page = 1, pageSize = 20 } = (data as any).request?.query ?? (data as any).query ?? {};

    // Normalize pagination
    const safePage = Math.max(1, Number(page) || 1);
    const safeSize = Math.min(100, Math.max(1, Number(pageSize) || 20));
    const titleParam = typeof title === 'string' ? title.trim() : '';

    const where: string[] = ["owner_member_id = ?"]; 
    const params: unknown[] = [ownerId];

    // Filter by ids
    let idsList: number[] = [];
    if (ids) {
      idsList = String(ids)
        .split(",")
        .map((v) => Number(v.trim()))
        .filter((v) => Number.isFinite(v));
      if (idsList.length > 50) idsList = idsList.slice(0, 50);
      if (idsList.length > 0) {
        where.push(`id IN (${idsList.map(() => "?").join(",")})`);
        params.push(...idsList);
      }
    }

    // Title search
    if (titleParam.length >= 1) {
      const t = titleParam.slice(0, 64);
      where.push(`title LIKE ?`);
      params.push(`%${t}%`);
    }

    // Sorting
    const dir = (order?.toLowerCase() === "asc" ? "ASC" : "DESC");
    let orderBy = `id DESC`;
    if ((sort ?? "").toLowerCase() === "downloadcount") {
      orderBy = `download_count ${dir}, id DESC`;
    } else {
      orderBy = `id ${dir}`;
    }

    // Pagination
    const offset = (safePage - 1) * safeSize;

    // Total count
    const countRow = await queryOne<{ count: number }>(
      c.env.DB,
      `SELECT COUNT(*) as count FROM themes WHERE ${where.join(" AND ")}`,
      ...params
    );
    const total = Number(countRow?.count ?? 0);

    // Data
    const rows = await queryAll<any>(
      c.env.DB,
      `SELECT id, owner_member_id as ownerMemberId, title, description, preview_image_url as previewImageUrl, svg, assets, download_count as downloadCount, created_at as createdAt, updated_at as updatedAt FROM themes WHERE ${where.join(
        " AND "
      )} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      ...params,
      safeSize,
      offset
    );
    // Avoid CDN/browser caching for dynamic queries
    c.header('Cache-Control', 'no-store');
    return { success: true, page: safePage, pageSize: safeSize, total, themes: rows };
  }
}
