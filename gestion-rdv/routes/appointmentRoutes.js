const express = require("express");
const Appointment = require("../models/appointments");
const User = require("../models/user");
const auth = require("../middleware/auth");

const router = express.Router();

// Appliquer le middleware d'authentification à toutes les routes
router.use(auth);

// 🔹 Récupérer les rendez-vous (filtré selon le rôle)
router.get("/", async (req, res) => {
    try {
        let appointments;
        
        // Si c'est un client, on ne récupère que ses rendez-vous
        if (req.user.role === "client") {
            appointments = await Appointment.find({ patient: req.user.id })
                .populate("patient doctor", "name email");
        }
        // Si c'est un professionnel, on ne récupère que les rendez-vous qui lui sont assignés
        else if (req.user.role === "professional") {
            appointments = await Appointment.find({ doctor: req.user.id })
                .populate("patient doctor", "name email");
        }

        res.json(appointments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 🔹 Récupérer un rendez-vous par ID (avec vérification d'accès)
router.get("/:id", async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id)
            .populate("patient doctor", "name email");

        if (!appointment) {
            return res.status(404).json({ message: "Rendez-vous non trouvé" });
        }

        // Vérifier que l'utilisateur a le droit d'accéder à ce rendez-vous
        if (req.user.role === "client" && appointment.patient.toString() !== req.user.id) {
            return res.status(403).json({ message: "Accès non autorisé" });
        }
        if (req.user.role === "professional" && appointment.doctor.toString() !== req.user.id) {
            return res.status(403).json({ message: "Accès non autorisé" });
        }

        res.json(appointment);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 🔹 Créer un nouveau rendez-vous
router.post("/", async (req, res) => {
    try {
        const { doctor, date, reason } = req.body;

        // Vérifier si le professionnel existe
        const doctorExists = await User.findById(doctor);
        if (!doctorExists || doctorExists.role !== "professional") {
            return res.status(400).json({ message: "Professionnel introuvable" });
        }

        const newAppointment = new Appointment({
            patient: req.user.id, // Utiliser l'ID du client connecté
            doctor,
            date,
            reason,
        });

        await newAppointment.save();
        res.status(201).json({ message: "Rendez-vous créé avec succès", appointment: newAppointment });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// 🔹 Mettre à jour un rendez-vous (avec vérification d'accès)
router.put("/:id", async (req, res) => {
    try {
        const { status } = req.body;
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ message: "Rendez-vous non trouvé" });
        }

        // Vérifier les droits d'accès
        if (req.user.role === "client" && appointment.patient.toString() !== req.user.id) {
            return res.status(403).json({ message: "Accès non autorisé" });
        }
        if (req.user.role === "professional" && appointment.doctor.toString() !== req.user.id) {
            return res.status(403).json({ message: "Accès non autorisé" });
        }

        if (!["pending", "confirmed", "cancelled"].includes(status)) {
            return res.status(400).json({ message: "Statut invalide" });
        }

        appointment.status = status;
        await appointment.save();

        res.json({ message: "Rendez-vous mis à jour", appointment });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 🔹 Supprimer un rendez-vous (avec vérification d'accès)
router.delete("/:id", async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        
        if (!appointment) {
            return res.status(404).json({ message: "Rendez-vous non trouvé" });
        }

        // Vérifier les droits d'accès
        if (req.user.role === "client" && appointment.patient.toString() !== req.user.id) {
            return res.status(403).json({ message: "Accès non autorisé" });
        }
        if (req.user.role === "professional" && appointment.doctor.toString() !== req.user.id) {
            return res.status(403).json({ message: "Accès non autorisé" });
        }

        await appointment.deleteOne();
        res.json({ message: "Rendez-vous supprimé avec succès" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
