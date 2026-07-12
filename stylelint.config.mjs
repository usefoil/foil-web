export default {
  extends: ["stylelint-config-standard"],
  ignoreFiles: ["dist/**", "marketing/**"],
  rules: {
    "alpha-value-notation": "percentage",
    "color-function-notation": "modern",
    "custom-property-empty-line-before": null,
    "declaration-empty-line-before": null,
    "media-feature-range-notation": "prefix",
    "no-descending-specificity": null,
  },
};
