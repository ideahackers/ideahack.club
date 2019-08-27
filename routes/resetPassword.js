const express = require('express');
const Sentry = require('@sentry/node');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const router = express.Router();
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Load Schema's
require('../models/User');
const User = mongoose.model('User');
require('../models/emailToken');
const Token = mongoose.model('tokenSchema');

// Updates db after password reset data is checked
// [POST] -> /user/reset/
router.post('/', (req, res) => {
    let errors = [];
    let token = req.body.hiddenToken;
    if (req.body.password !== req.body.passwordConf) {
        errors.push({text: "Passwords Don't Match"})
    } if (req.body.password.length < 8) {
        errors.push({text: "Password length must be over 8"})
    } if (errors.length > 0) {
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

// [GET] -> /user/reset/
router.get('/', (req, res) => {
    res.render('resetPasswordForm')
});

// Send password reset token to email
// [POST] -> /user/reset/email
router.post('/email', (req, res) => {
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

// Verifies pw reset token, adds hidden elm to page, posts data
// [GET] -> /user/reset/[reset token]
router.get('/:token', (req, res) => {
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

module.exports = router;