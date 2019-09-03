const express = require('express');

const Sentry = require('@sentry/node');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const router = express.Router();
const crypto = require('crypto');
const isUrl = require('is-url');
const fs = require('fs');
const email = require("../helpers/email");


// Load Schema's
require('../models/register');
const Register = mongoose.model('register');
require('../models/User');
const User = mongoose.model('User');
require('../models/emailToken');
const Token = mongoose.model('tokenSchema');


// functions
nullTest = function (test) {
    return test ? test : "empty";
};
isNotUrl = function (url) {
    if (url === "") {
        return false
    }
    if (url.search("http") === -1 || url.search("https")  === -1 ) {
        url = "http://" + url;
    }
    if (!isUrl(url)) {
        return true;
    }
    else {
        return false;
    }
};

// Helper Files
const validation = require('../helpers/validation');

router.get('/home', (req, res) => {
    res.render('user/home')
});

// router.get('/links', (req, res) => {
//     res.render('user/links');
//     /**
//      * @todo Populate link pages with slack link
//      * @body As well as other links
//      */
// });

router.get('/login', (req, res) => {
    res.render('user/login', {isForm: true})
});

// User Reset GET Route -> verifies token, adds a hidden elm to page, posts data
router.get('/reset/:token', (req, res) => {
    Token.findOne({token: req.params.token})
        .then(tokenReturned => {
            if (tokenReturned) {
                User.findOne({_id: tokenReturned._userId})
                    .then(userReturned => {
                        res.render('resetPassword', {
                            token: req.params.token,
                            name: userReturned.firstName,
                            isForm: true,
                        });
                    })
                    .catch(err => {
                        Sentry.captureException(err);
                        return null;
                    });
            } else {
                req.flash('error_msg', 'Token not Found, Try Submitting Again');
                res.redirect('/user/login')
            }
        })
});

// User Conf Route
router.get('/confirmation/:token', (req, res) => {
    Token.findOne({token: req.params.token})
        .then(token => {
            if (!token || token.typeOf !== "emailVerification") {
                req.flash('error_msg', 'Error verifying account: Please try ' +
                    'signing in to send a new verification token');
                res.redirect('/user/login');

            } else {
                // If we found a token, find a matching user
                User.findOne({_id: token._userId}, function (err, user) {
                    if (!user) {
                        res.redirect('/user/login');
                        req.flash('error_msg', 'Error: Could not find a user with that token. Try again');
                        Sentry.captureMessage('Error: _userId: '
                            + token._userId + " body.email: " + req.body.email);
                    }
                    if (user.isVerified) {
                        req.flash('error_msg', 'Error: User Already Verified');
                        res.redirect('/user/login');
                    }
                    // Verify and save the user
                    else {
                        user.isVerified = true;
                        user.save()
                            .catch(err => {
                                if (err) Sentry.captureEvent(err);
                            });
                        const data = email.sendData(user.userName, "/EmailTemplates/WelcomeEmail.html",
                            process.env.SLACK_LINK, "Welcome to the club 😍");
                        email.sendEmail(data);
                        req.flash('success_msg', 'Congrats! You are now verified. ' +
                            'We also sent you a welcome email containing important details');
                        res.redirect('/user/login');

                    }
                });
            }
        });
});

// Route that updated db after password reset data is checked
router.post('/reset/', (req, res) => {
    let errors = [];
    let token = req.body.hiddenToken;
    if (req.body.password !== req.body.passwordConf) {
        errors.push({text: "Passwords Don't Match"})
    }
    if (req.body.password.length < 8) {
        errors.push({text: "Password length must be over 8"})
    }
    if (errors.length > 0) {
        req.flash('error_msg', "Either your New Password Don't Match, " +
            "or it's Under 8 characters. Please Try Again");
        // For some reason, I couldn't just pass errors, so I give this error string instead
        res.redirect('/user/reset/' + token);
    } else {
        Token.findOne({token: token})
            .then(token => {
                if (token.typeOf === "password") {
                    User.findOne({_id: token._userId})
                        .then(user => {
                            bcrypt.genSalt(10, (err, salt) => {
                                bcrypt.hash(req.body.password, salt, (err, hash) => {
                                    if (err) Sentry.captureException(err);
                                    user.password = hash;
                                    user.save();
                                    // Token will delete itself after 12 hours...
                                    req.flash("success_msg", "Password Changed");
                                    res.redirect('/user/login');
                                });
                            });
                        });
                } else {
                    req.flash("error_msg", "Something Went Wrong when Submitting the New " +
                        "Password, Please Try Again");
                    res.redirect('/user/reset')
                }
            })
            .catch(err => {
                Sentry.captureException(err)
            });
    }
});

router.get('/reset', (req, res) => {
    res.render('resetPasswordForm', {isForm: true})
});

// PUT route for submitting email to reset password too
router.post('/reset/email', (req, res) => {
    if (!validation.isEmail(req.body.email)) {
        req.flash('error_msg', "The email used is not valid");
        res.redirect('/user/reset');
    } else {
    User.findOne({userName: req.body.email})
        .then(user => {
            if (user) {
                const token = new Token({
                    _userId: user._id,
                    token: crypto.randomBytes(16).toString('hex'),
                    typeOf: "password"
                });
                token.save()
                    .catch(err => {
                        Sentry.captureException(err)
                    });
                const data = email.sendData(user.userName, "/EmailTemplates/ResetPassword.html",
                    "reset/" + token.token, "💡 IdeaHackers Reset Password ❕");
                //console.log(data);
                email.sendEmail(data);
                req.flash('success_msg', "If there is an email registered with that email, we will send a reset link. " +
                    " Please check your spam as well!");
                res.redirect('/user/login');
            } else {
                req.flash('success_msg', "If there is an email registered with that email, we will send a reset link. " +
                    " Please check your spam as well!");
                res.redirect('/user/login');
            }
        });
    }
});


// Login Post route
router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/user/home',
        failureRedirect: '/user/login',
        successFlash: true,
        failureFlash: true
    })(req, res, next);
});

// Register route
router.get('/register', (req, res) => {
    res.render('user/register', {isForm: true})
});

router.post('/register/submit', (req, res) => {
    let errors = [];
    if (req.body.nameFirst.length <= 0) {
        errors.push({text: "Please provide your First Name"});
    }
    if (req.body.nameLast.length <= 0) {
        errors.push({text: "Please provide your Last Name"});
    }

    let emailDomain = req.body.email, i = emailDomain.indexOf("@");
    if (i !== -1) {
        emailDomain = emailDomain.substring(i);
    }
    if (validation.isEmail(req.body.email)) {
        if (emailDomain !== '@wit.edu') {
            errors.push({text: "Sorry, this club is only available to Wentworth students at this time. Please email us at contact@ideahack.club for outside membership."});
        }
    } else {
        errors.push({text: "An invalid email address was provided"});
    }
    if (req.body.password.length < 8) {
        errors.push({text: "Passwords must be at least 8 characters"});
    }
    if (req.body.password !== req.body.passwordConfirm) {
        errors.push({text: "Passwords do not match"});
    }

    if (req.body.year.length <= 0) {
        errors.push({text: "Please select an Academic Year"});
    }

    if (req.body.major.length <= 0) {
        errors.push({text: "Please provide a Decided Major"});
    }
    if (isNotUrl(req.body.portfilioURL)) {
        errors.push({text: "Please Provide a Valid Website URL"});
    }
    if (isNotUrl(req.body.resumeFile)) {
        errors.push({text: "Please Provide a Valid Resume URL"});
    }
    if (errors.length > 0) {
        req.flash('error_msg', errors);
        res.render('user/register', {isForm: true,
            errors: errors,
            nameFirst: req.body.nameFirst,
            nameLast: req.body.nameLast,
            email: req.body.email,
            year: req.body.year,
            major: req.body.major,
            reasonForJoining: req.body.reasonForJoining,
            resumeFile: req.body.resumeFile
        });
    } else {
        Register.findOne({email: req.body.email})
            .then(user => {
                if (user) {
                    let error = 'Email already registered';
                    req.flash('error_msg', error);
                    errors.push({text: error});
                    res.render('user/register', {isForm: true,
                        errors: errors,
                        nameFirst: req.body.nameFirst,
                        nameLast: req.body.nameLast,
                        email: req.body.email,
                        year: req.body.year,
                        major: req.body.major,
                        reasonForJoining: req.body.reasonForJoining,
                        resumeFile: req.body.resumeFile
                    });
                } else {
                    console.log(req.body.resumeFile);
                    const newRegister = new Register({
                        nameFirst: req.body.nameFirst,
                        nameLast: req.body.nameLast,
                        email: req.body.email,
                        academicYear: req.body.year,
                        major: req.body.major,
                        reasonForJoining: nullTest(req.body.reasonForJoining),
                        portfilioURL: nullTest(req.body.portfilioURL),
                        resumeURL: nullTest(req.body.resumeFile),
                        password: req.body.password
                    });
                    bcrypt.genSalt(10, (err, salt) => {
                        bcrypt.hash(newRegister.password, salt, (err, hash) => {
                            if (err) Sentry.captureException(err);
                            newRegister.password = hash;
                            newRegister.save()
                                .then(user => {
                                    req.flash('success_msg', 'Please verify your email. Congrats for joining!' +
                                        ' Check your spam as well.');
                                    const newUser = new User({
                                        userName: req.body.email,
                                        firstName: req.body.nameFirst,
                                        lastName: req.body.nameLast,
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
                                        token: crypto.randomBytes(16).toString('hex'),
                                        typeOf: "emailVerification"
                                    });
                                    token.save()
                                        .catch(err => {
                                            Sentry.captureException(err)
                                        });
                                    console.log(req.body.email);
                                    const data = email.sendData(req.body.email, "/EmailTemplates/VerifyAccount.html",
                                        "confirmation/" + token.token, "💡 Verify IdeaHackers Account ❕");
                                    email.sendEmail(data);
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