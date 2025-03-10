const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const userRoutes = require("./routes/userroutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const availabilityRoutes = require("./routes/AvailabilityRoutes"); // ✅ Correction ici

const app = express();

// Activer la prise en charge des JSON
app.use(express.json());

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("✅ Connecté à MongoDB Atlas !"))
.catch(err => console.error("❌ Erreur de connexion MongoDB :", err));

// Définition des routes principales
app.use("/api/users", userRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/availabilities", availabilityRoutes); // ✅ Correction ici

// Route principale
app.get("/", (req, res) => {
    res.json({ message: "Bienvenue sur l'API de gestion des rendez-vous" });
});

// Démarrage du serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
