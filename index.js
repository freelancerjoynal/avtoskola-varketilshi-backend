require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
const app = express();

// middleware
app.use(cors());
app.use(express.json());

const uri = process.env.DATABASE_URL;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
console.log(uri);

async function run() {
  try {
    const questionCollection = client
      .db("traffic-master")
      .collection("questions");

    //question API
    app.get("/questions/all-questions", async (req, res) => {
      try {
        const topics = req.query.topics;

        t;
        let filter = {};

        if (topics) {
          const topicsArray = topics.split(",");
          filter = { topics: { $in: topicsArray } };
        }

        const result = await questionCollection.find(filter).toArray();

        res.json(result);
      } catch (error) {
        console.error("Error fetching questions:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.post("/questions/add-question", async (req, res) => {
      const newQuestion = req.body;
      const result = await questionCollection.insertOne(newQuestion);
      console.log("hitting the post", result);
      res.json(result);
    
    });
  } finally {
  }
}
run().catch(console.log);

app.get("/", async (req, res) => {
  res.send("Traffic Master API");
});

app.listen(port, () => console.log(`Traffic Master running on ${port}`));
