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

app.get("/api/bikes/:id", async (req, res) => {
  const bikeId = req.params.id;

  try {
    // Abfrage für das spezifische Fahrrad basierend auf der bikeId
    const [bikes] = await db.query(
      `
          SELECT 
              b.id, b.brand, b.model, b.category, b.color, 
              b.price, b.size, b.imageUrl, b.description
          FROM bikes b
          WHERE b.id = ?
      `,
      [bikeId]
    );

    if (bikes.length === 0) {
      return res.status(404).json({ error: "Bike not found" });
    }

    // Abfrage für das Equipment des spezifischen Fahrrads
    const [equipment] = await db.query(
      `
          SELECT 
              equipment 
          FROM bike_equipment 
          WHERE bike_id = ?
      `,
      [bikeId]
    );

    const bikeEquipment = equipment.map((eq) => eq.equipment);

    const bikeWithEquipment = {
      id: bikes[0].id,
      brand: bikes[0].brand,
      model: bikes[0].model,
      category: bikes[0].category,
      color: bikes[0].color,
      price: bikes[0].price,
      size: bikes[0].size,
      image: bikes[0].imageUrl,
      description: bikes[0].description,
      equipment: bikeEquipment,
    };

    res.json(bikeWithEquipment);
  } catch (error) {
    console.error("Fehler beim Abrufen des Fahrrads:", error);
    res.status(500).json({ error: "Fehler beim Abrufen des Fahrrads" });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
