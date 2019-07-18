const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const passport = require('passport');

const router = express.Router();

// Load Register schema
require('../models/register');
require('../models/User');
const Register = mongoose.model('register');
const User = mongoose.model('User');


// functions
nullTest = function(test) {
    return test ? test : "empty";
};
router.get('/home', (req,res) => {
    res.render('user/home')
});
router.get('links', (req, res) => {
    res.render('user/links')
    // TODO: Populate link pages with slack link. That's the only thing I can think of
});

router.get('/login', (req, res) => {
    res.render('login')
});

// Login Post route

router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/user/home',
        failureRedirect: '/user/login',
        failureFlash: true
    })(req, res, next);
    req.flash('success_msg', 'You are logged in :)');

});

// Register route
router.get('/register', (req, res) => {
    res.render('user/register')
});

router.post('/register/submit', (req, res) => {

    let errors = [];
    let emailDomain = req.body.email, i = emailDomain.indexOf("@");
    if (i !== -1) {
        emailDomain = emailDomain.substring(i);
    }
    if (req.body.password !== req.body.passwordConfirm) {
        errors.push({text: "Passwords do not match"});
    }
    if (req.body.password.length < 8) {
        errors.push({text: "Passwords must be at least 8 characters"});
    }
    if (emailDomain !== '@wit.edu') {
        errors.push({text: "Sorry, at this time this is only a Wentworth Club. Please email us"});
    }
    if (errors.length > 0) {
        req.flash('error_msg', errors);
        res.render('user/register', {
            errors: errors,
            nameFirst: req.body.nameFirst,
            nameLast: req.body.nameLast,
            email: req.body.email,
            year: req.body.year,
            major: req.body.major,
            reasonForJoining: req.body.reasonForJoining,
            resumeFile: req.body.resumeFile,
        });
    } else {
        Register.findOne({email: req.body.email})
            .then(user => { // Finding duplicate emails in db
                if (user) {
                    req.flash('error_msg', 'Email already registered');
                    res.redirect('/user/login');
                } else {
                    const newRegister = new Register({
                        nameFirst: nullTest(req.body.nameFirst),
                        nameLast: nullTest(req.body.nameLast),
                        email: req.body.email,
                        academicYear: nullTest(req.body.year),
                        major: nullTest(req.body.major),
                        reasonForJoining: nullTest(req.body.reasonForJoining),
                        portfilioURL: nullTest(req.body.portfilioURL),
                        resumeFile: nullTest(req.body.resumeFile),
                        password: req.body.password
                    });

                    bcrypt.genSalt(10, (err, salt) => {
                        bcrypt.hash(newRegister.password, salt, (err, hash) => {
                            if (err) throw err;
                            newRegister.password = hash;
                            newRegister.save()

                                .then(user => {
                                    req.flash('success_msg', 'You are now registered and can log in. Congrats! We will email you soon');
                                    const newUser = new User({
                                        userName: req.body.email,
                                        password: newRegister.password,
                                        role: "member",
                                        verified: false
                                    });
                                    newUser.save()
                                        .catch(err => {
                                            // log error
                                        });
                                    res.redirect('/user/login');
                                })
                                .catch(err => {
                                    console.log(err)
                                    // TODO: log user registers errors
                                });
                        });
                    })
                }
            });
    }
});
router.get('/logout', (req, res) => {
    req.logout();
    req.flash('success_msg', 'You are now logged out');
    res.redirect('/user/login');
});
module.exports = router;