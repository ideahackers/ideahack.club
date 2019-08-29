const LocalStrategy = require('passport-local').Strategy;
const Sentry = require('@sentry/node');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
// const nodemailer = require('nodemailer');

// load user model
const User = mongoose.model('User');
require('../models/emailToken');
const Token = mongoose.model('tokenSchema');

module.exports = function (passport) {
    passport.use(new LocalStrategy({usernameField: 'email'}, (email, password, done) => {
        User.findOne({
            userName: email
        })
            .then(user => {
                if (!user) {
                    return done(null, false, {message: 'No User Found'}); // if no user found

                }
                if (!user.isVerified) {
                    Token.findOne({_userId: user._id})
                        .then(token => {
                            if (token) {
                                return done(null, false, {
                                    message: 'Please Check Your Email, ' +
                                        'This Account is Not Verified. ' +
                                        'Please check your spam as well!'
                                });
                            } else {
                                const token = new Token({
                                    _userId: user._id,
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
                                    to: user.userName,
                                    subject: '💡 Verify IdeaHackers Account ❕',
                                    text: 'Hello,\n\n' + 'Please verify your IdeaHackers Account by clicking the link: ' +
                                        '\nhttp:\/\/' + process.env.HOST + '\/user\/confirmation\/' + token.token + '\n'
                                };
                                transporter.sendMail(mailOptions)
                                    .catch(err => {
                                        Sentry.captureException(err)
                                    });
                                return done(null, false, {
                                    message: 'We send you a new Verification email. ' +
                                        'The email could be in spam?'
                                });
                            }
                        })
                } else { // match password
                    bcrypt.compare(password, user.password, (err, isMatch) => {
                        if (isMatch) {
                            return done(null, user)
                        } else {
                            return done(null, false, {message: "Password Incorrect"})
                        }
                    })
                }
            })
    }));
    passport.serializeUser(function (user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function (id, done) {
        User.findById(id, function (err, user) {
            done(err, user);
        });
    });

};