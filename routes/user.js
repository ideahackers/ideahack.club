const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const passport = require('passport');

const router = express.Router();

// Load User schema
require('../models/user');
const User = mongoose.model('user');


// functions
nullTest = function(test) {
    return test ? test : "empty";
};


router.get('/login', (req, res) => {
    res.render('login')
});

// Login Post route

router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/ideas',
        failureRedirect: '/users/login',
        failureFlash: true
    })(req, res, next);
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
        errors.push({text: "Sorry, at this time this is only a Wentworth Club"});
    }
    if (errors.length > 0) {
        console.log("here");
        res.render('user/register', {
            errors: errors,
            nameFirst: req.body.nameFirst,
            nameLast: req.body.nameLast,
            email: req.body.email,
            password: req.body.password,
            year: req.body.year,
            major: req.body.major,
            reasonForJoining: req.body.reasonForJoining,
            portfilioURL: req.body.portfilioURL,
            resumeFile: req.body.resumeFile,
        });
    } else {
        console.log("there");
        User.findOne({email: req.body.email})
            .then(user => { // Finding duplicate emails in db
                if (user) {
                    //req.flash('error_msg', 'Email already registered');
                    res.redirect('/user/login');
                } else {
                    const newUser = new User({
                        nameFirst: nullTest(req.body.nameFirst),
                        nameLast: nullTest(req.body.nameLast),
                        email: nullTest(req.body.email),
                        academicYear: nullTest(req.body.year),
                        major: nullTest(req.body.major),
                        reasonForJoining: nullTest(req.body.reasonForJoining),
                        portfilioURL: nullTest(req.body.portfilioURL),
                        resumeFile: nullTest(req.body.resumeFile),
                        password: req.body.password
                    });
                    bcrypt.genSalt(10, (err, salt) => {
                        bcrypt.hash(newUser.password, salt, (err, hash) => {
                            if (err) throw err;
                            newUser.password = hash;
                            newUser.save()
                                .then(user => {
                                    //req.flash('success_msg', 'You are now registered and can log in');
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

module.exports = router;