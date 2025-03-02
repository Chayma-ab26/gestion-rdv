const express = require("express");
const Appointment = require("../models/appointments");
const User = require("../models/user");

const router = express.Router();

// 🔹 Récupérer tous les rendez-vous
router.get("/", async (req, res) => {
    try {
        const appointments = await Appointment.find().populate("patient doctor", "fullName email");
        res.json(appointments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 🔹 Récupérer un rendez-vous par ID
router.get("/:id", async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id).populate("patient doctor", "fullName email");
        if (!appointment) {
            return res.status(404).json({ message: "Rendez-vous non trouvé" });
        }
        res.json(appointment);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 🔹 Créer un nouveau rendez-vous
router.post("/", async (req, res) => {
    try {
        const { patient, doctor, date, reason } = req.body;

        // Vérifier si le patient et le docteur existent
        const patientExists = await User.findById(patient);
        const doctorExists = await User.findById(doctor);
        if (!patientExists || !doctorExists) {
            return res.status(400).json({ message: "Patient ou docteur introuvable" });
        }

        const newAppointment = new Appointment({
            patient,
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

// 🔹 Mettre à jour un rendez-vous (changement de statut)
router.put("/:id", async (req, res) => {
    try {
        const { status } = req.body;

        if (!["pending", "confirmed", "canceled"].includes(status)) {
            return res.status(400).json({ message: "Statut invalide" });
        }

        const updatedAppointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!updatedAppointment) {
            return res.status(404).json({ message: "Rendez-vous non trouvé" });
        }

        res.json({ message: "Rendez-vous mis à jour", appointment: updatedAppointment });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 🔹 Supprimer un rendez-vous
router.delete("/:id", async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({ message: "Rendez-vous non trouvé" });
        }

        await appointment.deleteOne();
        res.json({ message: "Rendez-vous supprimé avec succès" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
