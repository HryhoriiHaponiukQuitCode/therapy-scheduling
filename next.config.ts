import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Кеш навігації в браузері (docs/decisions/0002-router-cache.md): повернення на динамічну сторінку протягом 30 с
  // не йде на сервер і в базу. Власні дії (вхід, вихід, Hold, Confirm, створення клієнта) викликають revalidatePath,
  // який очищає цей кеш; чужі зміни видно щонайбільше через 30 с, а остаточну перевірку робить база.
  experimental: {
    staleTimes: {
      dynamic: 30,
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
