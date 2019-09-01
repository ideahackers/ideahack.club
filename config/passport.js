const LocalStrategy = require('passport-local').Strategy;
const Sentry = require('@sentry/node');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const emailHelper = require('../helpers/email'); // NAMESPACES AHHH

// load user model
const User = mongoose.model('User');
require('../models/emailToken');
const Token = mongoose.model('tokenSchema');

module.exports = function (passport) {
    passport.use(new LocalStrategy({usernameField: 'email'},
        (email, password, done) => {
            User.findOne({
                userName: email
            })
                .then(user => {
                    if (!user) {
                        return done(null, false, {message: 'No User Found'});
                    }
                    if (!user.isVerified) {
                        Token.findOne({_userId: user._id})
                            .then(token => {
                                // way of getting through if statements
                                if (!token) token = "empty";
                                if (token.typeOf === "emailVerification") {
                                    return done(null, false, {
                                        message: 'Please check your email, ' +
                                            'This account is not verified. ' +
                                            'The email could be in spam.'
                                    });
                                }
                                if (token === "empty") {
                                    const token = new Token({
                                        _userId: user._id,
                                        token: crypto.randomBytes(16)
                                            .toString('hex'),
                                        typeOf: "emailVerification"
                                    });
                                    token.save()
                                        .catch(err => {
                                            Sentry.captureException(err)
                                        });
                                    const data = emailHelper.sendData(user.userName,
                                        "/EmailTemplates/VerifyAccount.html",
                                        "confirmation/" + token.token,
                                        "💡 Verify IdeaHackers Account ❕");
                                    emailHelper.sendEmail(data);
                                    return done(null, false, {
                                        message: 'We send you a new ' +
                                            'verification email. The email could ' +
                                            'be in spam.'
                                    });
                                }
                            })
                    } else { // match password
                        bcrypt.compare(password, user.password, (err, isMatch) => {
                            if (isMatch) {
                                return done(null, user)
                            } else {
                                return done(null, false, {
                                    message:
                                        "Password Incorrect"
                                })
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