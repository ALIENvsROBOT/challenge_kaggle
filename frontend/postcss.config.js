/** 
 * PostCSS Configuration
 * 
 * Configures the CSS processing pipeline.
 * - tailwindcss: Compiles Tailwind utility classes.
 * - autoprefixer: Adds vendor prefixes for browser compatibility.
 * 
 * @type {import('postcss-load-config').Config} 
 */
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
