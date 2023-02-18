const jwt = require("jsonwebtoken");
const jwtKey = require("../constData");


const auth = async (req, res, next) => {
    try {
        const token = req.header("x-auth-token");
        if (!token) return res.status(400).json({ msg: "No Auth-Token, Access Denied" });
        const validate = jwt.verify(token, jwtKey);
        if (!validate) return res.status(400).json({ msg: "Token Validation Failed, Authorization Denied" });

        req.user = validate.id;
        req.token = token;
        next();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = auth;

