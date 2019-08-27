const express = require('express');
const router = express.Router();
const Sentry = require('@sentry/node');

router.use(Sentry.Handlers.requestHandler());

// Home Page Route
router.get('/', function rootHandler(req, res) {
    res.render('index');
});

router.get('/info', function rootHandler(req, res) {
    res.render('info');
});

// Contact Form Route
router.get('/contact', function rootHandler(req, res) {
    res.render('contact');
    // TODO: Make contact page nicer looking? Not sure what else could be added, may be nothing
});

// Events route
router.get('/events', function rootHandler(req, res) {
    res.render('events');
    /**
     * @todo Populate actual entries
     * @body Take data from database
     */
});

// Code of Conduct route
router.get('/conduct', function rootHandler(req, res) {
    res.render('conduct', {title: "Code of Conduct"});
});

module.exports = router;