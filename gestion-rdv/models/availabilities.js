const mongoose = require("mongoose");

const availabilitySchema = new mongoose.Schema({
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    day: { type: String, required: true },  // Exemple: "Lundi"
    startTime: { type: String, required: true },  // Exemple: "08:00"
    endTime: { type: String, required: true },  // Exemple: "12:00"
});

module.exports = mongoose.model("Availability", availabilitySchema);
