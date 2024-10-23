const express = require("express");
const bikes = require("./bikes");
const app = express();
const port = 3000;

app.get("/", (req, res) => {
  res.send("Welcome to VeloVibes!");
});

app.get("/api/bikes", (req, res) => {
  res.json(bikes);
});

app.get("/api/bikes/:bikeId", (req, res) => {
    const bikeId = req.params.bikeId;
    const bike = bikes.find(bike => bike.id == bikeId);
    if (!bike) {
        res.status(404).send("Bike not found");
    } else {
        res.json(bike);
    }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
