const express = require("express");
const app = express();

app.get("/", (req, res) => {
    res.send("Bienvenue sur l'API de gestion des rendez-vous !");
});

const port = 5000
app.listen(5000,()=>{
    console.log('server lestening on port 5000')
}) 
    