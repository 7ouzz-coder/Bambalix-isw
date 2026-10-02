const apiUrl = process.env.NEXT_PUBLIC_API_URL;
if (!apiUrl || !URL.canParse(apiUrl) || !["http:", "https:"].includes(new URL(apiUrl).protocol)) {
  throw new Error("Revisa NEXT_PUBLIC_API_URL en frontend/.env: debe ser una URL http o https.");
}

export default { poweredByHeader: false };
