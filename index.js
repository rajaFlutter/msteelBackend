require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const userAuth = require("./auth/user_auth");
const auth = require("./middleware/token_auth");
const adminAuth = require("./auth/admin_auth");
const aAuth = require("./middleware/admin_token_auth");

mongoose.set('strictQuery', true);

const app = express();

const port = process.env.PORT;
const db = process.env.DATABASE;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(userAuth);
// app.use(auth);
app.use(adminAuth);
// app.use(aAuth);

// Connect to Database
mongoose.connect(db).then(() => {
    console.log("Connected to Database successfully");
}).catch((error) => {
    console.log(`DB connection error is => ${error}`);
});

app.get("/homepage", async (req, res) => {
    res.send("<h1>Welcome to Homepage</h1>");
});


app.listen(port, () => {
    console.log(`Server started at port ${port}`);
})
