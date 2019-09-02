const express = require('express');
const router = express.Router();
const Sentry = require('@sentry/node');

router.use(Sentry.Handlers.requestHandler());

// Home Page Route
router.get('/', function rootHandler(req, res) {

    res.render('index', {
        // @todo Add CRUD for images
        // @body Allow for admins to modify images.
        slides: [
            {
                url: "https://res.cloudinary.com/idea-hackers/image/upload/v1567453128/homepage-carousel/bg03_to8ddo.png",
                number: 0,
                active: "active"
            },
            {
                url: "https://res.cloudinary.com/idea-hackers/image/upload/v1567453128/homepage-carousel/bg01_ktwt3n.png",
                number: 1
            },
            {
                url: "https://res.cloudinary.com/idea-hackers/image/upload/v1567453128/homepage-carousel/bg02_zuqusw.png",
                number: 2
            }
        ]
    });

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

router.get('/debug-sentry', function mainHandler(req, res) {
    Sentry.captureMessage('Something went wrong')
});

module.exports = router;