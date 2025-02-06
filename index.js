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
const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
});

//console.log(uri);

// JWT Secret Key
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware to verify JWT token and check if user is admin
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: Access denied" });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

async function generateHash() {
  const password = "admin05+";
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log("Hashed password:", hashedPassword);
}

generateHash();

async function run() {
  try {
    const questionCollection = client.db("traffic-master").collection("questions");
    const adminCollection = client.db("traffic-master").collection("admins");

    // Admin Login
    app.post("/admin/login", async (req, res) => {
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
    });

    // Create a new admin (Admin only)
    app.post("/admin/create", verifyAdmin, async (req, res) => {
      try {
        const { username, password,role } = req.body;
        const existingAdmin = await adminCollection.findOne({ username });
        if (existingAdmin) {
          return res.status(400).json({ error: "Admin already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = { username, password: hashedPassword, role };
        const result = await adminCollection.insertOne(newAdmin);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to create admin" });
      }
    });

    // Get all admins (Admin only)
    app.get("/admin/all", verifyAdmin, async (req, res) => {
      try {
        const admins = await adminCollection.find().toArray();
        res.json(admins);
      } catch (error) {
        res.status(500).json({ error: "Failed to retrieve admins" });
      }
    });

    // Delete an admin (Admin only)
    app.delete("/admin/delete/:id", verifyAdmin, async (req, res) => {
      try {
        const id = req.params.id;
        const result = await adminCollection.deleteOne({ _id: new ObjectId(id) });
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to delete admin" });
      }
    });

    // Add a new question (Admin only)
    app.post("/questions/add-question", verifyAdmin, async (req, res) => {
      try {
        const newQuestion = req.body;
        const result = await questionCollection.insertOne(newQuestion);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to add question" });
      }
    });

    // Edit a question (Admin only)
    app.put("/questions/edit-question/:id", verifyAdmin, async (req, res) => {
      try {
        const id = req.params.id;
        const updatedQuestion = req.body;
        const result = await questionCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedQuestion }
        );
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to update question" });
      }
    });

    // Delete a question (Admin only)
    app.delete("/questions/delete-question/:id", verifyAdmin, async (req, res) => {
      try {
        const id = req.params.id;
        const result = await questionCollection.deleteOne({ _id: new ObjectId(id) });
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to delete question" });
      }
    });

    // Get all questions (Public)
    app.get("/questions/all-questions", async (req, res) => {
      try {
        const topics = req.query.topics;
        let filter = {};

        if (topics) {
          const topicsArray = topics.split(",");
          filter = { topics: { $in: topicsArray } };
        }

        const result = await questionCollection.find(filter).toArray();
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // Root route
    app.get("/", async (req, res) => {
      res.send("Traffic Master API");
    });

    app.listen(port, () => console.log(`Traffic Master running on ${port}`));
  } catch (error) {
    console.error("Error in running MongoDB operations:", error);
  }
}

run().catch(console.log);
