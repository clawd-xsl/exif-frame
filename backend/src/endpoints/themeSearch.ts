import { Bool, Num, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../types";
import { queryAll, queryOne } from "../utils/db";

export class ThemeSearch extends OpenAPIRoute {
  schema = {
    tags: ["Themes"],
    summary: "Search/list themes across all members",
    request: {
      query: z.object({
        ownerMemberId: Num({ required: false }),
        ids: Str({ required: false }),
        title: Str({ required: false }),
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
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const { ownerMemberId, ids, title, sort, order, page = 1, pageSize = 20 } = data.query ?? ({} as any);

    // Normalize pagination
    const safePage = Math.max(1, Number(page) || 1);
    const safeSize = Math.min(100, Math.max(1, Number(pageSize) || 20));
    const titleParam = typeof title === 'string' ? title.trim() : '';

    const where: string[] = ["1 = 1"]; 
    const params: unknown[] = [];

    if (ownerMemberId !== undefined && ownerMemberId !== null) {
      where.push("t.owner_member_id = ?");
      params.push(ownerMemberId);
    }

    let idsList: number[] = [];
    if (ids) {
      idsList = String(ids)
        .split(",")
        .map((v) => Number(v.trim()))
        .filter((v) => Number.isFinite(v));
      if (idsList.length > 50) idsList = idsList.slice(0, 50);
      if (idsList.length > 0) {
        where.push(`t.id IN (${idsList.map(() => "?").join(",")})`);
        params.push(...idsList);
      }
    }

    if (titleParam.length >= 1) {
      const tt = titleParam.slice(0, 64);
      where.push(`t.title LIKE ?`);
      params.push(`%${tt}%`);
    }

    const dir = (order?.toLowerCase() === "asc" ? "ASC" : "DESC");
    let orderBy = `t.id DESC`;
    if ((sort ?? "").toLowerCase() === "downloadcount") {
      orderBy = `t.download_count ${dir}, t.id DESC`;
    } else {
      orderBy = `t.id ${dir}`;
    }

    const offset = (safePage - 1) * safeSize;

    const countRow = await queryOne<{ count: number }>(c.env.DB, `SELECT COUNT(*) as count FROM themes t WHERE ${where.join(" AND ")}`, ...params);
    const total = Number(countRow?.count ?? 0);

    const rows = await queryAll<any>(
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
      WHERE ${where.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?`,
      ...params,
      safeSize,
      offset
    );

    // Avoid CDN/browser caching for dynamic search
    c.header('Cache-Control', 'no-store');
    return { success: true, page: safePage, pageSize: safeSize, total, themes: rows };
  }
}
