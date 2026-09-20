import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rolldownOptions: {
      input: { index: "index.html", sameN: "same-n.html" },
    },
  },
});
