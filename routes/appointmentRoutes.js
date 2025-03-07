const express = require('express');
const router = express.Router(); // Définit le router
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const Appointment = require('../models/Appointment');


router.post('/appointments', authMiddleware, roleMiddleware('client'), async (req, res) => {
  const { professional, date } = req.body;
  try {
    const appointment = new Appointment({
      client: req.user.id,
      professional,
      date,
    });
    await appointment.save();
    res.status(201).json(appointment);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err });
  }
});


router.get('/appointments', authMiddleware, async (req, res) => {
  try {
    const appointments = await Appointment.find({ 
      $or: [{ client: req.user.id }, { professional: req.user.id }]
    }).populate('client', 'name').populate('professional', 'name');
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err });
  }
});

module.exports = router;