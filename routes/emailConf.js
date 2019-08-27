const express = require('express');
const Sentry = require('@sentry/node');
const mongoose = require('mongoose');
const router = express.Router();

// Load Schema's
require('../models/User');
const User = mongoose.model('User');
require('../models/emailToken');
const Token = mongoose.model('tokenSchema');

// User Confirmation Route
// [GET] -> /user/confirmation/[token confirm]
router.get('/:token', (req, res) => {
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
                    } if (user.isVerified) {
                        req.flash('error_msg', 'Error: User Already Verified');
                        res.redirect('/user/login');
                    } else {  // Verify and save the user
                        user.isVerified = true;
                        user.save()
                            .catch(err => {
                                if (err) Sentry.captureEvent(err);
                            });
                        req.flash('success_msg', 'Congrats! You are now Verified');
                        res.redirect('/user/login');
                    }
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

module.exports = router;