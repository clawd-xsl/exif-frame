import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../types";
import { queryOne, run } from "../utils/db";
import { hashPassword } from "../utils/password";
import { signJWT } from "../utils/jwt";

export class AuthRegister extends OpenAPIRoute {
  schema = {
    tags: ["Auth"],
    summary: "Register new member",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              email: Str(),
              password: z.string().min(8),
              nickname: Str(),
            }),
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
      "409": {
        description: "Email already registered",
        content: { "application/json": { schema: z.object({ success: Bool(), error: Str() }) } },
      },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    let { email, password, nickname } = data.body;
    email = email.trim().toLowerCase();
    const existing = await queryOne<{ id: number }>(c.env.DB, `SELECT id FROM members WHERE email = ?`, email);
    if (existing) return c.json({ success: false, error: "Email already registered" }, 409);
    const password_hash = await hashPassword(password);
    const created_at = Date.now();
    const id = await run(
      c.env.DB,
      `INSERT INTO members (email, password_hash, nickname, created_at) VALUES (?, ?, ?, ?);`,
      email,
      password_hash,
      nickname,
      created_at
    );
    const token = await signJWT({ sub: id.toString(), email, nickname }, c.env.JWT_SECRET);
    return {
      success: true,
      token,
      member: { id, email, nickname, createdAt: created_at },
    };
  }
}
