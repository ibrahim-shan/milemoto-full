import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: Number(__ENV.VUS) || 10,
  duration: __ENV.DURATION || "30s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
  },
};

export default function () {
  const baseUrl = __ENV.BASE_URL || "http://localhost:4000";
  const email = __ENV.AUTH_EMAIL;
  const password = __ENV.AUTH_PASSWORD;

  if (!email || !password) {
    throw new Error("Set AUTH_EMAIL and AUTH_PASSWORD for the login test.");
  }

  const loginRes = http.post(
    `${baseUrl}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { "Content-Type": "application/json" } }
  );

  const loginOk = check(loginRes, {
    "login status 200": (r) => r.status === 200,
  });

  if (!loginOk) {
    console.error(
      `login failed: status=${loginRes.status} body=${loginRes.body || ""}`
    );
    sleep(1);
    return;
  }

  const refreshRes = http.post(`${baseUrl}/api/v1/auth/refresh`, null, {
    headers: { "Content-Type": "application/json" },
  });

  check(refreshRes, {
    "refresh status 200": (r) => r.status === 200,
  });

  sleep(1);
}
