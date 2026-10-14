import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import "dotenv/config";
import { createServer } from "node:http";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { initSocket } from "./socket.js";
import Product from "./models/Product.js"; // <-- Yeh import add karein

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();

  // Purane conflicting indexes ko drop karne ke liye taake CastError khatam ho jaye
  try {
    await Product.collection.dropIndexes();
    console.log("Old product indexes dropped successfully");
  } catch (err) {
    console.log("No indexes to drop or already cleared");
  }

  const httpServer = createServer(app);
  initSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`Shahzad Jewellers API running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Server startup failed:", error);
  process.exit(1);
});