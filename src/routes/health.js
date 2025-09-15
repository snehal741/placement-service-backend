const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Mauli Placements Backend is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
