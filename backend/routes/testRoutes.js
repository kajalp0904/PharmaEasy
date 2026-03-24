const express = require("express");
const router = express.Router();

router.get("/test", (req, res) => {
  res.json({
    message: "Test API is working",
    status: "success"
  });
});

module.exports = router;
