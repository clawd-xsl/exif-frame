import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../types";
import { queryOne } from "../utils/db";
import { verifyPassword } from "../utils/password";
import { signJWT } from "../utils/jwt";

export class AuthLogin extends OpenAPIRoute {
  schema = {
    tags: ["Auth"],
    summary: "Login and get JWT",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({ email: Str(), password: Str() }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Returns token and member info",
        content: {
          "application/json": {
            schema: z.object({
              success: Bool(),
              token: Str(),
              member: z.object({ id: z.number(), email: Str(), nickname: Str(), createdAt: z.number() }),
            }),
          },
        },
      },
      "401": {
        description: "Invalid credentials",
        content: { "application/json": { schema: z.object({ success: Bool(), error: Str() }) } },
      },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const { email, password } = data.body;
    const row = await queryOne<{ id: number; email: string; password_hash: string; nickname: string; created_at: number }>(
      c.env.DB,
      `SELECT id, email, password_hash, nickname, created_at FROM members WHERE email = ?`,
      email
    );
    if (!row) return c.json({ success: false, error: "Invalid credentials" }, 401);
    const ok = await verifyPassword(password, row.password_hash);
    if (!ok) return c.json({ success: false, error: "Invalid credentials" }, 401);
    const token = await signJWT({ sub: row.id.toString(), email: row.email, nickname: row.nickname }, c.env.JWT_SECRET);
    return {
      success: true,
      token,
      member: { id: row.id, email: row.email, nickname: row.nickname, createdAt: row.created_at },
    };
  }
}
