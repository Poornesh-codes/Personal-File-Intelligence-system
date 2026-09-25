const bcrypt = require("bcryptjs");//will be using bcrypt for password hashing
const User = require("../models/User");

const register = async (req, res) => {
  try {
    console.log("Request body:", req.body);

    const { name, email, password } = req.body || {};

    // check the fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required"
      });
    }

    // 2. Checks if already exist
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists"
      });
    }

    // password hashing
    const hashedPassword = await bcrypt.hash(password, 10);

    //  Create the user
    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    // Send response
    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error("Registration error:", error.message);

    res.status(500).json({
      message: "Server error"
    });
  }
};

module.exports = {
  register
};