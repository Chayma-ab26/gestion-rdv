const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const userRoutes = require("./routes/userroutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/api/appointments", appointmentRoutes);

//  Middleware pour log des requêtes
app.use((req, res, next) => {
    console.log(` Requête reçue : ${req.method} ${req.url}`);
    next();
});

// Vérification et affichage de l'URI MongoDB
console.log("Tentative de connexion à :", process.env.MONGO_URI);

//  Connexion à MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log(" Connecté à MongoDB Atlas !"))
.catch(err => console.error(" Erreur de connexion MongoDB :", err));

//  Définition des routes
app.use("/api/users", userRoutes);

// Middleware pour lire les JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//  Route principale
app.get("/", (req, res) => {
    res.json({ message: "Bienvenue sur l'API de gestion des rendez-vous" });
});

//  Démarrage du serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(` Serveur démarré sur le port ${PORT}`);
});
