import { Bool, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../types";
import { run } from "../utils/db";
import { verifyJWT } from "../utils/jwt";

export class MemberDeleteMe extends OpenAPIRoute {
  schema = {
    tags: ["Members"],
    summary: "Delete current member",
    responses: {
      "200": { description: "Deleted", content: { "application/json": { schema: z.object({ success: Bool() }) } } },
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
    await run(c.env.DB, `DELETE FROM themes WHERE owner_member_id = ?`, id);
    await run(c.env.DB, `DELETE FROM members WHERE id = ?`, id);
    return { success: true };
  }
}
