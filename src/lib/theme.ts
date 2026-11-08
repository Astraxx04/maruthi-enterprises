export const THEME_STORAGE_KEY = "maruthi-theme";

/**
 * Runs inline in <head> before first paint so a saved dark preference does
 * not flash light. Light is the default; only an explicit "dark" switches.
 * Kept out of the "use client" toggle module: values exported from a client
 * module reach server components as references, not strings.
 */
export const themeInitScript = `try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;
