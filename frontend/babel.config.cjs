module.exports = {
  presets: [
    // Transpile modern JS to current Node (what Jest runs)
    ["@babel/preset-env", { targets: { node: "current" } }],
    // Transpile JSX, use React 17+ automatic runtime (no import React needed)
    ["@babel/preset-react", { runtime: "automatic" }],
  ],
  plugins: [
    // Replace `import.meta.env.VITE_API_BASE_URL` (and any import.meta.env.*) with
    // string literals so Jest (CJS/Node) doesn't crash on the syntax.
    // This is a minimal inline Babel plugin — no extra package needed.
    function replaceImportMeta({ types: t }) {
      return {
        visitor: {
          // Handles: import.meta.env.FOO  →  "value"
          // Handles: import.meta.env      →  { FOO: "value", ... }
          MemberExpression(path) {
            // Match import.meta.env.*
            if (
              path.get("object").isMemberExpression() &&
              path.get("object.object").isMetaProperty() &&
              path.get("object.object.meta").isIdentifier({ name: "import" }) &&
              path.get("object.object.property").isIdentifier({ name: "meta" }) &&
              path.get("object.property").isIdentifier({ name: "env" })
            ) {
              const envKey = path.node.property.name || path.node.property.value;
              const envValues = { VITE_API_BASE_URL: "/api" };
              const value = envKey in envValues ? envValues[envKey] : undefined;
              path.replaceWith(
                value !== undefined
                  ? t.stringLiteral(value)
                  : t.identifier("undefined")
              );
              return;
            }

            // Match import.meta.env (the whole env object)
            if (
              path.get("object").isMetaProperty() &&
              path.get("object.meta").isIdentifier({ name: "import" }) &&
              path.get("object.property").isIdentifier({ name: "meta" }) &&
              path.get("property").isIdentifier({ name: "env" })
            ) {
              path.replaceWith(
                t.objectExpression([
                  t.objectProperty(
                    t.identifier("VITE_API_BASE_URL"),
                    t.stringLiteral("/api")
                  ),
                ])
              );
            }
          },
          // Handles: import.meta  →  {}  (as a safety fallback)
          MetaProperty(path) {
            if (
              path.node.meta.name === "import" &&
              path.node.property.name === "meta"
            ) {
              path.replaceWith(t.objectExpression([]));
            }
          },
        },
      };
    },
  ],
};
