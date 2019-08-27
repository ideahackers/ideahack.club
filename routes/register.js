const express = require('express');
const Sentry = require('@sentry/node');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const router = express.Router();
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const isUrl = require('is-url');

// Load Schema's
require('../models/register');
const Register = mongoose.model('register');
require('../models/User');
const User = mongoose.model('User');
require('../models/emailToken');
const Token = mongoose.model('tokenSchema');

// Helper Functions
nullTest = function (test) {
    return test ? test : "empty";
};
isNotUrl = function (url) {
    if (url === "") {
        return false
    }
    if (url.search("http") < 0 || url.search("https")  < 0) {
        url = "http://" + url;
    }
    if (!isUrl(url)) {
        return true;
    }
    else {
        return false;
    }
};

// [GET] -> /user/register/
router.get('/', (req, res) => {
    res.render('user/register', {isForm: true})
});

// Submit New Register
// [POST] -> /user/register/submit
router.post('/submit', (req, res) => {
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
module.exports = router;