const express = require("express");
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();
const SECRET_KEY = "votre_cle_secrete"; //  À remplacer par une clé plus sécurisée

//  Route pour récupérer tous les utilisateurs
router.get("/", async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

//  Route pour récupérer un utilisateur par ID
router.get("/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 🔹 Inscription
router.post("/signup", async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            phone,
            address,
            password,
            confirmPassword,
            role,
            birthDate,
            specialty
        } = req.body;

        // Vérification si l'utilisateur existe déjà
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Un utilisateur avec cet email existe déjà" });
        }

        // Validation du mot de passe
        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Les mots de passe ne correspondent pas" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Le mot de passe doit contenir au moins 6 caractères" });
        }

        // Validation des champs selon le rôle
        if (role === "client" && !birthDate) {
            return res.status(400).json({ message: "La date de naissance est requise pour les clients" });
        }

        if (role === "professional" && !specialty) {
            return res.status(400).json({ message: "La spécialité est requise pour les professionnels" });
        }

        // Hachage du mot de passe
        const hashedPassword = await bcrypt.hash(password, 12);

        // Création du nouvel utilisateur
        const newUser = new User({
            firstName,
            lastName,
            email,
            phone,
            address,
            password: hashedPassword,
            role,
            ...(role === "client" && { birthDate: new Date(birthDate) }),
            ...(role === "professional" && { specialty })
        });

        await newUser.save();

        // Génération du token JWT
        const token = jwt.sign(
            { id: newUser._id, email: newUser.email, role: newUser.role },
            SECRET_KEY,
            { expiresIn: "24h" }
        );

        res.status(201).json({
            message: "Utilisateur créé avec succès",
            token,
            user: {
                id: newUser._id,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                email: newUser.email,
                role: newUser.role
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 🔹 Connexion
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Vérification de l'utilisateur
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Email ou mot de passe incorrect" });
        }

        // Vérification du mot de passe
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Email ou mot de passe incorrect" });
        }

        // Génération du token JWT
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
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
                email: user.email,
                role: user.role,
                ...(user.role === "professional" && { specialty: user.specialty })
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.put("/:id", async (req, res) => {
    console.log("Données reçues:", req.body); // 🔍 Debugging

    if (!Object.keys(req.body).length) {
        return res.status(400).json({ message: "Aucune donnée à mettre à jour" });
    }

    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });

        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        res.json({ message: "Utilisateur mis à jour avec succès", user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

//  Route pour supprimer un utilisateur
router.delete("/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        await user.deleteOne();

        res.json({ message: "Utilisateur supprimé avec succès" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

//  Exportation des routes
module.exports = router;
