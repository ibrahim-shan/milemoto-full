import http from "k6/http";
import { check, sleep } from "k6";

http.setResponseCallback(http.expectedStatuses(200, 400, 404));

export const options = {
  stages: [
    { duration: "30s", target: 20 },
    { duration: "1m30s", target: 80 },
    { duration: "1m30s", target: 80 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500", "p(99)<900"],
  },
};

export function setup() {
  const baseUrl = __ENV.BASE_URL || "http://localhost:4000";
  const email = __ENV.ADMIN_EMAIL || "admin@gmail.com";
  const password = __ENV.ADMIN_PASSWORD || "12345678";

  const loginRes = http.post(
    `${baseUrl}/api/v1/auth/login`,
    JSON.stringify({ email, password, remember: false }),
    { headers: { "Content-Type": "application/json" } }
  );

  check(loginRes, { "login status 200": (r) => r.status === 200 });
  const token = loginRes.json("accessToken");

  const listRes = http.get(
    `${baseUrl}/api/v1/admin/purchase-orders?page=1&limit=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  check(listRes, { "purchase orders list 200": (r) => r.status === 200 });
  const items = listRes.json("items") || listRes.json() || [];
  const ids = Array.isArray(items)
    ? items.map((po) => po.id).filter(Boolean)
    : [];

  return { baseUrl, token, ids };
}

export default function (data) {
  const { baseUrl, token } = data;
  const ids = data.ids || [];
  const validRatio = Number(__ENV.VALID_RATIO) || 0.8;
  const useValid = Math.random() < validRatio && ids.length > 0;
  const id = useValid
    ? ids[Math.floor(Math.random() * ids.length)]
    : Number(__ENV.INVALID_ID) || 999999999;

  const res = http.get(`${baseUrl}/api/v1/admin/purchase-orders/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (useValid) {
    check(res, { "purchase order detail 200": (r) => r.status === 200 });
  } else {
    check(res, {
      "purchase order detail 4xx": (r) =>
        r.status === 404 || r.status === 400,
    });
  }

  sleep(1);
}
