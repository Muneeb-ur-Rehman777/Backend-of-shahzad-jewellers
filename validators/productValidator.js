export function validateProductInput(body, { partial = false } = {}) {
  const errors = [];
  const required = ["name", "price", "stock"];

  if (!partial) {
    for (const key of required) {
      if (body[key] === undefined || body[key] === null || body[key] === "") {
        errors.push(`${key} is required`);
      }
    }
  }

  if (body.name !== undefined && (typeof body.name !== "string" || !body.name.trim())) {
    errors.push("name must be a non-empty string");
  }
  if (body.price !== undefined && (!Number.isFinite(body.price) || body.price < 0)) {
    errors.push("price must be a non-negative number");
  }
  if (body.stock !== undefined && (!Number.isInteger(body.stock) || body.stock < 0)) {
    errors.push("stock must be a non-negative integer");
  }
  if (body.type !== undefined && !["gold", "diamond", "other"].includes(body.type)) {
    errors.push("type must be gold, diamond, or other");
  }
  if (body.images !== undefined && (!Array.isArray(body.images) || !body.images.every(v => typeof v === "string"))) {
    errors.push("images must be an array of strings");
  }
  if (body.featured !== undefined && typeof body.featured !== "boolean") {
    errors.push("featured must be a boolean");
  }
  if (body.isActive !== undefined && typeof body.isActive !== "boolean") {
    errors.push("isActive must be a boolean");
  }

  return errors;
}
