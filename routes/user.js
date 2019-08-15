const express = require('express');
const Sentry = require('@sentry/node');

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const router = express.Router();
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Load Schema's
require('../models/register');
require('../models/User');
require('../models/emailToken');
const Register = mongoose.model('register');
const User = mongoose.model('User');
const Token = mongoose.model('tokenSchema');

// functions
nullTest = function(test) {
    return test ? test : "empty";
};

router.get('/home', (req,res) => {
    res.render('user/home')
});

router.get('/links', (req, res) => {
    res.render('user/links')
    /**
     * @todo Populate link pages with slack link
     * @body As well as other links
     */
});

router.get('/login', (req, res) => {
    res.render('login', {isForm: true})
});


// User Conf Route
router.get('/confirmation/:token', (req, res) => {
    Token.findOne({token: req.params.token})
        .then(token => {
            if (!token) {
                req.flash('error_msg', 'Error Verifying, Please try again');
            }
            // If we found a token, find a matching user
            User.findOne({_id: token._userId}, function (err, user) {
                if (!user) {
                    res.redirect('/user/login');
                    req.flash('error_msg', 'Error: Could not find a user with that token. Try again');
                    Sentry.captureMessage('Error: _userId: '
                        + token._userId + " body.email: " + req.body.email);
                }
                if (user.isVerified) {
                    res.redirect('/user/login');
                    req.flash('error_msg', 'Error: User Already Verified');
                }
                // Verify and save the user
                user.isVerified = true;
                user.save()
                    .catch(err => {
                        if (err) Sentry.captureEvent(err);
                    })
            })
        })
        .catch(err => {
            Sentry.captureException(err);
        });
    res.redirect('/user/login');
    req.flash('success_msg', 'Congrats! You are now Verified');
    /**
     * @todo Make a "your verified" message pop up, this line doesn't work
     * @body .
     */
});

// Login Post Route

// Login Post route

router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/user/home',
        failureRedirect: '/user/login',
        failureFlash: true
    })(req, res, next);
    //req.flash('success_msg', 'You are logged in :)');
    /**
     * @todo TODO:Flash message no matter what you submit
     * @body .
     */
});


// router.post('/login', (req, res, next) => {
//
    // User.findOne({ userName: req.body.email })
    //     .then(user => {
    //         if (user == null) {
    //             req.flash('error_msg', 'Error: These credentials are either not ' +
    //                 'valid, or you are not verified');
    //                 res.redirect('/user/login');
    //             }
    //         else if(user.isVerified) {
    //             passport.authenticate('local', {
    //                 successRedirect: '/user/home',
    //                 failureRedirect: '/user/login',
    //                 failureFlash: true
    //             })(req, res, next);
    //
    //             //req.flash('success_msg', 'You are logged in :)')
    //
    //         }
    //         else {
    //             req.flash('error_msg', 'Error: These credentials are either not ' +
    //                 'valid, or you are not verified');
    //         }
    //     })
    //     .catch(err => {
    //         console.log(err);
    //     });
    //


// Register route
router.get('/register', (req, res) => {
    res.render('user/register', {isForm: true})
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
                        password: req.body.password,

                    });

                    bcrypt.genSalt(10, (err, salt) => {
                        bcrypt.hash(newRegister.password, salt, (err, hash) => {
                            if (err) Sentry.captureException(err);
                            newRegister.password = hash;
                            newRegister.save()
                                .then(user => {
                                    req.flash('success_msg', 'You are now registered and can log in. Congrats! We will email you soon');
                                    const newUser = new User({
                                        userName: req.body.email,
                                        password: newRegister.password,
                                        role: "member",
                                        isVerified: false
                                    });
                                    newUser.save()
                                        .catch(err => {
                                            Sentry.captureException(err);
                                        });
                                    const token = new Token({
                                        _userId: newUser._id,
                                        token: crypto.randomBytes(16).toString('hex')
                                    });
                                    token.save()
                                        .catch(err => {
                                            Sentry.captureException(err)
                                        });
                                    const transporter = nodemailer.createTransport({
                                        service: 'Sendgrid',
                                        auth: {
                                            user: process.env.SENDGRID_USERNAME,
                                            pass: process.env.SENDGRID_PASSWORD
                                        }
                                    });
                                    const mailOptions = {
                                        from: 'no-reply@ideahack.club',
                                        to: newUser.userName,
                                        subject: 'Verify IdeaHackers Account 👍',
                                        text: 'Hello,\n\n' + 'Please verify your IdeaHackers Account by clicking the link: ' +
                                            '\nhttp:\/\/' + req.headers.host  + '\/user\/confirmation\/' + token.token + '\n'
                                    };
                                    transporter.sendMail(mailOptions);
                                    res.redirect('/user/login');
                                })
                                .catch(err => {
                                    Sentry.captureException(err);
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