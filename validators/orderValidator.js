export function validateGuestOrder(body) {
  const errors = [];
  const customer = body.customer;

  if (!customer || typeof customer !== "object") {
    return ["customer details are required"];
  }

  for (const field of ["name", "phone", "address", "city"]) {
    if (typeof customer[field] !== "string" || !customer[field].trim()) {
      errors.push(`customer.${field} is required`);
    }
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    errors.push("items must be a non-empty array");
  } else {
    for (const [index, item] of body.items.entries()) {
      if (!item.productId || typeof item.productId !== "string") {
        errors.push(`items[${index}].productId is required`);
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        errors.push(`items[${index}].quantity must be a positive integer`);
      }
    }
  }

  return errors;
}
