const nodemailer = require('nodemailer');
const Appointment = require('../models/appointments');
const User = require('../models/user');

// Configuration du transporteur d'e-mail
let transporter;
try {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    } else {
        console.warn('Variables d\'environnement EMAIL_USER ou EMAIL_PASSWORD non définies. Le service d\'email ne sera pas disponible.');
    }
} catch (error) {
    console.error('Erreur lors de la configuration du transporteur d\'email:', error);
}

// Fonction pour envoyer un e-mail de confirmation de rendez-vous
const sendAppointmentConfirmation = async (appointmentId) => {
    try {
        // Vérifier si le transporteur est configuré
        if (!transporter) {
            console.warn('Le service d\'email n\'est pas configuré. Email de confirmation non envoyé.');
            return false;
        }

        // Récupérer les détails du rendez-vous avec les informations du client et du professionnel
        const appointment = await Appointment.findById(appointmentId)
            .populate('client', 'firstName lastName email')
            .populate('professional', 'firstName lastName specialty');

        if (!appointment) {
            throw new Error('Rendez-vous non trouvé');
        }

        // Préparer l'email pour le client
        const clientMailOptions = {
            from: process.env.EMAIL_USER,
            to: appointment.client.email,
            subject: 'Confirmation de votre rendez-vous',
            html: `
                <h2>Confirmation de rendez-vous</h2>
                <p>Votre rendez-vous a été confirmé pour les détails suivants :</p>
                <ul>
                    <li>Date : ${new Date(appointment.date).toLocaleDateString('fr-FR')}</li>
                    <li>Heure : ${new Date(appointment.date).toLocaleTimeString('fr-FR')}</li>
                    <li>Professionnel : ${appointment.professional.specialty} ${appointment.professional.firstName} ${appointment.professional.lastName}</li>
                    <li>Motif : ${appointment.reason}</li>
                </ul>
                <p>Merci de votre confiance !</p>
            `
        };

        // Envoyer l'email au client
        await transporter.sendMail(clientMailOptions);
        console.log('Email de confirmation envoyé au client avec succès');

        return true;
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'email de confirmation:', error);
        throw error;
    }
};

// Fonction pour envoyer un rappel de rendez-vous
const sendAppointmentReminder = async (appointmentId) => {
    try {
        // Vérifier si le transporteur est configuré
        if (!transporter) {
            console.warn('Le service d\'email n\'est pas configuré. Email de rappel non envoyé.');
            return false;
        }

        // Récupérer les détails du rendez-vous avec les informations du client et du professionnel
        const appointment = await Appointment.findById(appointmentId)
            .populate('client', 'firstName lastName email')
            .populate('professional', 'firstName lastName specialty');

        if (!appointment) {
            throw new Error('Rendez-vous non trouvé');
        }

        // Préparer l'email pour le client
        const clientMailOptions = {
            from: process.env.EMAIL_USER,
            to: appointment.client.email,
            subject: 'Rappel de rendez-vous',
            html: `
                <h2>Rappel de rendez-vous</h2>
                <p>Nous vous rappelons votre rendez-vous prévu pour :</p>
                <ul>
                    <li>Date : ${new Date(appointment.date).toLocaleDateString('fr-FR')}</li>
                    <li>Heure : ${new Date(appointment.date).toLocaleTimeString('fr-FR')}</li>
                    <li>Professionnel : ${appointment.professional.specialty} ${appointment.professional.firstName} ${appointment.professional.lastName}</li>
                    <li>Motif : ${appointment.reason}</li>
                </ul>
                <p>À bientôt !</p>
            `
        };

        // Envoyer l'email au client
        await transporter.sendMail(clientMailOptions);
        console.log('Email de rappel envoyé au client avec succès');

        return true;
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'email de rappel:', error);
        throw error;
    }
};

module.exports = {
    sendAppointmentConfirmation,
    sendAppointmentReminder
};
