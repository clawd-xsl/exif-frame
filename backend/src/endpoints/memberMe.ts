import { Bool, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../types";
import { queryOne } from "../utils/db";
import { verifyJWT } from "../utils/jwt";

export class MemberMe extends OpenAPIRoute {
  schema = {
    tags: ["Members"],
    summary: "Get current member",
    responses: {
      "200": {
        description: "Returns the current member",
        content: {
          "application/json": {
            schema: z.object({ success: Bool(), member: z.object({ id: z.number(), email: z.string(), nickname: z.string(), createdAt: z.number() }) }),
          },
        },
      },
      "401": { description: "Unauthorized" },
    },
  };

  async handle(c: AppContext) {
    const auth = c.req.header('authorization');
    if (!auth || !auth.toLowerCase().startsWith('bearer ')) return new Response("Unauthorized", { status: 401 });
    const token = auth.split(' ')[1] || '';
    let payload: any;
    try { payload = await verifyJWT(token, c.env.JWT_SECRET); } catch { return new Response("Unauthorized", { status: 401 }); }
    const id = Number(payload.sub);
    const row = await queryOne<{ id: number; email: string; nickname: string; created_at: number }>(
      c.env.DB,
      `SELECT id, email, nickname, created_at FROM members WHERE id = ?`,
      id
    );
    if (!row) return new Response("Unauthorized", { status: 401 });
    return { success: true, member: { id: row.id, email: row.email, nickname: row.nickname, createdAt: row.created_at } };
  }
}
