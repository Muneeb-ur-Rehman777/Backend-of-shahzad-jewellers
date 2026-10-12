export function errorHandler(error, _req, res, _next) {
  console.error(error);

  if (error.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }
  if (error.name === "CastError") {
    return res.status(400).json({ message: "Invalid ID format" });
  }
  if (error.code === 11000) {
    return res.status(409).json({ message: "A record with this value already exists" });
  }

  const status = error.statusCode || 500;
  res.status(status).json({
    message: status === 500 ? "Internal server error" : error.message,
  });
}
