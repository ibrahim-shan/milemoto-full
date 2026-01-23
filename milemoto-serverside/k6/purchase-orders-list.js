import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 5 },
    { duration: "1m", target: 20 },
    { duration: "2m", target: 40 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500", "p(99)<900"],
  },
};

function login(baseUrl) {
  const email = __ENV.ADMIN_EMAIL || "admin@gmail.com";
  const password = __ENV.ADMIN_PASSWORD || "12345678";

  const res = http.post(
    `${baseUrl}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { "Content-Type": "application/json" } }
  );

  check(res, { "login status 200": (r) => r.status === 200 });

  const token = res.json("accessToken");
  if (!token) {
    throw new Error("Missing accessToken from login response");
  }

  return token;
}

export function setup() {
  const baseUrl = __ENV.BASE_URL || "http://localhost:4000";
  const token = login(baseUrl);
  return { baseUrl, token };
}

export default function (data) {
  const baseUrl = data.baseUrl;
  const token = data.token;
  const page = __ENV.PAGE || "1";
  const limit = __ENV.LIMIT || "25";

  const res = http.get(
    `${baseUrl}/api/v1/admin/purchase-orders?page=${page}&limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  check(res, { "purchase orders list 200": (r) => r.status === 200 });

  sleep(1);
}
