const jwt = require("jsonwebtoken");
const adminKey = require("../constData");

const aAuth = async (req, res, next) => {
    try {
        const token = req.header("x-admin-token");
        if (!token) return res.status(400).json({ msg: "No Auth-Token, Access Denied" });
        const validate = jwt.verify(token, adminKey);
        if (!validate) return res.status(400).json({ msg: "Token Validation Failed, Authorization Denied" });

        req.user = validate.id;
        req.token = token;
        next();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = aAuth;