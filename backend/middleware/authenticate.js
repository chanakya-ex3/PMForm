const jwt = require("jsonwebtoken");

const authenticate = async (req, res, next) => {
  const token = req.header("Authorization");
  if (!token || token === "null") {
    return res.status(401).json({ message: "No token, Authorization Denied" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(decoded.user);
    req.user = decoded.user; // <-- Here: direct on req
    next();
  } catch (e) {
    console.log(e);
    return res.status(401).json({ message: "Token is invalid", e });
  }
};

module.exports = authenticate;
