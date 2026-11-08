/**
 * A deliberately small template engine — enough for the catalogue templates,
 * small enough to read in one sitting.
 *
 *   {{name}}            escaped value
 *   {{{html}}}          raw value, already HTML
 *   {{#if key}}…{{/if}} shown when the value is truthy
 *   {{#unless key}}…{{/unless}}
 *
 * Conditionals may be nested; the innermost block is resolved first.
 */
const IF_BLOCK = /\{\{#(if|unless)\s+([\w.]+)\}\}((?:(?!\{\{#(?:if|unless)\s)[\s\S])*?)\{\{\/\1\}\}/;

export function render(template, data) {
  let output = template;

  // Resolve conditionals from the inside out.
  for (let guard = 0; guard < 100; guard += 1) {
    const match = IF_BLOCK.exec(output);
    if (!match) break;
    const [full, kind, key, body] = match;
    const truthy = Boolean(lookup(data, key));
    const keep = kind === "if" ? truthy : !truthy;
    output = output.replace(full, keep ? body : "");
  }

  output = output.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_, key) => String(lookup(data, key) ?? ""));
  output = output.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => escapeHtml(String(lookup(data, key) ?? "")));
  return output;
}

/** Substitution without HTML escaping — for short plain strings like footers. */
export function renderPlain(template, data) {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => String(lookup(data, key) ?? ""));
}

function lookup(data, path) {
  return path.split(".").reduce((value, key) => (value == null ? undefined : value[key]), data);
}

export function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
