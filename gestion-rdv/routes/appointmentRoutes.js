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
            appointments = await Appointment.find({ client: req.user.id })
                .populate("professional", "firstName lastName specialty")
                .populate("client", "firstName lastName")
                .sort({ date: -1 });
        }
        // Si c'est un professionnel, on ne récupère que les rendez-vous qui lui sont assignés
        else if (req.user.role === "professional") {
            appointments = await Appointment.find({ professional: req.user.id })
                .populate("client", "firstName lastName")
                .populate("professional", "firstName lastName specialty")
                .sort({ date: -1 });
        }

        res.json(appointments);
    } catch (err) {
        console.error('Erreur lors de la récupération des rendez-vous:', err);
        res.status(500).json({ message: err.message });
    }
});

// 🔹 Récupérer un rendez-vous par ID (avec vérification d'accès)
router.get("/:id", async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id)
            .populate("client", "firstName lastName")
            .populate("professional", "firstName lastName specialty");

        if (!appointment) {
            return res.status(404).json({ message: "Rendez-vous non trouvé" });
        }

        // Vérifier que l'utilisateur a le droit d'accéder à ce rendez-vous
        if (req.user.role === "client" && appointment.client.toString() !== req.user.id) {
            return res.status(403).json({ message: "Accès non autorisé" });
        }
        if (req.user.role === "professional" && appointment.professional.toString() !== req.user.id) {
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
        console.log("Début de la création du rendez-vous");
        console.log("Données reçues:", JSON.stringify(req.body));
        console.log("Utilisateur authentifié:", req.user);

        const { professional: professionalId, date, reason } = req.body;

        // Validation des données
        if (!professionalId || !date || !reason) {
            console.log("Validation échouée - champs manquants");
            return res.status(400).json({ 
                message: "Tous les champs sont obligatoires",
                details: {
                    professional: !professionalId ? "L'identifiant du professionnel est requis" : null,
                    date: !date ? "La date du rendez-vous est requise" : null,
                    reason: !reason ? "Le motif du rendez-vous est requis" : null
                }
            });
        }

        // Convertir la date en objet Date
        console.log("Date reçue:", date);
        const appointmentDate = new Date(date);
        console.log("Date convertie:", appointmentDate);
        
        // Vérifier si la date est valide
        if (isNaN(appointmentDate.getTime())) {
            console.log("Date invalide");
            return res.status(400).json({ message: "La date du rendez-vous est invalide" });
        }

        // Vérifier si le professionnel existe
        const professional = await User.findOne({ _id: professionalId, role: "professional" })
            .select('firstName lastName specialty availability');
            
        if (!professional) {
            console.log("Professionnel introuvable");
            return res.status(404).json({ message: "Professionnel introuvable" });
        }

        const now = new Date();
        if (appointmentDate < now) {
            console.log("Date dans le passé");
            return res.status(400).json({ message: "La date du rendez-vous ne peut pas être dans le passé" });
        }

        // Vérifier si le jour est un jour travaillé
        const dayName = getDayName(appointmentDate);
        if (!professional.availability.workingDays.includes(dayName)) {
            console.log("Jour non travaillé");
            return res.status(400).json({ 
                message: "Le professionnel ne travaille pas ce jour-là",
                details: {
                    requestedDay: dayName,
                    workingDays: professional.availability.workingDays
                }
            });
        }

        // Vérifier si l'heure est dans les horaires de travail
        const timeStr = appointmentDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const appointmentTime = timeToMinutes(timeStr);
        const workStart = timeToMinutes(professional.availability.workingHours.start);
        const workEnd = timeToMinutes(professional.availability.workingHours.end);
        const breakStart = timeToMinutes(professional.availability.breakTime.start);
        const breakEnd = timeToMinutes(professional.availability.breakTime.end);

        if (appointmentTime < workStart || appointmentTime >= workEnd) {
            console.log("Heure en dehors des horaires de travail");
            return res.status(400).json({ 
                message: "L'heure du rendez-vous est en dehors des horaires de travail",
                details: {
                    requestedTime: timeStr,
                    workingHours: `${professional.availability.workingHours.start} - ${professional.availability.workingHours.end}`
                }
            });
        }

        if (appointmentTime >= breakStart && appointmentTime < breakEnd) {
            console.log("Heure pendant la pause déjeuner");
            return res.status(400).json({ 
                message: "L'heure du rendez-vous est pendant la pause déjeuner",
                details: {
                    requestedTime: timeStr,
                    breakTime: `${professional.availability.breakTime.start} - ${professional.availability.breakTime.end}`
                }
            });
        }

        // Vérifier s'il n'y a pas déjà un rendez-vous à cette heure
        const existingAppointment = await Appointment.findOne({
            professional: professionalId,
            date: appointmentDate,
            status: { $ne: 'cancelled' }
        });

        if (existingAppointment) {
            console.log("Créneau horaire déjà pris");
            return res.status(400).json({ message: "Ce créneau horaire est déjà pris" });
        }

        // Créer le rendez-vous
        console.log("Informations de l'utilisateur dans le token:", req.user);
        
        // Déterminer l'ID de l'utilisateur à partir du token
        const clientId = req.user.userId || req.user.id || req.user._id;
        
        if (!clientId) {
            console.error("Impossible de déterminer l'ID du client à partir du token");
            return res.status(400).json({ message: "Erreur d'identification du client" });
        }
        
        console.log("ID du client utilisé:", clientId);
        
        const newAppointment = new Appointment({
            client: clientId,
            professional: professionalId,
            date: appointmentDate,
            reason,
            status: 'pending'
        });

        console.log("Tentative de création du rendez-vous avec les données:", {
            client: clientId,
            professional: professionalId,
            date: appointmentDate,
            reason,
            status: 'pending'
        });

        await newAppointment.save();

        // Envoyer notification (si service implémenté)
        try {
            // Vérifier si les variables d'environnement sont définies
            if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
                const emailService = require('../services/emailService');
                await emailService.sendAppointmentConfirmation(newAppointment._id);
            } else {
                console.log('Variables d\'environnement EMAIL_USER ou EMAIL_PASSWORD non définies, email non envoyé');
            }
        } catch (emailError) {
            console.error('Erreur lors de l\'envoi de l\'e-mail de confirmation:', emailError);
            // On continue le processus même si l'email échoue
        }

        // Récupérer le rendez-vous avec les informations complètes
        const savedAppointment = await Appointment.findById(newAppointment._id)
            .populate('professional', 'firstName lastName specialty')
            .populate('client', 'firstName lastName');

        res.status(201).json({
            message: "Rendez-vous créé avec succès",
            appointment: savedAppointment
        });
    } catch (err) {
        console.error('Erreur lors de la création du rendez-vous:', err);
        res.status(500).json({ 
            message: "Une erreur est survenue lors de la création du rendez-vous",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// 🔹 Vérifier la disponibilité des créneaux pour un professionnel
router.get("/availability/:professionalId", async (req, res) => {
    try {
        const { professionalId } = req.params;
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ message: "La date est requise" });
        }

        // Vérifier si le professionnel existe
        const professional = await User.findById(professionalId);
        if (!professional || professional.role !== "professional") {
            return res.status(404).json({ message: "Professionnel introuvable" });
        }

        // Récupérer tous les rendez-vous pour cette date
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const appointments = await Appointment.find({
            professional: professionalId,
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            },
            status: { $ne: 'cancelled' }
        });

        // Extraire les heures des rendez-vous
        const bookedSlots = appointments.map(appointment => {
            const appointmentDate = new Date(appointment.date);
            return `${appointmentDate.getHours().toString().padStart(2, '0')}:${appointmentDate.getMinutes().toString().padStart(2, '0')}`;
        });

        res.json({ bookedSlots });
    } catch (err) {
        console.error('Erreur lors de la vérification des disponibilités:', err);
        res.status(500).json({ message: "Une erreur est survenue lors de la vérification des disponibilités" });
    }
});

// Fonctions utilitaires
function getDayName(date) {
    const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    return days[date.getDay()];
}

function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

// 🔹 Mettre à jour un rendez-vous (avec vérification d'accès)
router.put("/:id", async (req, res) => {
    try {
        const { status } = req.body;
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ message: "Rendez-vous non trouvé" });
        }

        // Vérifier les droits d'accès
        if (req.user.role === "client" && appointment.client.toString() !== req.user.id) {
            return res.status(403).json({ message: "Accès non autorisé" });
        }
        if (req.user.role === "professional" && appointment.professional.toString() !== req.user.id) {
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
        if (req.user.role === "client" && appointment.client.toString() !== req.user.id) {
            return res.status(403).json({ message: "Accès non autorisé" });
        }
        if (req.user.role === "professional" && appointment.professional.toString() !== req.user.id) {
            return res.status(403).json({ message: "Accès non autorisé" });
        }

        await appointment.deleteOne();
        res.json({ message: "Rendez-vous supprimé avec succès" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
