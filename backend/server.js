const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const app = express();

connectDB();
const authRoutes = require("./routes/auth.routes");
const documentRoutes = require("./routes/document.routes");
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.get("/", (req, res) => {
  res.json({
    message: "Personal File Intelligence API is running"
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});