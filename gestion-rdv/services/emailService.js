const nodemailer = require('nodemailer');

// Configuration du transporteur d'e-mail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Fonction pour envoyer un e-mail de confirmation de rendez-vous
const sendAppointmentConfirmation = async (userEmail, appointmentDetails) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: 'Confirmation de votre rendez-vous',
        html: `
            <h2>Confirmation de rendez-vous</h2>
            <p>Votre rendez-vous a été confirmé pour les détails suivants :</p>
            <ul>
                <li>Date : ${new Date(appointmentDetails.date).toLocaleDateString()}</li>
                <li>Heure : ${new Date(appointmentDetails.date).toLocaleTimeString()}</li>
                <li>Description : ${appointmentDetails.description}</li>
            </ul>
            <p>Merci de votre confiance !</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email de confirmation envoyé avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'email:', error);
        throw error;
    }
};

// Fonction pour envoyer un rappel de rendez-vous
const sendAppointmentReminder = async (userEmail, appointmentDetails) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: 'Rappel de rendez-vous',
        html: `
            <h2>Rappel de rendez-vous</h2>
            <p>Nous vous rappelons votre rendez-vous prévu pour :</p>
            <ul>
                <li>Date : ${new Date(appointmentDetails.date).toLocaleDateString()}</li>
                <li>Heure : ${new Date(appointmentDetails.date).toLocaleTimeString()}</li>
                <li>Description : ${appointmentDetails.description}</li>
            </ul>
            <p>À bientôt !</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email de rappel envoyé avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'email:', error);
        throw error;
    }
};

module.exports = {
    sendAppointmentConfirmation,
    sendAppointmentReminder
};
