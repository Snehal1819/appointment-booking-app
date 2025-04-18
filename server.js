const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const AWS = require("aws-sdk");
const dotenv = require("dotenv");
const path = require("path");
const Booking = require("./models/Booking");

dotenv.config();
const app = express();
const PORT = 3000;

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
const ses = new AWS.SES({ apiVersion: "2010-12-01" });

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error", err));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

app.post("/book", async (req, res) => {
  const { name, email, service, date, time } = req.body;

  const booking = new Booking({ name, email, service, date, time });
  await booking.save();

  const params = {
    Destination: { ToAddresses: [email] },
    Message: {
      Body: {
        Text: {
          Data: `Hi ${name}, your appointment for "${service}" is confirmed on ${date} at ${time}.`,
        },
      },
      Subject: { Data: "Appointment Confirmation" },
    },
    Source: process.env.EMAIL_SENDER,
  };

  ses.sendEmail(params, (err, data) => {
    if (err) {
      console.error("Email error:", err);
      res.send("Booking saved but failed to send confirmation.");
    } else {
      console.log("Email sent:", data.MessageId);
      res.send("Booking confirmed! Check your email.");
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
