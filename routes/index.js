const express = require('express');
const router = express.Router();

// Home page route
router.get('/', (req, res) => {
    res.render('index');
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

// Events listing route
router.get('/events', (req, res) => {
    res.render('events');
});

// Login route
router.get('/login', (req, res) => {
    res.render('login')
});

// Register route
router.get('/register', (req, res) => {
    res.redirect('https://forms.gle/rWykj7BvXvVmVbDn7')
});


module.exports = router;