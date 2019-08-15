module.exports = function(req, res, next) {
    res.locals.year_current = new Date().getFullYear();
    next();
};