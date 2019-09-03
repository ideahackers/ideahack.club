const mongoose = require('mongoose');
require('../models/User');
const User = mongoose.model('User');

module.exports = {
    ensureGuest: function(req, res, next) {
        if(!req.isAuthenticated()){
            return next();
        }
        req.flash('error_msg', 'Resource authorized for Guests only. Please log out!');
        res.redirect('/user/login');
    },
    ensureAuthenticated: function(req, res, next) {
        if(req.isAuthenticated()){
            return next();
        }
        req.flash('error_msg', 'Not Logged in...');
        res.redirect('/user/login');
    },
    ensureAdmin: function(req, res, next) {
        if(req.user){
            User.findOne({
                _id: req.user.id
            })
                .then(user => {
                    if(user.roles.includes('admin')) {
                        return next()
                    }

                })
                .catch(err => {
                    req.flash('error_msg', 'Cannot recognize user!');
                    res.redirect('back');
                });
        }
        req.flash('error_msg', 'You must be an admin access this resource!');
        res.redirect('back');
    }
};
