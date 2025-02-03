export default function normalizeUrl(url) {
  const parsedUrl = new URL(url);
  parsedUrl.hash = "";
  return parsedUrl.href.replace(/\/+$/, "");
}
