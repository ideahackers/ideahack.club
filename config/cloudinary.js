// Load in dev process.env vars if in dev
if (process.env.NODE_ENV !== 'production') require('dotenv').config();

var cloudinary = require('cloudinary').v2;

module.exports = function (req, res, next) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_NAME,
        api_key: process.env.CLOUDINARY_KEY,
        api_secret: process.env.CLOUDINARY_SECRET,
    });
    next();
}