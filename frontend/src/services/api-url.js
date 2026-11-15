const configuredUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const url = configuredUrl.replace(/\/+$/, "");
export const apiBase = url.endsWith("/api/v1") ? url : url.endsWith("/api") ? `${url}/v1` : `${url}/api/v1`;
