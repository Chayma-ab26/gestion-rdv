const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, "Le nom est requis"] 
    },
    email: { 
        type: String, 
        required: [true, "L'email est requis"], 
        unique: true,
        trim: true,
        lowercase: true
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
    availability: {
        days: [String],
        startTime: String,
        endTime: String
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model("User", userSchema);
