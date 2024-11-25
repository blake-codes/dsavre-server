require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const User = require("./models/User");

// Initialize the app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Message Schema
const messageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

// Message Model
const Message = mongoose.model("Message", messageSchema);

const SECRET_KEY = process.env.SECRET_KEY || "your-secret-key";

// Middleware to Protect Routes
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    const error = new Error("No token provided");
    error.statusCode = 401;
    return next(error); // Pass the error to the global error handler
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    const error = new Error("Invalid token");
    error.statusCode = 401;
    return next(error); // Pass the error to the global error handler
  }
};

// Routes

// 1. Submit a message
app.post("/api/messages", async (req, res, next) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const newMessage = new Message({ name, email, message });
    await newMessage.save();
    res
      .status(201)
      .json({ message: "Message sent successfully.", data: newMessage });
  } catch (err) {
    next(err); // Pass the error to the global error handler
  }
});

// 2. Get all messages
app.get("/api/messages", authenticate, async (req, res, next) => {
  try {
    const messages = await Message.find();
    res.status(200).json(messages);
  } catch (err) {
    next(err); // Pass the error to the global error handler
  }
});

// 3. Get a single message by ID
app.get("/api/messages/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ error: "Message not found." });
    }
    res.status(200).json(message);
  } catch (err) {
    next(err); // Pass the error to the global error handler
  }
});

// Register Endpoint
app.post("/register", async (req, res, next) => {
  const { username, password } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const newUser = new User({ username, password });
    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    next(err); // Pass the error to the global error handler
  }
});

// Login Endpoint
app.post("/login", async (req, res, next) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, username: user.username },
      SECRET_KEY,
      {
        expiresIn: "1h",
      }
    );

    res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    next(err); // Pass the error to the global error handler
  }
});

// Example Protected Route
app.get("/protected", authenticate, (req, res) => {
  res
    .status(200)
    .json({ message: "You have access to this route", user: req.user });
});

// Global error handler (placed at the bottom)
app.use((err, req, res, next) => {
  console.error(err); // Log error details
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(statusCode).json({ error: message });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on PORT:${PORT}`);
});
