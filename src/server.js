const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const multer = require("multer");
const admin = require("firebase-admin");
const app = express();
const port = 3000;

// Initialize Firebase Admin
const serviceAccount = require("../config/fbServiceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

app.use("/images", express.static(path.join(__dirname, "../assets")));
app.use(cors());

const upload = multer({ storage: multer.memoryStorage() });

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "velovibes_db",
});

// Authentication middleware
const checkAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    console.log(req.user);
    console.log("req.user: " + req.user);
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

app.use('/api/', checkAuth)

// set custom claim/role for user
app.put('/admin-api/user/:fbuid/claim', async (req, res) => {
  const uid  = req.params.fbuid;
  const roleKey = req.query.roleKey;
  const roleValue = req.query.roleValue;
  console.log("Set customClaim/role of user " + uid + " to (roleKey: " + roleKey + ", roleValue: " + roleValue + ")");
  try {
    const customClaims = {};
    customClaims[roleKey] = roleValue;
    await admin.auth().setCustomUserClaims(uid, customClaims);
    res.json({ message: 'Custom claim set' });
  } catch (error) {
    console.error('Error setting custom claim:', error);
    res.status(500).json({ error: 'Error setting custom claim' });
  }
});

// get full user from firebase auth
app.get('/admin-api/user/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    const user = await admin.auth().getUser(uid);
    res.json(user);
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Error fetching user data' });
  }
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

app.post("/api/bikes", upload.single("image"), async (req, res) => {
  const connection = await db.getConnection();
  const buffer = req.file?.buffer; // Bilddaten im Speicher
  const finalPath = req.file
    ? path.join(
        __dirname,
        "../assets",
        `${Date.now()}-${req.file.originalname}`
      )
    : null;

  try {
    const {
      brand,
      model,
      category,
      color,
      price,
      size,
      description,
      equipment,
    } = req.body;

    if (
      !brand ||
      !model ||
      !category ||
      !color ||
      !price ||
      !size ||
      !description ||
      !equipment
    ) {
      return res.status(400).json({
        error: "Alle Felder sind erforderlich, einschließlich Equipment",
      });
    }

    console.log(req.body);
    const equipmentArray = Array.isArray(equipment) ? equipment : [equipment];

    if (!req.file) {
      return res.status(400).json({ error: "Bild nicht vorhanden!" });
    }

    await connection.beginTransaction();

    // Fahrrad in die Datenbank einfügen
    const [result] = await connection.query(
      `
        INSERT INTO bikes (brand, model, category, color, price, size, imageUrl, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        brand,
        model,
        category,
        color,
        price,
        size,
        `/images/${path.basename(finalPath)}`,
        description,
      ]
    );

    const bikeId = Number(result.insertId);

    // Equipment in die bike_equipment-Tabelle einfügen
    const equipmentInsertPromises = equipmentArray.map((item) =>
      connection.query(
        `
          INSERT INTO bike_equipment (bike_id, equipment)
          VALUES (?, ?)
        `,
        [bikeId, item]
      )
    );

    await Promise.all(equipmentInsertPromises);

    // Transaktion erfolgreich abschließen
    await connection.commit();

    // Speichere das Bild aus dem Buffer im finalen Speicherort
    fs.writeFile(finalPath, buffer, (err) => {
      if (err) {
        console.error("Fehler beim Speichern des Bildes:", err);
        throw new Error("Bild konnte nicht gespeichert werden");
      }
    });

    res.status(201).json({
      message: "Fahrrad erfolgreich hinzugefügt",
      bikeId,
    });
  } catch (error) {
    console.error("Fehler beim Hinzufügen des Fahrrads:", error);

    // Lösche das Bild, falls es versehentlich geschrieben wurde
    if (finalPath && fs.existsSync(finalPath)) {
      fs.unlink(finalPath, (err) => {
        if (err) console.error("Fehler beim Löschen des Bildes:", err);
      });
    }

    await connection.rollback();
    res.status(500).json({ error: "Fehler beim Hinzufügen des Fahrrads" });
  } finally {
    connection.release();
  }
});

app.delete("/api/bikes/:id", async (req, res) => {
  const bikeId = req.params.id;

  try {
    const [bikes] = await db.query(
      `
          SELECT imageUrl
          FROM bikes
          WHERE id = ?
      `,
      [bikeId]
    );

    if (bikes.length === 0) {
      return res.status(404).json({ error: "Bike not found" });
    }

    const imageUrl = bikes[0].imageUrl;

    await db.query(
      `
          DELETE FROM bikes
          WHERE id = ?
      `,
      [bikeId]
    );

    if (imageUrl) {
      const imagePath = path.join(__dirname, "../assets", path.basename(imageUrl));

      fs.unlink(imagePath, (err) => {
        if (err) {
          console.error("Fehler beim Löschen des Bildes:", err);
        }
      });
    }

    res.json({ message: "Fahrrad erfolgreich gelöscht" });
  } catch (error) {
    console.error("Fehler beim Löschen des Fahrrads:", error);
    res.status(500).json({ error: "Fehler beim Löschen des Fahrrads" });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
