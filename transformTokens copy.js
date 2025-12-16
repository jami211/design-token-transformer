const StyleDictionary = require("style-dictionary");
const deepMerge = require("deepmerge");
const webConfig = require("./src/web/index.js");

StyleDictionary.registerTransform({
  name: "size/px",
  type: "value",
  matcher: (token) => {
    return (
      (token.unit === "pixel" || token.type === "dimension") &&
      token.value !== 0
    );
  },
  transformer: (token) => {
    return `${token.value}px`;
  },
});

StyleDictionary.registerTransform({
  name: "size/percent",
  type: "value",
  matcher: (token) => {
    return token.unit === "percent" && token.value !== 0;
  },
  transformer: (token) => {
    return `${token.value}%`;
  },
});

StyleDictionary.registerFilter({
  name: "validToken",
  matcher: function (token) {
    return [
      "string",
      "number",
      "color",
      "custom-spacing",
      "custom-fontStyle",
      "custom-radius",
    ].includes(token.type);
  },
});

const StyleDictionaryExtended = StyleDictionary.extend({
  ...deepMerge.all(webConfig),
  source: ["tokens/*.json"],
  platforms: {
    scss: {
      transformGroup: "custom/css",
      buildPath: "build/scss/",
      files: [
        {
          destination: "_variables.scss",
          format: "scss/variables",
          filter: "validToken",
        },
      ],
    },
    less: {
      transformGroup: "custom/css",
      buildPath: "build/less/",
      files: [
        {
          destination: "_variables.less",
          format: "less/variables",
          filter: "validToken",
        },
      ],
    },
    css: {
      transformGroup: "custom/css",
      buildPath: "build/css/",
      files: [
        {
          destination: "_variables.css",
          format: "css/variables",
          filter: "validToken",
          options: {
            showFileHeader: false,
          },
        },
      ],
    },
  },
});
console.log("StyleDictionaryExtended", StyleDictionaryExtended);

StyleDictionaryExtended.buildAllPlatforms();
