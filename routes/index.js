const express = require('express');
const router = express.Router();

// Home Page Route
router.get('/', (req, res) => {
    res.render('index');
});

router.get('/info', (req, res) => {
    res.render('info');
});

// Contact Form Route
router.get('/contact', (req, res) => {
    res.render('contact');
    // TODO: Make contact page nicer looking? Not sure what else could be added, may be nothing
});

// Events route
router.get('/events', (req, res) => {
    res.render('events');
     // TODO: use example collection I have on events
});

// TODO: make admin page for adding events, and seeing users
module.exports = router;