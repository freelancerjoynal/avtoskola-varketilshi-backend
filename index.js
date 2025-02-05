require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const uri = process.env.DATABASE_URL;

if (!uri) {
  console.error("❌ DATABASE_URL is not set!");
  process.exit(1);
}

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect(); // ✅ Ensure connection to MongoDB

    const questionCollection = client.db("traffic-master").collection("questions");

    // 🔍 Get All Questions API
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
        console.error("❌ Error fetching questions:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // 📝 Add Question API
    app.post("/questions/add-question", async (req, res) => {
      try {
        const newQuestion = req.body;
        const result = await questionCollection.insertOne(newQuestion);
        res.json(result);
      } catch (error) {
        console.error("❌ Error adding question:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

  } catch (error) {
    console.error("❌ Database connection error:", error);
  }
}
run().catch(console.error);

// ✅ Root Route
app.get("/", (req, res) => {
  res.send("Traffic Master API");
});

// ✅ Export app for Vercel (Do NOT use app.listen())
module.exports = app;
