// "/" is redirected to "/dashboard" by the basePath-aware redirects() rule in
// next.config.js. This re-export is a fallback so the entry never blanks even if
// that rule is disabled (e.g. static export).
export { default } from "./dashboard/page"
