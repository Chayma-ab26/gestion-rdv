const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    firstName: { 
        type: String, 
        required: [true, "Le prénom est requis"],
        trim: true
    },
    lastName: { 
        type: String, 
        required: [true, "Le nom est requis"],
        trim: true
    },
    email: { 
        type: String, 
        required: [true, "L'email est requis"], 
        unique: true,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: [true, "Le numéro de téléphone est requis"],
        trim: true
    },
    address: {
        type: String,
        required: [true, "L'adresse est requise"],
        trim: true
    },
    password: { 
        type: String, 
        required: [true, "Le mot de passe est requis"]
    },
    role: { 
        type: String, 
        enum: ["client", "professional"], 
        required: [true, "Le rôle est requis"] 
    },
    // Champs spécifiques aux clients
    birthDate: {
        type: Date,
        required: function() { return this.role === "client"; }
    },
    // Champs spécifiques aux professionnels
    specialty: {
        type: String,
        enum: ["médecin", "coach", "avocat", "psychologue", "dentiste", "kinésithérapeute"],
        required: function() { return this.role === "professional"; }
    },
    availability: {
        days: [String],
        startTime: String,
        endTime: String
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model("User", userSchema);
