const LocalStrategy = require('passport-local').Strategy;
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// load user model
const User = mongoose.model('User');

// noinspection JSUndefinedPropertyAssignment
module.exports = function (passport) {
    passport.use(new LocalStrategy({usernameField: 'email'}, (email, password, done) => {
        User.findOne({
            userName :email
        })
            .then(user => {
            if(!user){
                return done(null, false, {message: 'No User Found'}) // if no user found
            }
            if(!user.isVerified){
                return done(null, false, {message: 'Please Check Your Email, ' +
                        'This Account is Not Verified'})
            }
            // match password
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (isMatch) {
                    return done(null, user, {message: "You are now logged in! :)"})
                } else {
                    return done(null, false, {message: "Password Incorrect"})
                }
            })
        })
    }));
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });

};