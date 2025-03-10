const express = require("express");
const Appointment = require("../models/appointments");
const User = require("../models/user");
const sendEmail = require("../service/sendEmail");
const router = express.Router();
const mongoose = require('mongoose');

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
router.put("/update-status/:id", async (req, res) => {
    try {
        const appointmentId = req.params.id;
        const { status } = req.body;

        console.log("ID du rendez-vous reçu dans la route :", appointmentId);

        if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
            return res.status(400).json({ message: "ID de rendez-vous invalide" });
        }

        const appointment = await Appointment.findByIdAndUpdate(
            appointmentId,
            { status },
            { new: true }
        ).populate("patient doctor");

        if (!appointment) {
            return res.status(404).json({ message: "Rendez-vous introuvable" });
        }

        console.log("Rendez-vous trouvé :", appointment);  // Assure-toi que le rendez-vous est bien trouvé

        // Si le statut est confirmé, envoie l'email
        if (status === "confirmed") {
            console.log("Statut du rendez-vous confirmé, envoi de l'email...");

            const patientEmail = appointment.patient.email;
            const doctorName = appointment.doctor.firstName + ' ' + appointment.doctor.lastName;
            const patientName = appointment.patient.firstName + ' ' + appointment.patient.lastName;
            const rdvDate = appointment.date;

            const subject = "Votre rendez-vous est confirmé";
            const text = `Bonjour ${patientName},\n\nVotre rendez-vous avec le Dr. ${doctorName} est confirmé pour le ${rdvDate.toLocaleString()}.\n\nMerci de votre confiance.`;

            // Appel de la fonction sendEmail
            try {
                await sendEmail(appointmentId, subject, text);
                console.log("Email envoyé avec succès !");
            } catch (error) {
                console.error("Erreur lors de l'envoi de l'email :", error);
            }
        }

        res.status(200).json({ message: "Statut mis à jour et email envoyé (si confirmé)", appointment });

    } catch (err) {
        console.error("Erreur lors de la mise à jour du statut :", err);
        res.status(500).json({ error: "Erreur serveur" });
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
