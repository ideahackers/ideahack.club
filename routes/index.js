const express = require('express');
const router = express.Router();

// Home Page Route
router.get('/', (req, res) => {
    res.render('index');
});

router.get('/info', (req, res) => {
    res.render('info');
});

// Bio's About The Team Route
router.get('/meet-us', (req, res) => {
    res.render('meet-us');
});

// Contact Form Route
router.get('/contact', (req, res) => {
    res.render('contact');
});

// Events route
router.get('/events', (req, res) => {
    res.render('events');
});

module.exports = router;