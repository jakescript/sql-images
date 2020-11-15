const Sequelize = require("sequelize");
const {STRING, BLOB} = Sequelize
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null,"uploads")
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname + "-" + Date.now());
    }
});

const upload = multer({storage: storage});


const conn = new Sequelize('uploader', 'root', '', {
    host: 'localhost',
    dialect: 'mysql',
    logging: false
});

const Image = conn.define("image", {
    name: STRING,
    data: BLOB("long"),
    contentType: STRING
});

app.use(express.static(path.join(__dirname, 'uploads')));
app.use(express.urlencoded({extended: false}));


app.get("/", async(req, res, next) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <title>Image DB Playground</title>
        </head>
        <body>
            <form method="POST" action="/newimage" enctype="multipart/form-data">
                <input name="test" type="file"/>
                <button> Send </button>
            </form>
        </body>
        </html>
    `)
})

app.post("/newimage", upload.single("test"), async(req, res, next) => {
    try {
        const file = req.file;
        if(!file){
            const err = new Error("Please Upload A File");
            err.httpStatusCode = 400;
            return next(err);
        };
        
        const img = fs.readFileSync(file.path);
        const encodedImg = img.toString("base64");

        const data = {
            contentType: file.mimetype,
            image: Buffer.from(encodedImg, "base64")
        };

        await Image.create({name: file.originalname, data: data.image, contentType: data.contentType});
        fs.unlinkSync(file.path);
        res.redirect("/")
    } catch (error) {
        next(error)
    };
});

app.get("/gallery/:id", async(req, res, next) => {
    try {
        const id = req.params.id;
        const img  = await Image.findByPk(id)

        const encImg = img.data.toString("base64");
        // res.contentType(img.contentType);
        res.send(
            `
            <img src="data:image/jpeg;base64, ${encImg}"/>
            `
        );       
    } catch (error) {
        next(error);
    };
});

app.get("/gallery/", async(req, res, next) => {
    try {
        const images  = await Image.findAll();
        res.send(
            `<div>
                ${images.map(img => `<a href="/gallery/${img.id}"><img src="data:image/jpeg;base64, ${img.data.toString("base64")}"/></a>`)}
            </div>
            `
        );       
    } catch (error) {
        next(error);
    };
});


const init = async () => {
    try {
        await conn.authenticate();
        await conn.sync({force: true});
        app.listen(process.env.PORT || 8080, () => console.log("Listening"));
        console.log("Connected to db")
    } catch (error) {
        console.log(error);
    };
};

init();