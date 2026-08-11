import { defineConfig } from "eslint/config";
import next from "eslint-config-next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([{
    extends: [...next],
    rules: {
        // TODO(Phase 2): migrate remote dish/QR images to `next/image`
        // together with the Supabase Storage move. Until then plain <img>
        // stays (the canvas upload preview is a data-URL, which next/image
        // cannot serve).
        "@next/next/no-img-element": "off",
    },
}]);
