require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const port = process.env.PORT || 5000;
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const uri = process.env.DATABASE_URL;
if (!uri) {
  console.error("DATABASE_URL environment variable is missing.");
  process.exit(1);
}

const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
});

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const questionCollection = client.db("traffic-master").collection("questions");
    const adminCollection = client.db("traffic-master").collection("admins");

    // Routes
    app.post("/admin/login", async (req, res) => {
      try {
        const { username, password } = req.body;
        const admin = await adminCollection.findOne({ username });
        if (!admin) {
          return res.status(404).json({ error: "Admin not found" });
        }
        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
          return res.status(401).json({ error: "Invalid password" });
        }
        const token = jwt.sign({ username: admin.username, role: "admin" }, JWT_SECRET, {
          expiresIn: "1h",
        });
        res.json({ token });
      } catch (error) {
        console.error("Error in /admin/login:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // Add other routes here...

    app.listen(port, () => console.log(`Server running on port ${port}`));
  } catch (error) {
    console.error("Error in run function:", error);
  }
}

run().catch(console.error);