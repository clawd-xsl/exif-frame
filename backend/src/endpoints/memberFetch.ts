import { Bool, Num, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../types";
import { queryOne } from "../utils/db";

export class MemberFetch extends OpenAPIRoute {
  schema = {
    tags: ["Members"],
    summary: "Get member public profile",
    request: {
      params: z.object({ id: Num() }),
    },
    responses: {
      "200": {
        description: "Returns member public info",
        content: {
          "application/json": {
            schema: z.object({ success: Bool(), member: z.object({ id: z.number(), nickname: z.string() }) }),
          },
        },
      },
      "404": { description: "Not found" },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const id = data.params.id;
    const row = await queryOne<{ id: number; nickname: string }>(c.env.DB, `SELECT id, nickname FROM members WHERE id = ?`, id);
    if (!row) return new Response("Not Found", { status: 404 });
    return { success: true, member: row };
  }
}
