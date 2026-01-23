import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: Number(__ENV.WARMUP_VUS) || 10 },
    { duration: "2m", target: Number(__ENV.STEADY_VUS) || 50 },
    { duration: "30s", target: Number(__ENV.PEAK_VUS) || 80 },
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
  return { baseUrl, token };
}

export default function (data) {
  const baseUrl = data.baseUrl;
  const token = data.token;

  const page = Number(__ENV.PAGE) || 1;
  const limit = Number(__ENV.LIMIT) || 25;

  const res = http.get(
    `${baseUrl}/api/v1/admin/products?page=${page}&limit=${limit}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  check(res, { "products list 200": (r) => r.status === 200 });

  sleep(1);
}
