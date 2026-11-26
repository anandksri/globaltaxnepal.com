import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Global Tax Nepal Admin",
    short_name: "GTN Admin",
    description: "Global Tax Nepal administration dashboard.",
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1c4d72",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
