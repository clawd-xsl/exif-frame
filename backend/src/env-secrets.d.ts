declare namespace Cloudflare {
  interface Env {
    // Declared here for type-safety when using Wrangler Secrets
    JWT_SECRET: string;
  }
}

