import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: Number(__ENV.VUS) || 10,
  duration: __ENV.DURATION || "30s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<300"],
  },
};

export default function () {
  const baseUrl = __ENV.BASE_URL || "http://localhost:4000";
  const res = http.get(`${baseUrl}/api/v1/health`);

  check(res, {
    "health status 200": (r) => r.status === 200,
  });

  sleep(1);
}
