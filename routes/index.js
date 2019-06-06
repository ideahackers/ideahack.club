const express = require('express');
const router = express.Router();

// Home page route
router.get('/', (req, res) => {
    res.render('index');
});

// Register route
router.get('/register', (req, res) => {
    res.sendFile('views/register.html', {
        root: '.'
    });
});

// Learn more route
router.get('/info', (req, res) => {
    res.render('info');
});

// Bio's about the team route
router.get('/meet-us', (req, res) => {
    res.render('meet-us');
});

// Contact Form route
router.get('/contact', (req, res) => {
    res.render('contact');
});

router.get('/events', (req, res) => {
    res.render('events');
});


module.exports = router;