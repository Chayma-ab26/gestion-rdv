const express = require("express");
const router = express.Router();
const Availability = require("../models/availabilities");

// 🔹 Ajouter une disponibilité pour un médecin
router.post("/:doctorId/add-availability", async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { day, startTime, endTime } = req.body;

        // Vérifier que tous les champs sont bien remplis
        if (!doctorId || !day || !startTime || !endTime) {
            return res.status(400).json({ message: "Tous les champs sont requis !" });
        }

        // Créer et enregistrer la nouvelle disponibilité
        const newAvailability = new Availability({ doctorId, day, startTime, endTime });
        await newAvailability.save();
        
        res.status(201).json({ message: "Disponibilité ajoutée avec succès", newAvailability });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
});

// 🔹 Récupérer toutes les disponibilités d'un médecin spécifique
router.get("/:doctorId", async (req, res) => {
    try {
        const { doctorId } = req.params;
        const availabilities = await Availability.find({ doctorId });

        if (availabilities.length === 0) {
            return res.status(404).json({ message: "Aucune disponibilité trouvée pour ce médecin" });
        }

        res.status(200).json(availabilities);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
});



module.exports = router;
