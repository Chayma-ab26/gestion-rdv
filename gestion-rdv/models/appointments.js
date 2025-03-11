const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
    client: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    professional: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    date: { 
        type: Date, 
        required: true 
    },
    status: { 
        type: String, 
        enum: ["pending", "confirmed", "cancelled", "completed"], 
        default: "pending" 
    },
    reason: { 
        type: String, 
        required: true,
        trim: true
    },
    notes: {
        type: String,
        trim: true
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Index pour améliorer les performances des requêtes
appointmentSchema.index({ client: 1, date: 1 });
appointmentSchema.index({ professional: 1, date: 1 });
appointmentSchema.index({ status: 1 });

// Virtuals pour faciliter l'accès aux informations
appointmentSchema.virtual('isPending').get(function() {
    return this.status === 'pending';
});

appointmentSchema.virtual('isConfirmed').get(function() {
    return this.status === 'confirmed';
});

appointmentSchema.virtual('isCancelled').get(function() {
    return this.status === 'cancelled';
});

appointmentSchema.virtual('isCompleted').get(function() {
    return this.status === 'completed';
});

const Appointment = mongoose.model("Appointment", appointmentSchema);
module.exports = Appointment;
