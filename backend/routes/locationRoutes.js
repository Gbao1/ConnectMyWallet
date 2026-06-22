const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

/**
 * @swagger
 * /api/locations:
 *   get:
 *     summary: Get Australian locations
 *     description: Retrieve a list of Australian states, cities, and suburbs for location selection
 *     tags: [Locations]
 *     responses:
 *       200:
 *         description: Australian locations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Location'
 *             example:
 *               - state: "New South Wales"
 *                 cities:
 *                   - city: "Sydney"
 *                     suburbs: ["Bondi", "Manly", "Parramatta", "Chatswood"]
 *                   - city: "Newcastle"
 *                     suburbs: ["Hamilton", "Merewether", "Charlestown"]
 *               - state: "Victoria"
 *                 cities:
 *                   - city: "Melbourne"
 *                     suburbs: ["St Kilda", "Richmond", "Brunswick", "Fitzroy"]
 *       500:
 *         description: Error loading location data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", (req, res) => {
  try {
    const filePath = path.join(__dirname, "../data/locations.json");
    const data = fs.readFileSync(filePath, "utf-8");
    const locations = JSON.parse(data);
    res.json(locations);
  } catch (error) {
    console.error("Error reading location file:", error.message);
    res.status(500).json({ msg: "Error loading location data" });
  }
});

module.exports = router;
