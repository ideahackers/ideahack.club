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
const emailToken = mongoose.model('tokenSchema');
require('../models/resetToken');
const PasswordToken = mongoose.model('resetToken');

// functions
nullTest = function(test) {
    return test ? test : "empty";
};

router.get('/home', (req,res) => {
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
    res.render('login', {isForm: true})
});

// User Reset GET Route -> verifies token, adds a hidden elm to page, posts data
router.get('/reset/:token', (req, res) => {
    PasswordToken.findOne({token: req.params.token})
        .then(token => {
            if (!token) {
                req.body.hiddenToken = token;
                res.render('resetPassword');
            }
            else {
                req.flash('error_msg', 'Token not Found, Try Submitting Again');
                res.redirect('/user/login')
            }
        })
});

// Route that updated db after password reset data is checked
router.post('/reset', (req, res) => {
    let errors = [];
    let token = req.body.hiddenToken;
    if (req.body.password !== req.body.passwordConf) {
        errors.push({text: "Passwords Don't Match"})
    }
    if (req.body.password.length < 8) {
        errors.push({text: "Password length must be over 8"})
    }
    if (errors > 0) {
        req.flash('error_msg', errors);
        res.redirect('/user/reset/' + token);
    } else {
        PasswordToken.findOne({token: token})
            .then(token => {
                User.findOne({_id: token._userId})
                    .then(user => {
                        bcrypt.genSalt(10, (err, salt) => {
                            bcrypt.hash(user.password, salt, (err, hash) => {
                                if (err) Sentry.captureException(err);
                                user.password = hash;
                                user.save();
                                req.flash("success_msg", "Password Changed");
                                res.redirect('/user/login');
                            });
                        });
                    })
                    .catch(err => {Sentry.captureException(err)});
            })
            .catch(err => {Sentry.captureException(err)});
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
                const token = new emailToken({
                    _userId: user._id,
                    token: crypto.randomBytes(16).toString('hex')
                });
                // problem with saving the entry...
                // see https://sentry.io/organizations/nova-nz/issues/1162518224/events/9d91794ba2e04ccaa550dfc0d2194e8d/
                token.save()
                    .catch(err => {
                        Sentry.captureException(err)
                    });
                console.log(token);
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
                        req.headers.host  + '\/user\/reset\/'
                        + token.token + '\n\n\n\nHave a great day!'
                };
                transporter.sendMail(mailOptions)
                    .catch(err => {Sentry.captureException(err)});
                res.redirect('/user/login');
        }
            else {
                req.flash('error_msg', "If there is an email registered with that email, we will send a reset link");
                res.redirect('/user/login');
            }
        });
});

// User Conf Route
router.get('/confirmation/:token', (req, res) => {
    emailToken.findOne({token: req.params.token})
        .then(token => {
            if (!token) {
                req.flash('error_msg', 'Error Verifying, Please try the link again or email us');
                res.redirect('/user/login')
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
    if (req.body.email.match(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/)){
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

    if(req.body.year.length <= 0) {
        errors.push({text: "Please select an Academic Year"});
    }

    if(req.body.major.length <= 0) {
        errors.push({text: "Please provide a Decided Major"});
    }
    //@todo Not sure this is required...
    //@body If anything, change this as its pretty harsh sounding
    if(req.body.reasonForJoining.length < 100) {
        errors.push({text: "You did not provide more that 100 character for 'Why do you want to join Idea Hackers?'"});
    }

    if (errors.length > 0) {
        req.flash('error_msg', errors);
        reform.errors = errors;
        res.render('user/register', reform);
    } else {
        Register.findOne({email: req.body.email})
            .then(user => { // Finding duplicate emails in db
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
                                    const token = new emailToken({
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
                                        subject: '💡 Verify IdeaHackers Account ❕',
                                        text: 'Hello,\n\n' + 'Please verify your IdeaHackers Account by clicking the link: ' +
                                            '\nhttp:\/\/' + req.headers.host  + '\/user\/confirmation\/' + token.token + '\n'
                                    };
                                    transporter.sendMail(mailOptions)
                                        .catch(err => {Sentry.captureException(err)});
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