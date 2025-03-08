const jwt = require('jsonwebtoken');
const SECRET_KEY = "votre_cle_secrete"; // Utilisez la même clé que dans userRoutes.js

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: "Authentification requise" });
        }

        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded; // Stocke les informations de l'utilisateur dans req.user
        next();
    } catch (error) {
        res.status(401).json({ message: "Token invalide" });
    }
};

module.exports = auth;
