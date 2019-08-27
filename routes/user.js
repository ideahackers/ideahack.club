const express = require('express');
const passport = require('passport');
const router = express.Router();

// [GET] -> /user/home
router.get('/home', (req, res) => {
    res.render('user/home')
});

// [GET] -> /user/links
router.get('/links', (req, res) => {
    res.render('user/links');
    /**
     * @todo Populate link pages with slack link
     * @body As well as other links
     */
});

// [GET] -> /user/login
router.get('/login', (req, res) => {
    res.render('user/login', {isForm: true})
});

// Login User
// [POST] -> /user/login
router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/user/home',
        failureRedirect: '/user/login',
        successFlash: 'true',
        failureFlash: true
    })(req, res, next);
});

// [GET] -> /user/logout
router.get('/logout', (req, res) => {
    req.logout();
    req.flash('success_msg', 'You are now logged out');
    res.redirect('/user/login');
});

module.exports = router;