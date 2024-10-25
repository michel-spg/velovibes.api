DROP DATABASE IF EXISTS velovibes_db;

CREATE DATABASE velovibes_db;
USE velovibes_db;

-- Erstelle Tabelle für die Fahrräder
CREATE TABLE bikes (
    id INT PRIMARY KEY,
    brand VARCHAR(255),
    model VARCHAR(255),
    category VARCHAR(255),
    color VARCHAR(50),
    price DECIMAL(10, 2),
    size VARCHAR(50),
    imageUrl TEXT,
    description TEXT
);

-- Erstelle Tabelle für das Equipment
CREATE TABLE bike_equipment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bike_id INT,
    equipment VARCHAR(255),
    FOREIGN KEY (bike_id) REFERENCES bikes(id) ON DELETE CASCADE
);

-- Daten für die Fahrräder einfügen
INSERT INTO bikes (id, brand, model, category, color, price, size, imageUrl, description)
VALUES 
(1, 'Trek', 'Domane SL 7', 'Road Bike', 'Red', 4500, '56cm', '/images/01-trek.jpeg', 'A lightweight, aerodynamic road bike perfect for long rides and competitive racing.'),
(2, 'Specialized', 'Stumpjumper Comp', 'Mountain Bike', 'Matte Black', 3700, 'M', '/images/02-specialized.jpeg', 'A versatile mountain bike built for aggressive trail riding and tough terrains.'),
(3, 'Cannondale', 'Synapse Carbon 105', 'Endurance Bike', 'Blue', 3200, '54cm', '/images/03-cannondale.jpeg', 'Designed for long-distance comfort with high-performance handling on any road.');

-- Daten für das Equipment einfügen
INSERT INTO bike_equipment (bike_id, equipment)
VALUES 
(1, 'Shimano Ultegra drivetrain'),
(1, 'Carbon frame'),
(1, 'Hydraulic disc brakes'),
(1, 'Bontrager wheels'),
(2, 'SRAM GX Eagle drivetrain'),
(2, 'Aluminum frame'),
(2, 'RockShox suspension'),
(2, '29-inch wheels'),
(3, 'Shimano 105 groupset'),
(3, 'Carbon frame'),
(3, 'Hydraulic disc brakes'),
(3, 'Endurance geometry');
