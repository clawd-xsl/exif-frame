import { Bool, Num, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../types";
import { queryOne, run } from "../utils/db";
import { verifyJWT } from "../utils/jwt";

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function getJpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  // Minimal JPEG SOF parser
  let i = 2; // skip SOI (FFD8)
  const len = bytes.length;
  while (i < len - 9) {
    // find marker
    while (i < len && bytes[i] !== 0xff) i++;
    // skip fill bytes
    while (i < len && bytes[i] === 0xff) i++;
    if (i >= len) break;
    const marker = bytes[i++];
    // Standalone markers without length
    if (marker === 0xD9 /* EOI */ || marker === 0xDA /* SOS */) {
      // We may not find SOF after SOS reliably
      break;
    }
    if (i + 1 >= len) break;
    const segLen = (bytes[i] << 8) + bytes[i + 1];
    i += 2;
    if (segLen < 2 || i + segLen - 2 > len) break;
    if (
      marker === 0xC0 || // SOF0 baseline
      marker === 0xC1 || // SOF1
      marker === 0xC2 // SOF2 progressive
    ) {
      if (segLen < 7) return null;
      const p = i; // segment start
      const precision = bytes[p];
      const height = (bytes[p + 1] << 8) + bytes[p + 2];
      const width = (bytes[p + 3] << 8) + bytes[p + 4];
      if (precision !== 8 && precision !== 12 && precision !== 16) {
        // uncommon, but still accept
      }
      return { width, height };
    }
    i += segLen - 2; // skip segment payload
  }
  return null;
}

export class ThemePreviewUpload extends OpenAPIRoute {
  schema = {
    tags: ["Themes"],
    summary: "Upload preview image for a theme (JPEG, <=2MB, max 4096px)",
    request: {
      params: z.object({ id: Num() }),
    },
    responses: {
      "200": { description: "Uploaded", content: { "application/json": { schema: z.object({ success: Bool(), url: z.string() }) } } },
      "400": { description: "Bad Request" },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden" },
      "404": { description: "Theme Not Found" },
    },
  };

  async handle(c: AppContext) {
    // Auth
    const auth = c.req.header('authorization');
    if (!auth || !auth.toLowerCase().startsWith('bearer ')) return new Response("Unauthorized", { status: 401 });
    const token = auth.split(' ')[1] || '';
    let payload: any;
    try { payload = await verifyJWT(token, c.env.JWT_SECRET); } catch { return new Response("Unauthorized", { status: 401 }); }
    const userId = Number(payload.sub);

    const data = await this.getValidatedData<typeof this.schema>();
    const id = data.params.id;

    // Ownership check
    const theme = await queryOne<{ ownerMemberId: number }>(
      c.env.DB,
      `SELECT owner_member_id as ownerMemberId FROM themes WHERE id = ?`,
      id
    );
    if (!theme) return new Response("Not Found", { status: 404 });
    if (theme.ownerMemberId !== userId) return c.json({ success: false, error: 'Forbidden' }, 403);

    // Validate content-type
    const contentType = (c.req.header('content-type') || '').toLowerCase();
    if (!(contentType === 'image/jpeg' || contentType === 'image/jpg' || contentType.startsWith('image/jpeg'))) {
      return c.json({ success: false, error: 'Only image/jpeg accepted' }, 400);
    }

    // Read body and enforce size
    const maxBytes = 2_000_000; // 2MB
    const buf = new Uint8Array(await c.req.arrayBuffer());
    if (buf.byteLength === 0) return c.json({ success: false, error: 'Empty body' }, 400);
    if (buf.byteLength > maxBytes) return c.json({ success: false, error: 'Image too large (max 2MB)' }, 413);

    // JPEG magic and dimension checks
    if (!isJpeg(buf)) return c.json({ success: false, error: 'Invalid JPEG' }, 400);
    const dims = getJpegDimensions(buf);
    if (!dims) return c.json({ success: false, error: 'Cannot read JPEG dimensions' }, 400);
    const { width, height } = dims;
    const maxDim = 4096;
    if (width <= 0 || height <= 0) return c.json({ success: false, error: 'Invalid image size' }, 400);
    if (width > maxDim || height > maxDim) return c.json({ success: false, error: 'Image dimensions too large (max 4096px)' }, 400);

    // Store in R2
    const key = `themes/${id}/preview.jpg`;
    await c.env.R2.put(key, buf, { httpMetadata: { contentType: 'image/jpeg' } });

    // Update DB with public URL
    const url = `https://r2.exif-frame.yuru.cam/${key}`;
    await run(c.env.DB, `UPDATE themes SET preview_image_url = ?, updated_at = ? WHERE id = ?`, url, Date.now(), id);

    return { success: true, url };
  }
}
