import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../types";
import { run } from "../utils/db";
import { verifyJWT } from "../utils/jwt";
import { hashPassword } from "../utils/password";

export class MemberUpdateMe extends OpenAPIRoute {
  schema = {
    tags: ["Members"],
    summary: "Update current member",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({ nickname: Str({ required: false }), password: z.string().min(8).optional() }),
          },
        },
      },
    },
    responses: {
      "200": { description: "Updated member", content: { "application/json": { schema: z.object({ success: Bool() }) } } },
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
    const data = await this.getValidatedData<typeof this.schema>();
    const updates: string[] = [];
    const params: unknown[] = [];
    if (data.body?.nickname) { updates.push('nickname = ?'); params.push(data.body.nickname); }
    if (data.body?.password) { updates.push('password_hash = ?'); params.push(await hashPassword(data.body.password)); }
    if (updates.length === 0) return { success: true };
    params.push(id);
    await run(c.env.DB, `UPDATE members SET ${updates.join(', ')} WHERE id = ?`, ...params);
    return { success: true };
  }
}
