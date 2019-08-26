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
const Register = mongoose.model('register');
require('../models/User');
const User = mongoose.model('User');
require('../models/emailToken');
const Token = mongoose.model('tokenSchema');


// functions
nullTest = function (test) {
    return test ? test : "empty";
};

router.get('/home', (req, res) => {
    res.render('user/home')
});

router.get('/links', (req, res) => {
    res.render('user/links');
    /**
     * @todo Populate link pages with slack link
     * @body As well as other links
     */
});

router.get('/login', (req, res) => {
    res.render('user/login', {isForm: true})
});

// User Reset GET Route -> verifies token, adds a hidden elm to page, posts data
router.get('/reset/:token', (req, res) => {
    Token.findOne({token: req.params.token})
        .then(tokenReturned => {
            if (tokenReturned) {
                res.render('resetPassword', {token: req.params.token});
            } else {
                req.flash('error_msg', 'Token not Found, Try Submitting Again');
                res.redirect('/user/login')
            }
        })
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
    res.render('resetPasswordForm')
});

// PUT route for submitting email to reset password too
router.post('/reset/email', (req, res) => {
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
                const transporter = nodemailer.createTransport({
                    service: 'Sendgrid',
                    auth: {
                        user: process.env.SENDGRID_USERNAME,
                        pass: process.env.SENDGRID_PASSWORD
                    }
                });
                const mailOptions = {
                    from: 'no-reply@ideahack.club',
                    to: user.userName,
                    subject: '💡 Reset Password Link ❕',
                    text: 'Hello,\n\n' + 'Use this link to change your password ' +
                        'for your IdeaHackers Account ' + '\nhttp:\/\/' +
                        req.headers.host + '\/user\/reset\/'
                        + token.token + '\n\n\n\nHave a great day!'
                };
                transporter.sendMail(mailOptions)
                    .catch(err => {
                        Sentry.captureException(err)
                    });
                req.flash('success_msg', "If there is an email registered with that email, we will send a reset link. " +
                    " Please check your spam as well!");
                res.redirect('/user/login');
            } else {
                req.flash('success_msg', "If there is an email registered with that email, we will send a reset link. " +
                    " Please check your spam as well!");
                res.redirect('/user/login');
            }
        });
});

// User Conf Route
router.get('/confirmation/:token', (req, res) => {
    Token.findOne({token: req.params.token})
        .then(token => {
            if (!token || token.typeOf !== "emailVerification") {
                req.flash('error_msg', 'Error Verifying, Please try the link again or email us. By signing in,' +
                    ' a new token will be sent to your email. Please check your spam as well!');
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
                        req.flash('success_msg', 'Congrats! You are now Verified');
                        res.redirect('/user/login');}

                });
            }
            // If we found a token, find a matching user
            User.findOne({_id: token._userId}, function (err, user) {
                if (!user) {
                    req.flash('error_msg', 'Error: Could not find a user with that token. Try again');
                    Sentry.captureMessage('Error: _userId: '
                        + token._userId + " body.email: " + req.body.email);
                    res.redirect('/user/login');
                } else if (user.isVerified) {
                    req.flash('error_msg', 'Error: User Already Verified');
                    res.redirect('/user/login');
                } else {
                    // Verify and save the user
                    user.isVerified = true;
                    user.save()
                        .catch(err => {
                            if (err) Sentry.captureEvent(err);
                        });
                    req.flash('success_msg', 'Congrats! You are now Verified');
                    res.redirect('/user/login');
                }

            })
        })
        .catch(err => {
            Sentry.captureException(err);
        });
});

// Login Post route

router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/user/home',
        failureRedirect: '/user/login',
        successFlash: 'true',
        failureFlash: true
    })(req, res, next);
});
// Register route
router.get('/register', (req, res) => {
    res.render('user/register', {isForm: true})
});

router.post('/register/submit', (req, res) => {

    let errors = [];

    let reform = {
        nameFirst: req.body.nameFirst,
        nameLast: req.body.nameLast,
        email: req.body.email,
        year: req.body.year,
        major: req.body.major,
        reasonForJoining: req.body.reasonForJoining,
        portfilioURL: req.body.portfilioURL,
        resumeFile: req.body.resumeFile,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm
    };

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
    if (req.body.email.match(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/)) {
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
    //@todo Not sure this is required...
    //@body If anything, change this as its pretty harsh sounding
    // if(req.body.reasonForJoining.length < 100) {
    //     errors.push({text: "You did not provide more that 100 character for 'Why do you want to join Idea Hackers?'"});
    // }

    if (errors.length > 0) {
        req.flash('error_msg', errors);
        reform.errors = errors;
        res.render('user/register', reform);
    } else {
        Register.findOne({email: req.body.email})
            .then(user => {
                if (user) {
                    let error = 'Email already registered';
                    req.flash('error_msg', error);
                    errors.push({text: error});
                    reform.errors = errors;
                    res.render('user/register', reform);
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
                        notMinor: nullTest(req.body.notMinor),
                        password: nullTest(req.body.password)
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
                                        subject: '💡 Verify IdeaHackers Account ❕',
                                        text: 'Hello,\n\n' + 'Please verify your IdeaHackers Account by clicking the link: ' +
                                            '\nhttp:\/\/' + req.headers.host + '\/user\/confirmation\/' + token.token + '\n'
                                    };
                                    transporter.sendMail(mailOptions)
                                        .catch(err => {
                                            Sentry.captureException(err)
                                        });
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