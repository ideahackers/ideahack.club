module.exports = {
    isEmail: function (address) {
        return address.match(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/);
    }
}