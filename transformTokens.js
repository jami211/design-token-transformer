/**
 * Design Tokens Build Script
 *
 * Transformiert die dark-mode.json (mit primären Farben) in:
 * - light-mode.json (invertierte Semantic-Tokens)
 * - dark-mode.json (unverändert)
 * - Generiert SCSS und TypeScript Ausgaben
 * - Nutzt Custom Formatierungen für beide Dateien
 */

const StyleDictionary = require("style-dictionary");
const fs = require("fs");
const path = require("path");

// ============================================================================
// CONFIGURATION
// ============================================================================

const tokenSourcePath = "tokens/design-tokens.tokens.json";
const lightModeOutputPath = "design-tokens/tokens/light-mode.json";
const buildPath = "src/app/shared/tokens/";

const metaHeader = `/* 
 * Auto-generated Design Tokens
 * DO NOT EDIT MANUALLY
 * Generated at: ${new Date().toISOString()}
 */\n`;

// ============================================================================
// UTILITIES
// ============================================================================

function capitalize(value) {
  return value
    .split("-")
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join("");
}

function log(...args) {
  console.log("📦 [Design Tokens]", ...args);
}

// ============================================================================
// DARK TO LIGHT CONVERSION
// ============================================================================

/**
 * Konvertiert Dark-Mode Tokens in Light-Mode Tokens
 * Invertiert Farben in den semantischen Token-Werten
 */
function convertDarkToLight(darkModeData) {
  const lightMode = JSON.parse(JSON.stringify(darkModeData));

  // Invert color references in semantic tokens
  if (lightMode.semantic) {
    const invertColorMap = {
      // Neutrals
      "neutral.0": "neutral.200", // Weiß → Dunkelgrau
      "neutral.10": "neutral.190",
      "neutral.30": "neutral.180",
      "neutral.50": "neutral.170",
      "neutral.100": "neutral.160",
      "neutral.160": "neutral.100",
      "neutral.170": "neutral.50",
      "neutral.180": "neutral.30",
      "neutral.190": "neutral.10",
      "neutral.200": "neutral.0", // Dunkelgrau → Weiß

      // Blues
      "blue.40": "blue.80",
      "blue.60": "blue.60",
      "blue.80": "blue.40",

      // Pinks
      "pink.40": "pink.80",
      "pink.50": "pink.60",
      "pink.60": "pink.50",
      "pink.80": "pink.40",

      // Greens
      "green.40": "green.80",
      "green.60": "green.60",
      "green.80": "green.40",

      // Reds
      "red.40": "red.80",
      "red.60": "red.60",
      "red.80": "red.40",

      // Oranges
      "orange.40": "orange.80",
      "orange.60": "orange.60",
      "orange.80": "orange.40",

      // Yellows
      "yellow.40": "yellow.80",
      "yellow.60": "yellow.60",
      "yellow.80": "yellow.40",

      // Teals
      "teal.40": "teal.80",
      "teal.60": "teal.60",
      "teal.80": "teal.40",
    };

    const invertValues = (obj) => {
      Object.keys(obj).forEach((key) => {
        const value = obj[key];

        if (value && typeof value === "object") {
          if (value.type === "color" && value.value) {
            // Extract primitive reference
            const match = value.value.match(/\{primitive\.color\.([^}]+)\}/);
            if (match) {
              const colorRef = match[1];
              const inverted = invertColorMap[colorRef];
              if (inverted) {
                value.value = `{primitive.color.${inverted}}`;
                log(`✓ Inverted: ${colorRef} → ${inverted}`);
              }
            }
          } else {
            // Recursively process nested objects
            invertValues(value);
          }
        }
      });
    };

    invertValues(lightMode.semantic);
  }

  return lightMode;
}

// ============================================================================
// CUSTOM FORMATTERS
// ============================================================================

/**
 * Custom TypeScript Format
 * Exportiert Design Tokens als TypeScript Interfaces und Constants
 */
StyleDictionary.registerFormat({
  name: "custom/ts",
  formatter: ({ dictionary, options }) => {
    const cssVar = options?.varPrefix?.css
      ? `--${options.varPrefix.css}-`
      : "--";
    const scssVar = options?.varPrefix?.scss
      ? `$${options.varPrefix.scss}-`
      : "$";

    const tokens = dictionary.allTokens.reduce((obj, token) => {
      const category = token.attributes?.category;

      if (category !== options.categoryName.semantic) {
        return obj;
      }

      const group = token.attributes.type;
      const [, ...rest] = token.path;
      const nameList = capitalize(rest.join("-"));

      const css =
        category === options.categoryName.semantic
          ? `var(${cssVar}${rest.join("-")})`
          : undefined;

      return Object.assign({}, obj, {
        [category]: Object.assign({}, obj[category], {
          [group]: [
            ...(obj[category]?.[group] ? obj[category][group] : []),
            {
              name: nameList.slice(1).join(" "),
              fullName: nameList.join(" "),
              category,
              group,
              token: `${scssVar}${rest.join("-")}`,
              type: token.type,
              value: token.value,
              css,
            },
          ],
        }),
      });
    }, {});

    return `${metaHeader}
export interface DesignToken {
  name: string;
  fullName: string;
  category: string;
  group: string;
  token: string;
  type: string;
  value: string;
  css?: string;
}

export interface DesignTokens {
  [category: string]: {
    [group: string]: DesignToken[];
  };
}

export const designTokens: DesignTokens = ${JSON.stringify(tokens, null, 2)};

export default designTokens;
`;
  },
});

/**
 * Custom SCSS Format
 * Exportiert Design Tokens als SCSS Variablen und Mixins
 */
StyleDictionary.registerFormat({
  name: "custom/scss",
  formatter: ({ dictionary, options }) => {
    const tokens = dictionary.allTokens.reduce(
      (obj, t) =>
        Object.assign({}, obj, {
          [t.attributes.category]: Object.assign(
            {},
            obj[t.attributes.category],
            {
              [t.key]: t,
            }
          ),
        }),
      {}
    );

    const cssVar = options?.varPrefix?.css
      ? `--${options.varPrefix.css}-`
      : "--";
    const scssVar = options?.varPrefix?.scss
      ? `$${options.varPrefix.scss}-`
      : "$";

    // Generate CSS Variables for semantic tokens
    const cssVars = Object.values(
      tokens[options.categoryName.semantic] || {}
    ).map((v) => {
      const name = v.name.replace(`${options.categoryName.semantic}-`, cssVar);
      const value =
        tokens[options.categoryName.primitive]?.[v.original.value]?.value ||
        v.value;
      return `${name}: ${value};`;
    });

    // Generate SCSS Variables for semantic tokens
    const scssSemantic = Object.values(
      tokens[options.categoryName.semantic] || {}
    ).map((v) => {
      const name = v.name.replace(`${options.categoryName.semantic}-`, scssVar);
      const value = v.name.replace(`${options.categoryName.semantic}-`, cssVar);
      return `${name}: var(${value});`;
    });

    // Generate component composition tokens
    const scssComponent = Object.values(
      tokens[options.categoryName.component] || {}
    ).map((v) => {
      const name = v.name.replace(
        `${options.categoryName.component}-`,
        scssVar
      );
      const semantic =
        tokens.semantic?.[v.original.value]?.name || v.original.value;
      const value = semantic.replace(
        `${options.categoryName.semantic}-`,
        scssVar
      );
      return `${name}: ${value};`;
    });

    return `${metaHeader}

// CSS Custom Properties (für Browser-Support)
@mixin lightCssCustomProperties {
  ${cssVars.sort().join("\n  ")}
}

// Semantic Design Tokens - Themeable tokens
${scssSemantic.sort().join("\n")}

// Component Design Tokens - Component specific composition tokens
${scssComponent.sort().join("\n")}
`;
  },
});

/**
 * Custom CSS Format
 * Exportiert Design Tokens als CSS Variables
 */
StyleDictionary.registerFormat({
  name: "custom/css",
  formatter: ({ dictionary, options, file }) => {
    const tokens = dictionary.allTokens;
    const cssVar = options?.varPrefix?.css
      ? `--${options.varPrefix.css}-`
      : "--";

    let output = metaHeader;

    // Determine selector based on file name
    let selector = ":root";
    if (file.destination.includes("dark")) {
      selector = '[data-theme="dark"]';
    } else if (file.destination.includes("light")) {
      selector = ':root, [data-theme="light"]';
    }

    output += `\n${selector} {\n`;

    tokens.forEach((token) => {
      const name = `${cssVar}${token.path.join("-")}`;
      output += `  ${name}: ${token.value};\n`;
    });

    output += "}\n";

    return output;
  },
});

/**
 * JSON Format für weitere Token-Export
 */
StyleDictionary.registerFormat({
  name: "custom/json",
  formatter: ({ dictionary }) => {
    const output = dictionary.allTokens.reduce((obj, token) => {
      const keys = token.path;
      let current = obj;

      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key]) {
          current[key] = {};
        }
        current = current[key];
      }

      current[keys[keys.length - 1]] = {
        value: token.value,
        type: token.type,
        description: token.description,
      };

      return obj;
    }, {});

    return JSON.stringify(output, null, 2);
  },
});

// ============================================================================
// LOAD AND PROCESS TOKENS
// ============================================================================

log("📍 Loading tokens from:", tokenSourcePath);

// Lese Dark-Mode Tokens
const darkModeData = JSON.parse(fs.readFileSync(tokenSourcePath, "utf8"));
log("✓ Dark-Mode tokens loaded");

// Konvertiere zu Light-Mode
const lightModeData = convertDarkToLight(darkModeData);
log("✓ Light-Mode tokens generated");

// Speichere Light-Mode JSON
fs.mkdirSync(path.dirname(lightModeOutputPath), { recursive: true });
fs.writeFileSync(lightModeOutputPath, JSON.stringify(lightModeData, null, 2));
log("✓ Light-Mode tokens saved to:", lightModeOutputPath);

// ============================================================================
// BUILD CONFIGURATIONS
// ============================================================================

// Light Mode Build
const lightModeBuild = {
  source: [tokenSourcePath, lightModeOutputPath],
  platforms: {
    "css/light": {
      transformGroup: "css",
      buildPath,
      files: [
        {
          destination: "tokens-light.css",
          format: "custom/css",
          options: {
            varPrefix: { css: "semantic" },
          },
        },
      ],
    },
    "scss/light": {
      transformGroup: "css",
      buildPath,
      files: [
        {
          destination: "_tokens-light.scss",
          format: "custom/scss",
          options: {
            categoryName: {
              primitive: "primitive",
              semantic: "semantic",
              component: "component",
            },
            varPrefix: {
              css: "semantic",
              scss: "ui-light",
            },
          },
        },
      ],
    },
    "ts/light": {
      transformGroup: "js",
      buildPath,
      files: [
        {
          destination: "tokens-light.ts",
          format: "custom/ts",
          options: {
            categoryName: {
              primitive: "primitive",
              semantic: "semantic",
              component: "component",
            },
            varPrefix: {
              css: "semantic",
              scss: "ui-light",
            },
          },
        },
      ],
    },
  },
};

// Dark Mode Build
const darkModeBuild = {
  source: [tokenSourcePath],
  platforms: {
    "css/dark": {
      transformGroup: "css",
      buildPath,
      files: [
        {
          destination: "tokens-dark.css",
          format: "custom/css",
          options: {
            varPrefix: { css: "semantic" },
          },
        },
      ],
    },
    "scss/dark": {
      transformGroup: "css",
      buildPath,
      files: [
        {
          destination: "_tokens-dark.scss",
          format: "custom/scss",
          options: {
            categoryName: {
              primitive: "primitive",
              semantic: "semantic",
              component: "component",
            },
            varPrefix: {
              css: "semantic",
              scss: "ui-dark",
            },
          },
        },
      ],
    },
    "ts/dark": {
      transformGroup: "js",
      buildPath,
      files: [
        {
          destination: "tokens-dark.ts",
          format: "custom/ts",
          options: {
            categoryName: {
              primitive: "primitive",
              semantic: "semantic",
              component: "component",
            },
            varPrefix: {
              css: "semantic",
              scss: "ui-dark",
            },
          },
        },
      ],
    },
  },
};

// ============================================================================
// BUILD TOKENS
// ============================================================================

try {
  log("\n🔨 Building Light Mode tokens...");
  const sdLight = StyleDictionary.extend(lightModeBuild);
  sdLight.buildAllPlatforms();
  log("✓ Light Mode build completed");

  log("\n🔨 Building Dark Mode tokens...");
  const sdDark = StyleDictionary.extend(darkModeBuild);
  sdDark.buildAllPlatforms();
  log("✓ Dark Mode build completed");

  log("\n✅ All tokens successfully generated!");
  log("📁 Output path:", buildPath);
  log("\n Generated files:");
  log("  • tokens-light.css");
  log("  • tokens-dark.css");
  log("  • _tokens-light.scss");
  log("  • _tokens-dark.scss");
  log("  • tokens-light.ts");
  log("  • tokens-dark.ts");
  log("  • light-mode.json\n");

  process.exit(0);
} catch (error) {
  log("❌ Build failed:", error.message);
  console.error(error);
  process.exit(1);
}
