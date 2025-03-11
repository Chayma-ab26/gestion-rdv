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
        workingDays: {
            type: [String],
            enum: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
            default: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"]
        },
        workingHours: {
            start: {
                type: String,
                default: "09:00"
            },
            end: {
                type: String,
                default: "17:00"
            }
        },
        slotDuration: {
            type: Number, // durée en minutes
            default: 15
        },
        breakTime: {
            start: {
                type: String,
                default: "12:00"
            },
            end: {
                type: String,
                default: "13:00"
            }
        },
        exceptions: [{
            date: Date,
            type: {
                type: String,
                enum: ["unavailable", "available"],
                default: "unavailable"
            },
            reason: String
        }]
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model("User", userSchema);
