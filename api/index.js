import app from "../backend/src/server.js";

export default function handler(req, res) {
  const { path = "", ...query } = req.query;
  const apiPath = Array.isArray(path) ? path.join("/") : path;
  const searchParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => searchParams.append(key, item));
    } else if (value !== undefined) {
      searchParams.set(key, value);
    }
  });

  const search = searchParams.toString();
  req.url = `/api/${apiPath}${search ? `?${search}` : ""}`;

  return app(req, res);
}
