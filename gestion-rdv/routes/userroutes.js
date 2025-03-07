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

//  Route pour créer un nouvel utilisateur avec mot de passe hashé (Signup)
router.post("/signup", async (req, res) => {
    try {
        console.log("Données reçues:", req.body); // Debugging

        const { fullName, email, password, phone, age, role } = req.body;

        // Vérifier si l'utilisateur existe déjà
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Cet utilisateur existe déjà" });
        }

        // Vérifier si le rôle est valide
        const validRoles = [ "patient", "doctor"];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: "Rôle invalide" });
        }

        // Hachage du mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);

        // Création de l'utilisateur
        const newUser = await User.create({
            fullName,
            email,
            phone,
            age,
            role,
            password: hashedPassword,
        });

        // Générer un token JWT
        const token = jwt.sign(
            { id: newUser._id, email: newUser.email, role: newUser.role },
            SECRET_KEY,
            { expiresIn: "1h" }
        );

        res.status(201).json({ user: newUser, token });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});


//  Route pour authentifier un utilisateur (Login)
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Vérifier si l'utilisateur existe
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        // Vérifier le mot de passe
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Mot de passe incorrect" });
        }

        // Générer un token JWT
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            SECRET_KEY,
            { expiresIn: "1h" }
        );

        res.status(200).json({ user, token });
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
