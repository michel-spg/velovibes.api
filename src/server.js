const express = require("express");
const bikes = require("./bikes");
const mysql = require("mysql2/promise");
const path = require("path");
const app = express();
const port = 3000;

app.use("/images", express.static(path.join(__dirname, "../assets")));

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "velovibes_db",
});

app.get("/api/bikes", async (req, res) => {
  try {
    // Query um die Fahrräder zu holen
    /*
    Die rechteckigen Klammern dienen dazu, das Ergebnis der SQL-Abfrage 
    direkt in die Variable bikes zu entpacken, indem der erste Wert des 
    Arrays (rows) extrahiert wird.
    */
    const [bikes] = await db.query(`
          SELECT 
              b.id, b.brand, b.model, b.category, b.color, 
              b.price, b.size, b.imageUrl, b.description
          FROM bikes b
      `);

    // Query um das Equipment für jedes Fahrrad zu holen
    const [equipment] = await db.query(`
          SELECT 
              be.bike_id, be.equipment 
          FROM bike_equipment be
      `);

    // Mappe das Equipment zu den jeweiligen Fahrrädern
    const bikesWithEquipment = bikes.map((bike) => {
      // Filtere das Equipment nach der bike_id
      const bikeEquipment = equipment
        .filter((eq) => eq.bike_id === bike.id)
        .map((eq) => eq.equipment);

      return {
        id: bike.id,
        brand: bike.brand,
        model: bike.model,
        category: bike.category,
        color: bike.color,
        price: bike.price,
        size: bike.size,
        image: bike.imageUrl,
        description: bike.description,
        equipment: bikeEquipment,
      };
    });

    // Antwort im JSON-Format zurückgeben
    res.json(bikesWithEquipment);
  } catch (error) {
    console.error("Fehler beim Abrufen der Fahrräder:", error);
    res.status(500).json({ error: "Fehler beim Abrufen der Fahrräder" });
  }
});

app.get("/api/bikes/:bikeId", (req, res) => {
  const bikeId = req.params.bikeId;
  const bike = bikes.find((bike) => bike.id == bikeId);
  if (!bike) {
    res.status(404).send("Bike not found");
  } else {
    res.json(bike);
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
