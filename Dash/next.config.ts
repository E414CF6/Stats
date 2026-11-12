import type {NextConfig} from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{
      protocol: "https", hostname: "mc-heads.net",
    }, {
      protocol: "https", hostname: "minotar.net",
    },],
  },
};

export default nextConfig;
