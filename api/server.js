const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

dotenv.config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.static("public", { extensions: ["html", "js", "jsx"] }));



//CORS Configuration
// const allowedOrigins = [  
 
//   "https://exam.avtoskola-varketilshi.ge",  
// ];

// const corsOptions = {
//   origin: function (origin, callback) {
//     if (allowedOrigins.includes(origin) || !origin) {
//       callback(null, true);
//     } else {
//       callback(new Error("Not allowed by CORS"));
//     }
//   },
//   credentials: true, // Allow credentials (cookies, authorization headers)
//   optionsSuccessStatus: 200, // Some legacy browsers choke on 204
// };

app.use(cors());
app.use(express.json()); // Parse JSON requests


//mongodb connection
const uri = process.env.DATABASE_URL;
console.log(uri);
if (!uri) {
  console.error("DATABASE_URL environment variable is missing.");
  process.exit(1);
}

const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
});
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
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

// Root route (Fix for 404 error)
app.get("/", (req, res) => {
  res.send("Traffic Master Backend is running...");
});

// Start server
async function run() {
  try {
    const questionCollection = client.db("traffic-master").collection("questions");
    const adminCollection = client.db("traffic-master").collection("admins");
    const topicsCollection = client.db("traffic-master").collection("topics");
    const vehiclesCollection = client.db("traffic-master").collection("vehicles");


    

   // Admin Routes
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

app.post("/admin/create",  async (req, res) => {
  try {
    const { username, password, role } = req.body;
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

app.get("/admin/all", verifyAdmin, async (req, res) => {
  try {
    const admins = await adminCollection.find().toArray();
    res.json(admins);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve admins" });
  }
});

app.delete("/admin/delete/:id", verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const result = await adminCollection.deleteOne({ _id: new ObjectId(id) });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to delete admin" });
  }
});

app.put("/admin/update-password", verifyAdmin, async (req, res) => {
  try {
    const { username, oldPassword, newPassword } = req.body;
    const admin = await adminCollection.findOne({ username });
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }
    const isPasswordValid = await bcrypt.compare(oldPassword, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Incorrect old password" });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await adminCollection.updateOne(
      { username },
      { $set: { password: hashedPassword } }
    );
    if (result.modifiedCount === 1) {
      res.json({ message: "Password updated successfully" });
    } else {
      res.status(500).json({ error: "Failed to update password" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to update password" });
  }
});

app.post("/admin/forgot-password", async (req, res) => {
  try {
    const { username, newPassword } = req.body;
    const admin = await adminCollection.findOne({ username });
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await adminCollection.updateOne(
      { username },
      { $set: { password: hashedPassword } }
    );
    res.json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to reset password" });
  }
});

// Vehicle Routes
app.post("/vehicles/create", verifyAdmin, async (req, res) => {
  try {
    const { vehicle,imageUrl } = req.body;
    const existingVehicle = await vehiclesCollection.findOne({ vehicle });
    if (existingVehicle) {
      return res.status(400).json({ error: "Vehicle already exists" });
    }
    const newVehicle = await vehiclesCollection.insertOne({ vehicle,imageUrl });
    res.json({ message: "Vehicle created successfully", newVehicle });
  } catch (error) {
    res.status(500).json({ error: "Failed to create vehicle" });
  }
});

app.delete("/vehicles/delete/:id", verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const result = await vehiclesCollection.deleteOne({ _id: new ObjectId(id) });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to delete vehicle" });
  }
});
// Update Vehicle
app.put("/vehicles/update/:id", verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { vehicle, imageUrl } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid vehicle ID" });
    }

    const existingVehicle = await vehiclesCollection.findOne({
      _id: new ObjectId(id),
    });
    if (!existingVehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    const updateFields = {};
    if (vehicle) updateFields.vehicle = vehicle;
    if (imageUrl) updateFields.imageUrl = imageUrl;

    const result = await vehiclesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({ error: "No changes made to the vehicle" });
    }

    res.json({ message: "Vehicle updated successfully", result });
  } catch (error) {
    console.error("Failed to update vehicle:", error);
    res.status(500).json({ error: "Failed to update vehicle" });
  }
});

app.get("/vehicles/all", async (req, res) => {
  try {
    const result = await vehiclesCollection.find({}).toArray();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to get all vehicles" });
  }
});

// Topics Routes
app.post("/topics/create", verifyAdmin, async (req, res) => {
  try {
    const { vehicleType, topic } = req.body;
    if (!vehicleType || !topic) {
      return res.status(400).json({ error: "Vehicle type and topic are required" });
    }
    const existingTopic = await topicsCollection.findOne({ topic });
    if (existingTopic) {
      const existingVehicleTypes = existingTopic.vehicleType || [];
      const isDuplicate = vehicleType.every((v) => existingVehicleTypes.includes(v));
      if (isDuplicate) {
        return res.status(400).json({ error: "This topic already exists with the selected vehicle types" });
      }
      const updatedVehicleTypes = [...new Set([...existingVehicleTypes, ...vehicleType])];
      await topicsCollection.updateOne(
        { _id: existingTopic._id },
        { $set: { vehicleType: updatedVehicleTypes } }
      );
      return res.json({ message: "Topic updated successfully", updatedVehicleTypes });
    }
    const newTopic = { vehicleType, topic };
    const result = await topicsCollection.insertOne(newTopic);
    res.json({ message: "Topic created successfully", result });
  } catch (error) {
    console.error("Error creating/updating topic:", error);
    res.status(500).json({ error: "Failed to create or update topic" });
  }
});

app.get("/topics/vehicle-type/:vehicleType", async (req, res) => {
  try {
    const vehicleType = req.params.vehicleType;
    const result = await topicsCollection.find({
      vehicleType: { $in: [vehicleType] }
    }).toArray();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve topics" });
  }
});

app.get("/topics/all-topics", async (req, res) => {
  try {
    const vehicleType = req.query.vehicleType;
    const filter = vehicleType
      ? { vehicleType: { $regex: new RegExp(`^${vehicleType}$`, "i") } }
      : {};
    const result = await topicsCollection.find(filter).toArray();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve topics" });
  }
});

app.delete("/topics/delete-topic/:id", verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const topic = await topicsCollection.findOne({ _id: new ObjectId(id) });
    if (!topic) {
      return res.status(404).json({ error: "Topic not found" });
    }
    const deleteQuestionsResult = await questionCollection.deleteMany({ topics: topic.topic });
    const deleteTopicResult = await topicsCollection.deleteOne({ _id: new ObjectId(id) });
    res.json({
      message: "Topic and related questions deleted successfully",
      deletedQuestions: deleteQuestionsResult.deletedCount,
      deletedTopic: deleteTopicResult.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete topic and related questions" });
  }
});
// Update Topic API
app.patch("/topics/update-topic/:id", verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const updateData = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid topic ID" });
    }

    const topic = await topicsCollection.findOne({ _id: new ObjectId(id) });
    if (!topic) {
      return res.status(404).json({ error: "Topic not found" });
    }

    const updateResult = await topicsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: "Topic not found" });
    }

    const updatedTopic = await topicsCollection.findOne({ _id: new ObjectId(id) });
    res.json({
      message: "Topic updated successfully",
      updatedTopic,
    });
  } catch (error) {
    console.error("Error updating topic:", error);
    res.status(500).json({ error: "Failed to update topic" });
  }
});


// Question Routes
app.post("/questions/add-question", verifyAdmin, async (req, res) => {
  try {
    const { question, topic, imageUrl, correctOption, vehicleType } = req.body;
    const options = [];
    for (let i = 1; i <= 4; i++) {
      if (req.body[`option${i}`]) {
        options.push(req.body[`option${i}`]);
      }
    }
    if (options.length < 2) {
      return res.status(400).json({ error: "At least two options are required" });
    }
    const newQuestion = {
      question,
      options,
      answer: correctOption,
      topics: topic,
      vehicleType,
      image: imageUrl,
    };
    const result = await questionCollection.insertOne(newQuestion);
    res.json(result);
  } catch (error) {
    console.error("Error adding question:", error);
    res.status(500).json({ error: "Failed to add question" });
  }
});

app.put("/questions/update-question/:id", verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { question, options, answer, topics, vehicleType, image } = req.body;

    // Validate the ID
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid question ID" });
    }

    // Update the question in the database
    const result = await questionCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { question, options, answer, topics, vehicleType, image } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Question not found" });
    }

    // Fetch the updated question from the database
    const updatedQuestion = await questionCollection.findOne({ _id: new ObjectId(id) });

    if (!updatedQuestion) {
      return res.status(404).json({ error: "Updated question not found" });
    }

    // Send the updated question in the response
    res.json({ message: "Question updated successfully", result: updatedQuestion });
  } catch (error) {
    console.error("Error updating question:", error);
    res.status(500).json({ error: "Failed to update question" });
  }
});





app.delete("/questions/delete-question/:id", verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const result = await questionCollection.deleteOne({ _id: new ObjectId(id) });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to delete question" });
  }
});

app.get("/questions/all-questions", async (req, res) => {
  const { topics, vehicleType } = req.query;
  try {
    if (!questionCollection) {
      throw new Error("Database not connected: questionCollection is undefined");
    }

    // Build the query object
    const query = {};
    if (topics) {
      const topicsArray = topics.split(",");
      query.topics = { $in: topicsArray }; // Match any of the topics in the array
    }
    if (vehicleType) {
      query.vehicleType = { $regex: new RegExp(vehicleType, "i") }; // Case-insensitive match for vehicleType
    }

    // Fetch questions from the database based on the query
    const questions = await questionCollection.find(query).toArray();

    // Send the filtered questions back in the response
    res.json({ message: "Query received", questions });
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });  } catch (error) {
    console.error("Error in running MongoDB operations:", error);
  }
}

run().catch(console.log);