const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const auth = require("../middleware/auth");
const Appointment = require("../models/appointments");

const router = express.Router();
const SECRET_KEY = "votre_cle_secrete";

// Routes publiques (sans authentification)
// POST /api/users/signup : Inscription
router.post("/signup", async (req, res) => {
    try {
        const { firstName, lastName, email, phone, address, password, confirmPassword, role, birthDate, specialty } = req.body;

        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Les mots de passe ne correspondent pas" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Cet email est déjà utilisé" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            firstName,
            lastName,
            email,
            phone,
            address,
            password: hashedPassword,
            role,
            ...(role === "client" && { birthDate }),
            ...(role === "professional" && { specialty })
        });

        await user.save();

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            SECRET_KEY,
            { expiresIn: "24h" }
        );

        res.status(201).json({
            message: "Utilisateur créé avec succès",
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Erreur lors de l\'inscription:', err);
        res.status(500).json({ message: "Erreur lors de la création de l'utilisateur" });
    }
});

// POST /api/users/login : Connexion
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Email ou mot de passe incorrect" });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: "Email ou mot de passe incorrect" });
        }

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            SECRET_KEY,
            { expiresIn: "24h" }
        );

        res.json({
            message: "Connexion réussie",
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Erreur lors de la connexion:', err);
        res.status(500).json({ message: "Erreur lors de la connexion" });
    }
});

// Routes protégées (avec authentification)
const protectedRouter = express.Router();
protectedRouter.use(auth);

// GET /api/users/list-professionals : Liste des professionnels
protectedRouter.get("/list-professionals", async (req, res) => {
    try {
        const { specialty } = req.query;
        const query = { role: "professional" };
        
        if (specialty) {
            query.specialty = specialty;
        }

        const professionals = await User.find(query)
            .select('firstName lastName address specialty availability')
            .sort({ lastName: 1, firstName: 1 }); // Tri par nom puis prénom

        if (!professionals || professionals.length === 0) {
            return res.json([]);
        }

        res.json(professionals);
    } catch (err) {
        console.error('Erreur lors de la récupération des professionnels:', err);
        res.status(500).json({ 
            message: "Une erreur est survenue lors de la récupération des professionnels",
            error: err.message 
        });
    }
});

// GET /api/users/ : Liste de tous les utilisateurs
protectedRouter.get("/", async (req, res) => {
    try {
        const users = await User.find()
            .select('firstName lastName role specialty address');
        res.json(users);
    } catch (err) {
        console.error('Erreur lors de la récupération des utilisateurs:', err);
        res.status(500).json({ message: "Une erreur est survenue lors de la récupération des utilisateurs" });
    }
});

// GET /api/users/:id : Détails d'un utilisateur
protectedRouter.get("/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('firstName lastName address specialty availability role');

        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        res.json(user);
    } catch (err) {
        console.error('Erreur lors de la récupération de l\'utilisateur:', err);
        res.status(500).json({ message: "Une erreur est survenue lors de la récupération de l'utilisateur" });
    }
});

// PUT /api/users/:id : Mise à jour d'un utilisateur
protectedRouter.put("/:id", async (req, res) => {
    try {
        const updates = req.body;
        delete updates.password; // Empêcher la modification du mot de passe via cette route

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        res.json(user);
    } catch (err) {
        console.error('Erreur lors de la mise à jour de l\'utilisateur:', err);
        res.status(500).json({ message: "Une erreur est survenue lors de la mise à jour de l'utilisateur" });
    }
});

// DELETE /api/users/:id : Suppression d'un utilisateur
protectedRouter.delete("/:id", async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        res.json({ message: "Utilisateur supprimé avec succès" });
    } catch (err) {
        console.error('Erreur lors de la suppression de l\'utilisateur:', err);
        res.status(500).json({ message: "Une erreur est survenue lors de la suppression de l'utilisateur" });
    }
});

// Route pour les disponibilités (route additionnelle)
protectedRouter.get("/professionals/:id/availability", async (req, res) => {
    try {
        const professional = await User.findOne({
            _id: req.params.id,
            role: "professional"
        }).select('firstName lastName availability');

        if (!professional) {
            return res.status(404).json({ message: "Professionnel non trouvé" });
        }

        const appointments = await Appointment.find({
            doctor: req.params.id,
            date: {
                $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                $lte: new Date(new Date().setDate(new Date().getDate() + 30))
            }
        }).select('date');

        const availableSlots = calculateAvailableSlots(professional, appointments);

        res.json({
            professional: {
                id: professional._id,
                firstName: professional.firstName,
                lastName: professional.lastName
            },
            availability: professional.availability,
            availableSlots
        });
    } catch (err) {
        console.error('Erreur lors de la récupération des disponibilités:', err);
        res.status(500).json({ message: "Une erreur est survenue lors de la récupération des disponibilités" });
    }
});

// Fonctions utilitaires
function calculateAvailableSlots(professional, existingAppointments) {
    const slots = [];
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    const workStart = timeToMinutes(professional.availability.workingHours.start);
    const workEnd = timeToMinutes(professional.availability.workingHours.end);
    const breakStart = timeToMinutes(professional.availability.breakTime.start);
    const breakEnd = timeToMinutes(professional.availability.breakTime.end);
    const slotDuration = professional.availability.slotDuration;

    for (let date = new Date(today); date <= thirtyDaysFromNow; date.setDate(date.getDate() + 1)) {
        const dayName = getDayName(date);
        
        if (professional.availability.workingDays.includes(dayName)) {
            const exception = professional.availability.exceptions.find(
                e => isSameDay(new Date(e.date), date)
            );
            
            if (exception && exception.type === "unavailable") {
                continue;
            }

            for (let time = workStart; time < workEnd; time += slotDuration) {
                if (time >= breakStart && time < breakEnd) {
                    continue;
                }

                const slotDate = new Date(date);
                slotDate.setHours(Math.floor(time / 60), time % 60, 0, 0);

                const isBooked = existingAppointments.some(appointment => 
                    isSameTime(new Date(appointment.date), slotDate)
                );

                if (!isBooked) {
                    slots.push({
                        datetime: slotDate,
                        time: minutesToTime(time)
                    });
                }
            }
        }
    }

    return slots;
}

function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function getDayName(date) {
    const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    return days[date.getDay()];
}

function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

function isSameTime(date1, date2) {
    return isSameDay(date1, date2) &&
           date1.getHours() === date2.getHours() &&
           date1.getMinutes() === date2.getMinutes();
}

router.use(protectedRouter);

module.exports = router;
