import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // ปิด parallel build workers — เครื่อง Windows นี้เจอ "Jest worker encountered N
  // child process exceptions" ซ้ำๆ ตอน dev (child process ของ webpack ถูกฆ่ากลางทาง
  // น่าจะโดน antivirus/OS แทรก) รันบน thread เดียวแทนเพื่อความเสถียร
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
};

export default nextConfig;
